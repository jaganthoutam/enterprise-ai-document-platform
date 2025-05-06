import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { BaseStack, BaseStackProps } from './base-stack';

export class SecurityLayerStack extends BaseStack {
  public readonly vpc: cdk.aws_ec2.Vpc;
  public readonly kmsKey: cdk.aws_kms.Key;
  public readonly securityHub: cdk.aws_securityhub.CfnHub;
  public readonly secretsManager: cdk.aws_secretsmanager.Secret;

  constructor(scope: Construct, id: string, props: BaseStackProps) {
    super(scope, id, props);

    // Create VPC with public and private subnets across multiple AZs
    this.vpc = new cdk.aws_ec2.Vpc(this, 'AppVpc', {
      maxAzs: 3,
      natGateways: 1,
      subnetConfiguration: [
        {
          name: 'public',
          subnetType: cdk.aws_ec2.SubnetType.PUBLIC,
          cidrMask: 24,
        },
        {
          name: 'private',
          subnetType: cdk.aws_ec2.SubnetType.PRIVATE_WITH_EGRESS,
          cidrMask: 24,
        },
        {
          name: 'isolated',
          subnetType: cdk.aws_ec2.SubnetType.PRIVATE_ISOLATED,
          cidrMask: 24,
        },
      ],
    });

    // Create KMS key for encryption
    this.kmsKey = new cdk.aws_kms.Key(this, 'AppEncryptionKey', {
      enableKeyRotation: true,
      alias: `alias/${props.projectName}-${props.stage}-key`,
      description: `KMS key for ${props.projectName} ${props.stage} environment`,
    });

    // Create Security Hub
    this.securityHub = new cdk.aws_securityhub.CfnHub(this, 'SecurityHub', {
      enableDefaultStandards: true,
      autoEnableControls: true,
    });

    // Create Secrets Manager for application secrets
    this.secretsManager = new cdk.aws_secretsmanager.Secret(this, 'AppSecrets', {
      secretName: `${props.projectName}/${props.stage}/app-secrets`,
      description: `Secrets for ${props.projectName} ${props.stage} environment`,
      encryptionKey: this.kmsKey,
    });

    // Create KMS Policy for logs encryption
    const logEncryptionPolicy = new cdk.aws_iam.PolicyDocument({
      statements: [
        new cdk.aws_iam.PolicyStatement({
          actions: [
            'kms:Encrypt*',
            'kms:Decrypt*',
            'kms:ReEncrypt*',
            'kms:GenerateDataKey*',
            'kms:Describe*',
          ],
          resources: ['*'],
          principals: [
            new cdk.aws_iam.ServicePrincipal('logs.amazonaws.com'),
            new cdk.aws_iam.ServicePrincipal('lambda.amazonaws.com'),
          ],
        }),
      ],
    });

    // Attach policy to KMS key
    this.kmsKey.addToResourcePolicy(logEncryptionPolicy.statements[0]);

    // AWS Security Hub configuration
    new cdk.aws_securityhub.CfnStandardsSubscription(this, 'CisAwsFoundations', {
      standardsArn: `arn:aws:securityhub:${this.region}::standards/cis-aws-foundations-benchmark/v/1.2.0`,
    });

    // AWS Config to feed into Security Hub
    const configRole = new cdk.aws_iam.Role(this, 'ConfigRole', {
      assumedBy: new cdk.aws_iam.ServicePrincipal('config.amazonaws.com'),
      managedPolicies: [
        cdk.aws_iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWS_ConfigRole'),
      ],
    });

    new cdk.aws_config.CfnConfigurationRecorder(this, 'ConfigRecorder', {
      roleArn: configRole.roleArn,
      recordingGroup: {
        allSupported: true,
        includeGlobalResources: true,
      },
    });

    new cdk.aws_config.CfnDeliveryChannel(this, 'ConfigDeliveryChannel', {
      s3BucketName: new cdk.aws_s3.Bucket(this, 'ConfigBucket', {
        encryption: cdk.aws_s3.BucketEncryption.S3_MANAGED,
        blockPublicAccess: cdk.aws_s3.BlockPublicAccess.BLOCK_ALL,
        removalPolicy: cdk.RemovalPolicy.RETAIN,
        enforceSSL: true,
      }).bucketName,
      configSnapshotDeliveryProperties: {
        deliveryFrequency: 'One_Hour',
      },
    });

    // VPC Flow Logs
    const flowLogsRole = new cdk.aws_iam.Role(this, 'FlowLogsRole', {
      assumedBy: new cdk.aws_iam.ServicePrincipal('vpc-flow-logs.amazonaws.com'),
    });

    new cdk.aws_ec2.FlowLog(this, 'VpcFlowLogs', {
      resourceType: cdk.aws_ec2.FlowLogResourceType.fromVpc(this.vpc),
      destination: cdk.aws_ec2.FlowLogDestination.toCloudWatchLogs(
        new cdk.aws_logs.LogGroup(this, 'FlowLogsGroup', {
          retention: cdk.aws_logs.RetentionDays.ONE_MONTH,
          encryptionKey: this.kmsKey,
        }),
        flowLogsRole
      ),
    });

    // WAF Web ACL
    const webAcl = new cdk.aws_wafv2.CfnWebACL(this, 'WebAcl', {
      defaultAction: { allow: {} },
      scope: 'REGIONAL',
      visibilityConfig: {
        cloudWatchMetricsEnabled: true,
        metricName: 'webACL',
        sampledRequestsEnabled: true,
      },
      rules: [
        {
          name: 'AWS-AWSManagedRulesCommonRuleSet',
          priority: 0,
          statement: {
            managedRuleGroupStatement: {
              vendorName: 'AWS',
              name: 'AWSManagedRulesCommonRuleSet',
            }
          },
          overrideAction: { none: {} },
          visibilityConfig: {
            cloudWatchMetricsEnabled: true,
            metricName: 'awsCommonRules',
            sampledRequestsEnabled: true,
          },
        },
        {
          name: 'AWS-AWSManagedRulesSQLiRuleSet',
          priority: 1,
          statement: {
            managedRuleGroupStatement: {
              vendorName: 'AWS',
              name: 'AWSManagedRulesSQLiRuleSet',
            }
          },
          overrideAction: { none: {} },
          visibilityConfig: {
            cloudWatchMetricsEnabled: true,
            metricName: 'awsSQLRules',
            sampledRequestsEnabled: true,
          },
        },
      ],
    });

    // Outputs
    this.createOutput('VpcId', this.vpc.vpcId, 'VPC ID');
    this.createOutput('KmsKeyArn', this.kmsKey.keyArn, 'KMS Key ARN');
    this.createOutput('SecretName', this.secretsManager.secretName, 'Secrets Manager Secret Name');
    this.createOutput('WebAclId', webAcl.attrId, 'WAF Web ACL ID');

    // SSM Parameters
    this.createSsmParameter('VpcId', this.vpc.vpcId);
    this.createSsmParameter('KmsKeyArn', this.kmsKey.keyArn);
    this.createSsmParameter('SecretName', this.secretsManager.secretName);
    this.createSsmParameter('WebAclId', webAcl.attrId);
  }
}
