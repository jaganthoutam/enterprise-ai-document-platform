import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { BaseStack, BaseStackProps } from './base-stack';

export interface BedrockLayerStackProps extends BaseStackProps {
  readonly vpc: cdk.aws_ec2.Vpc;
  readonly vectorIndex: cdk.aws_opensearchserverless.CfnCollection;
}

export class BedrockLayerStack extends BaseStack {
  public readonly knowledgeBase: cdk.CfnResource;
  public readonly bedrockAgent: cdk.CfnResource;
  public readonly guardrailsConfig: cdk.CfnResource;

  constructor(scope: Construct, id: string, props: BedrockLayerStackProps) {
    super(scope, id, props);

    // Create IAM role for Bedrock services
    const bedrockRole = new cdk.aws_iam.Role(this, 'BedrockServiceRole', {
      assumedBy: new cdk.aws_iam.ServicePrincipal('bedrock.amazonaws.com'),
      description: 'IAM role for Bedrock services',
    });

    // Add permissions to the role
    bedrockRole.addToPrincipalPolicy(
      new cdk.aws_iam.PolicyStatement({
        effect: cdk.aws_iam.Effect.ALLOW,
        actions: [
          'aoss:APIAccessAll',
        ],
        resources: [props.vectorIndex.attrArn],
      })
    );

    // Create S3 bucket for knowledge base documents
    const knowledgeBucket = new cdk.aws_s3.Bucket(this, 'KnowledgeBaseBucket', {
      bucketName: `${props.projectName}-${props.stage}-knowledge-base-${this.account}`,
      encryption: cdk.aws_s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: cdk.aws_s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      versioned: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // Grant Bedrock role access to S3 bucket
    knowledgeBucket.grantReadWrite(bedrockRole);

    // Create Bedrock Knowledge Base (using L1 construct as L2 is not available yet)
    this.knowledgeBase = new cdk.CfnResource(this, 'BedrockKnowledgeBase', {
      type: 'AWS::Bedrock::KnowledgeBase',
      properties: {
        name: `${props.projectName}-${props.stage}-knowledge-base`,
        description: `Knowledge base for ${props.projectName} ${props.stage}`,
        roleArn: bedrockRole.roleArn,
        knowledgeBaseConfiguration: {
          type: 'VECTOR',
          vectorKnowledgeBaseConfiguration: {
            embeddingModelArn: `arn:aws:bedrock:${this.region}::foundation-model/amazon.titan-embed-text-v1`,
          }
        },
        storageConfiguration: {
          type: 'OPENSEARCH_SERVERLESS',
          opensearchServerlessConfiguration: {
            collectionArn: props.vectorIndex.attrArn,
            vectorIndexName: 'knowledge_index',
            fieldMapping: {
              metadataField: 'metadata',
              textField: 'text',
              vectorField: 'vector_embedding',
            },
          },
        },
      },
    });

    // Create Bedrock Guardrails configuration
    this.guardrailsConfig = new cdk.CfnResource(this, 'BedrockGuardrails', {
      type: 'AWS::Bedrock::Guardrail',
      properties: {
        name: `${props.projectName}-${props.stage}-guardrails`,
        description: `Guardrails for ${props.projectName} ${props.stage}`,
        blockedInputMessaging: 'This content violates our content policies.',
        blockedOutputsMessaging: 'This response violates our content policies.',
        kmsKeyArn: 'AUTO', // Using AWS managed key
        guardrailVersion: '1',
        topicPolicy: {
          contentPolicyConfig: {
            filters: [
              {
                type: 'INSULTS',
                strength: 'MEDIUM',
              },
              {
                type: 'HATE',
                strength: 'MEDIUM',
              },
              {
                type: 'SEXUAL',
                strength: 'MEDIUM',
              },
              {
                type: 'VIOLENCE',
                strength: 'MEDIUM',
              },
            ],
          },
          sensitiveInformationPolicyConfig: {
            piiEntities: [
              {
                type: 'ALL',
                action: 'MASK',
              },
            ],
          },
          wordPolicyConfig: {
            words: [
              {
                text: 'banned_word_example',
                action: 'BLOCK',
              },
            ],
          },
        },
      },
    });

    // Create Bedrock Agent
    this.bedrockAgent = new cdk.CfnResource(this, 'BedrockAgent', {
      type: 'AWS::Bedrock::Agent',
      properties: {
        name: `${props.projectName}-${props.stage}-agent`,
        description: `Bedrock agent for ${props.projectName} ${props.stage}`,
        foundationModel: 'anthropic.claude-3-sonnet-20240229-v1:0',
        instruction: 'You are an AI assistant that helps users with their queries about our application.',
        customerEncryptionKeyArn: 'AUTO', // Using AWS managed key
        roleArn: bedrockRole.roleArn,
        idleSessionTTLInSeconds: 1800,
        agentResourceRoleArn: bedrockRole.roleArn,
        guardrailConfiguration: {
          guardrailIdentifier: this.guardrailsConfig.getAtt('Arn').toString(),
          guardrailVersion: '1',
        },
      },
    });

    // Create Bedrock Agent Knowledge Base Association
    new cdk.CfnResource(this, 'AgentKnowledgeBaseAssociation', {
      type: 'AWS::Bedrock::AgentKnowledgeBase',
      properties: {
        agentId: this.bedrockAgent.getAtt('AgentId').toString(),
        agentVersion: 'DRAFT',
        description: 'Association between agent and knowledge base',
        knowledgeBaseId: this.knowledgeBase.getAtt('KnowledgeBaseId').toString(),
        knowledgeBaseState: 'ENABLED',
      },
      dependsOn: [this.bedrockAgent, this.knowledgeBase],
    });

    // Create Lambda function for knowledge base ingestion
    const knowledgeIngestionLambda = new cdk.aws_lambda.Function(this, 'KnowledgeBaseIngestionFunction', {
      runtime: cdk.aws_lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: cdk.aws_lambda.Code.fromAsset('lambda/knowledge-ingestion'),
      timeout: cdk.Duration.minutes(15),
      memorySize: 1024,
      environment: {
        KNOWLEDGE_BASE_ID: this.knowledgeBase.getAtt('KnowledgeBaseId').toString(),
        KNOWLEDGE_BUCKET_NAME: knowledgeBucket.bucketName,
      },
      vpc: props.vpc,
      vpcSubnets: {
        subnetType: cdk.aws_ec2.SubnetType.PRIVATE_WITH_EGRESS,
      },
      description: 'Lambda function for knowledge base ingestion',
    });

    // Add Bedrock permissions to the Lambda function
    knowledgeIngestionLambda.addToRolePolicy(
      new cdk.aws_iam.PolicyStatement({
        effect: cdk.aws_iam.Effect.ALLOW,
        actions: [
          'bedrock:StartIngestionJob',
          'bedrock:GetIngestionJob',
          'bedrock:ListIngestionJobs',
          'bedrock:Retrieve',
          'bedrock:InvokeModel',
        ],
        resources: ['*'],
      })
    );

    // Grant S3 read access to the Lambda function
    knowledgeBucket.grantRead(knowledgeIngestionLambda);

    // Create Step Function for knowledge base ingestion workflow
    const ingestionWorkflow = new cdk.aws_stepfunctions.StateMachine(this, 'IngestionWorkflow', {
      definitionBody: cdk.aws_stepfunctions.DefinitionBody.fromChainable(
        new cdk.aws_stepfunctions_tasks.LambdaInvoke(this, 'IngestDocuments', {
          lambdaFunction: knowledgeIngestionLambda,
          outputPath: '$.Payload',
        }).next(
          new cdk.aws_stepfunctions.Wait(this, 'WaitForIngestion', {
            time: cdk.aws_stepfunctions.WaitTime.duration(cdk.Duration.minutes(5)),
          }).next(
            new cdk.aws_stepfunctions.Choice(this, 'CheckIngestionStatus')
              .when(
                cdk.aws_stepfunctions.Condition.stringEquals('$.status', 'COMPLETE'),
                new cdk.aws_stepfunctions.Succeed(this, 'IngestionSucceeded')
              )
              .when(
                cdk.aws_stepfunctions.Condition.stringEquals('$.status', 'FAILED'),
                new cdk.aws_stepfunctions.Fail(this, 'IngestionFailed', {
                  cause: 'Knowledge base ingestion failed',
                  error: 'IngestionError',
                })
              )
              .otherwise(
                new cdk.aws_stepfunctions_tasks.LambdaInvoke(this, 'CheckIngestionStatus', {
                  lambdaFunction: knowledgeIngestionLambda,
                  outputPath: '$.Payload',
                  payload: cdk.aws_stepfunctions.TaskInput.fromObject({
                  jobId: cdk.aws_stepfunctions.JsonPath.stringAt('$.jobId'),
                  action: 'CHECK_STATUS',
                }),
                }).next(
                  new cdk.aws_stepfunctions.Wait(this, 'WaitAgain', {
                    time: cdk.aws_stepfunctions.WaitTime.duration(cdk.Duration.minutes(2)),
                  })
                )
              )
          )
        )
      ),
      timeout: cdk.Duration.hours(2),
      stateMachineName: `${props.projectName}-${props.stage}-kb-ingestion`,
      stateMachineType: cdk.aws_stepfunctions.StateMachineType.STANDARD,
    });

    // Create CloudWatch event rule to trigger ingestion
    new cdk.aws_events.Rule(this, 'KnowledgeBaseIngestionRule', {
      description: 'Rule to trigger knowledge base ingestion',
      eventPattern: {
        source: ['aws.s3'],
        detailType: ['AWS API Call via CloudTrail'],
        detail: {
          eventSource: ['s3.amazonaws.com'],
          eventName: ['PutObject', 'CompleteMultipartUpload'],
          requestParameters: {
            bucketName: [knowledgeBucket.bucketName],
          },
        },
      },
      targets: [
        new cdk.aws_events_targets.SfnStateMachine(ingestionWorkflow),
      ],
    });

    // Outputs
    this.createOutput('KnowledgeBaseId', this.knowledgeBase.getAtt('KnowledgeBaseId').toString(), 'Bedrock Knowledge Base ID');
    this.createOutput('AgentId', this.bedrockAgent.getAtt('AgentId').toString(), 'Bedrock Agent ID');
    this.createOutput('GuardrailId', this.guardrailsConfig.getAtt('Arn').toString(), 'Bedrock Guardrail ID');
    this.createOutput('KnowledgeBucketName', knowledgeBucket.bucketName, 'Knowledge Base Bucket Name');

    // SSM Parameters
    this.createSsmParameter('KnowledgeBaseId', this.knowledgeBase.getAtt('KnowledgeBaseId').toString());
    this.createSsmParameter('AgentId', this.bedrockAgent.getAtt('AgentId').toString());
    this.createSsmParameter('GuardrailId', this.guardrailsConfig.getAtt('Arn').toString());
    this.createSsmParameter('KnowledgeBucketName', knowledgeBucket.bucketName);
  }
}