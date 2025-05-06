import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { BaseStack, BaseStackProps } from './base-stack';

export interface StorageLayerStackProps extends BaseStackProps {
  readonly vpc: cdk.aws_ec2.Vpc;
  readonly kmsKey: cdk.aws_kms.Key;
}

export class StorageLayerStack extends BaseStack {
  public readonly dynamoTable: cdk.aws_dynamodb.Table;
  public readonly rdsInstance: cdk.aws_rds.DatabaseInstance;
  public readonly documentBucket: cdk.aws_s3.Bucket;

  constructor(scope: Construct, id: string, props: StorageLayerStackProps) {
    super(scope, id, props);

    // DynamoDB Table with on-demand capacity
    this.dynamoTable = new cdk.aws_dynamodb.Table(this, 'DynamoTable', {
      tableName: `${props.projectName}-${props.stage}-table`,
      partitionKey: { name: 'PK', type: cdk.aws_dynamodb.AttributeType.STRING },
      sortKey: { name: 'SK', type: cdk.aws_dynamodb.AttributeType.STRING },
      billingMode: cdk.aws_dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: cdk.aws_dynamodb.TableEncryption.CUSTOMER_MANAGED,
      encryptionKey: props.kmsKey,
      pointInTimeRecovery: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // Add Global Secondary Indexes
    this.dynamoTable.addGlobalSecondaryIndex({
      indexName: 'GSI1',
      partitionKey: { name: 'GSI1PK', type: cdk.aws_dynamodb.AttributeType.STRING },
      sortKey: { name: 'GSI1SK', type: cdk.aws_dynamodb.AttributeType.STRING },
    });

    this.dynamoTable.addGlobalSecondaryIndex({
      indexName: 'GSI2',
      partitionKey: { name: 'GSI2PK', type: cdk.aws_dynamodb.AttributeType.STRING },
      sortKey: { name: 'GSI2SK', type: cdk.aws_dynamodb.AttributeType.STRING },
    });

    // RDS Database Security Group
    const dbSecurityGroup = new cdk.aws_ec2.SecurityGroup(this, 'RdsSecurityGroup', {
      vpc: props.vpc,
      description: 'Allow database access',
      allowAllOutbound: true,
    });

    // RDS Database Subnet Group
    const dbSubnetGroup = new cdk.aws_rds.SubnetGroup(this, 'RdsSubnetGroup', {
      description: `${props.projectName} ${props.stage} RDS subnet group`,
      vpc: props.vpc,
      vpcSubnets: {
        subnetType: cdk.aws_ec2.SubnetType.PRIVATE_ISOLATED,
      },
    });

    // RDS Database Parameter Group
    const dbParameterGroup = new cdk.aws_rds.ParameterGroup(this, 'RdsParameterGroup', {
      engine: cdk.aws_rds.DatabaseInstanceEngine.postgres({
        version: cdk.aws_rds.PostgresEngineVersion.VER_15,
      }),
      parameters: {
        'ssl': 'on',
        'rds.force_ssl': '1',
      },
    });

    // Database credentials stored in Secrets Manager
    const databaseCredentials = new cdk.aws_secretsmanager.Secret(this, 'DBCredentials', {
      secretName: `${props.projectName}/${props.stage}/db-credentials`,
      description: `RDS credentials for ${props.projectName} ${props.stage}`,
      encryptionKey: props.kmsKey,
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: 'dbadmin' }),
        generateStringKey: 'password',
        excludePunctuation: true,
        excludeCharacters: '"@/\\\'',
        passwordLength: 16,
      },
    });

    // RDS PostgreSQL Instance
    this.rdsInstance = new cdk.aws_rds.DatabaseInstance(this, 'RdsInstance', {
      engine: cdk.aws_rds.DatabaseInstanceEngine.postgres({
        version: cdk.aws_rds.PostgresEngineVersion.VER_15,
      }),
      instanceType: cdk.aws_ec2.InstanceType.of(
        cdk.aws_ec2.InstanceClass.BURSTABLE3,
        cdk.aws_ec2.InstanceSize.MEDIUM
      ),
      vpc: props.vpc,
      vpcSubnets: {
        subnetType: cdk.aws_ec2.SubnetType.PRIVATE_ISOLATED,
      },
      securityGroups: [dbSecurityGroup],
      subnetGroup: dbSubnetGroup,
      parameterGroup: dbParameterGroup,
      storageEncrypted: true,
      storageEncryptionKey: props.kmsKey,
      multiAz: true,
      autoMinorVersionUpgrade: true,
      allocatedStorage: 20,
      maxAllocatedStorage: 100,
      allowMajorVersionUpgrade: false,
      backupRetention: cdk.Duration.days(7),
      deleteAutomatedBackups: false,
      deletionProtection: true,
      databaseName: `${props.projectName.replace(/-/g, '_')}_${props.stage}`,
      credentials: cdk.aws_rds.Credentials.fromSecret(databaseCredentials),
      removalPolicy: cdk.RemovalPolicy.SNAPSHOT,
    });

    // S3 Document Bucket with versioning and encryption
    this.documentBucket = new cdk.aws_s3.Bucket(this, 'DocumentBucket', {
      bucketName: `${props.projectName}-${props.stage}-documents-${this.account}`,
      encryption: cdk.aws_s3.BucketEncryption.KMS,
      encryptionKey: props.kmsKey,
      versioned: true,
      blockPublicAccess: cdk.aws_s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      enforceSSL: true,
      cors: [
        {
          allowedMethods: [
            cdk.aws_s3.HttpMethods.GET,
            cdk.aws_s3.HttpMethods.PUT,
            cdk.aws_s3.HttpMethods.POST,
            cdk.aws_s3.HttpMethods.DELETE,
            cdk.aws_s3.HttpMethods.HEAD,
          ],
          allowedOrigins: ['*'], // Will be restricted in production
          allowedHeaders: ['*'],
          exposedHeaders: [
            'x-amz-server-side-encryption',
            'x-amz-request-id',
            'x-amz-id-2',
            'ETag',
          ],
          maxAge: 3000,
        },
      ],
      lifecycleRules: [
        {
          id: 'transition-to-infrequent-access',
          transitions: [
            {
              storageClass: cdk.aws_s3.StorageClass.INFREQUENT_ACCESS,
              transitionAfter: cdk.Duration.days(90),
            },
            {
              storageClass: cdk.aws_s3.StorageClass.GLACIER,
              transitionAfter: cdk.Duration.days(180),
            },
          ],
          noncurrentVersionTransitions: [
            {
              storageClass: cdk.aws_s3.StorageClass.GLACIER,
              transitionAfter: cdk.Duration.days(30),
            },
          ],
          noncurrentVersionExpiration: cdk.Duration.days(365),
        },
      ],
    });

    // Add bucket policy for TLS enforcement
    const bucketPolicy = new cdk.aws_s3.BucketPolicy(this, 'DocumentBucketPolicy', {
      bucket: this.documentBucket,
    });

    bucketPolicy.document.addStatements(
      new cdk.aws_iam.PolicyStatement({
        sid: 'DenyInsecureConnections',
        effect: cdk.aws_iam.Effect.DENY,
        principals: [new cdk.aws_iam.AnyPrincipal()],
        actions: ['s3:*'],
        resources: [
          this.documentBucket.arnForObjects('*'),
          this.documentBucket.bucketArn,
        ],
        conditions: {
          Bool: {
            'aws:SecureTransport': 'false',
          },
        },
      })
    );

    // Create outputs for cross-stack references
    this.createOutput('DynamoTableName', this.dynamoTable.tableName, 'DynamoDB Table Name');
    this.createOutput('RdsEndpoint', this.rdsInstance.dbInstanceEndpointAddress, 'RDS Endpoint Address');
    this.createOutput('DocumentBucketName', this.documentBucket.bucketName, 'S3 Document Bucket Name');

    // SSM Parameters
    this.createSsmParameter('DynamoTableName', this.dynamoTable.tableName);
    this.createSsmParameter('RdsEndpoint', this.rdsInstance.dbInstanceEndpointAddress);
    this.createSsmParameter('DocumentBucketName', this.documentBucket.bucketName);
  }
}