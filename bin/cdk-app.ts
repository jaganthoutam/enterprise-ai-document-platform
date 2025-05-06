#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { ClientLayerStack } from '../lib/stacks/client-layer-stack';
import { ApiLayerStack } from '../lib/stacks/api-layer-stack';
import { AuthLayerStack } from '../lib/stacks/auth-layer-stack';
import { AppLayerStack } from '../lib/stacks/app-layer-stack';
import { StorageLayerStack } from '../lib/stacks/storage-layer-stack';
import { DataProcessingLayerStack } from '../lib/stacks/data-processing-layer-stack';
import { BedrockLayerStack } from '../lib/stacks/bedrock-layer-stack';
import { MonitoringLayerStack } from '../lib/stacks/monitoring-layer-stack';
import { SecurityLayerStack } from '../lib/stacks/security-layer-stack';

const app = new cdk.App();

// Environment configuration
const env = { 
  account: process.env.CDK_DEFAULT_ACCOUNT, 
  region: process.env.CDK_DEFAULT_REGION || 'us-east-1'
};

// Project configuration
const projectName = 'serverless-multi-tier';
const stage = app.node.tryGetContext('stage') || 'dev';

// Create stacks in dependency order
const securityStack = new SecurityLayerStack(app, `${projectName}-security-${stage}`, {
  env,
  stage,
  projectName,
  description: 'Security layer including KMS, Secrets Manager, Security Hub and VPC',
});

const storageStack = new StorageLayerStack(app, `${projectName}-storage-${stage}`, {
  env,
  stage,
  projectName,
  description: 'Storage layer including DynamoDB, RDS and S3',
  vpc: securityStack.vpc,
  kmsKey: securityStack.kmsKey,
});

const authStack = new AuthLayerStack(app, `${projectName}-auth-${stage}`, {
  env,
  stage,
  projectName,
  description: 'Authentication layer including Cognito and IAM',
});

const dataProcessingStack = new DataProcessingLayerStack(app, `${projectName}-data-processing-${stage}`, {
  env,
  stage,
  projectName,
  description: 'Data processing layer including vector embeddings and OpenSearch',
  vpc: securityStack.vpc,
  kmsKey: securityStack.kmsKey,
  documentBucket: storageStack.documentBucket,
});

const bedrockStack = new BedrockLayerStack(app, `${projectName}-bedrock-${stage}`, {
  env,
  stage,
  projectName,
  description: 'Amazon Bedrock layer including knowledge bases and foundation models',
  vpc: securityStack.vpc,
  vectorIndex: dataProcessingStack.vectorIndex,
});

const appStack = new AppLayerStack(app, `${projectName}-application-${stage}`, {
  env,
  stage,
  projectName,
  description: 'Application layer including Lambda functions and Step Functions',
  vpc: securityStack.vpc,
  kmsKey: securityStack.kmsKey,
  dynamoTable: storageStack.dynamoTable,
  rdsInstance: storageStack.rdsInstance,
  documentBucket: storageStack.documentBucket,
  userPool: authStack.userPool,
  knowledgeBase: bedrockStack.knowledgeBase,
});

const apiStack = new ApiLayerStack(app, `${projectName}-api-${stage}`, {
  env,
  stage,
  projectName,
  description: 'API layer including API Gateway and CloudFront',
  vpc: securityStack.vpc,
  userPool: authStack.userPool,
  lambdaFunctions: appStack.lambdaFunctions,
});

const clientStack = new ClientLayerStack(app, `${projectName}-client-${stage}`, {
  env,
  stage,
  projectName,
  description: 'Client layer including web app, mobile app and third-party integration',
  apiEndpoint: apiStack.apiEndpoint,
  cloudfrontDistribution: apiStack.cloudfrontDistribution,
  userPool: authStack.userPool,
});

const monitoringStack = new MonitoringLayerStack(app, `${projectName}-monitoring-${stage}`, {
  env,
  stage,
  projectName,
  description: 'Monitoring layer including CloudWatch, X-Ray, CloudTrail and QuickSight',
  vpc: securityStack.vpc,
  apiGateway: apiStack.apiGateway,
  lambdaFunctions: appStack.lambdaFunctions,
  dynamoTable: storageStack.dynamoTable,
  rdsInstance: storageStack.rdsInstance,
});

// Add relevant tagging
const tags = {
  Project: projectName,
  Environment: stage,
  ManagedBy: 'CDK',
};

// Apply tags to all stacks
for (const stack of [
  securityStack, storageStack, authStack, dataProcessingStack, 
  bedrockStack, appStack, apiStack, clientStack, monitoringStack
]) {
  Object.entries(tags).forEach(([key, value]) => {
    cdk.Tags.of(stack).add(key, value);
  });
}
