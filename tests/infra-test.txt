const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// Configure AWS SDK
AWS.config.update({
  region: process.env.AWS_REGION || 'us-east-1'
});

// Initialize AWS services
const cloudformation = new AWS.CloudFormation();
const s3 = new AWS.S3();
const dynamodb = new AWS.DynamoDB();
const cognito = new AWS.CognitoIdentityServiceProvider();
const apigateway = new AWS.APIGateway();
const lambda = new AWS.Lambda();

// Test configuration
const config = {
  projectName: process.env.PROJECT_NAME || 'serverless-multi-tier',
  stage: process.env.DEPLOY_ENV || 'dev',
  templatePath: process.env.TEMPLATE_PATH || path.join(__dirname, '../cloudformation/template.yaml'),
  timeoutMs: 30000 // 30 seconds
};

// Helper functions
const getStackName = (component) => `${config.projectName}-${config.stage}-${component}`;

const describeStack = async (stackName) => {
  try {
    const result = await cloudformation.describeStacks({
      StackName: stackName
    }).promise();
    
    return result.Stacks[0];
  } catch (error) {
    if (error.code === 'ValidationError' && error.message.includes('does not exist')) {
      return null;
    }
    throw error;
  }
};

const validateTemplate = async (templatePath) => {
  try {
    const templateContent = fs.readFileSync(templatePath, 'utf8');
    let templateBody;
    
    if (templatePath.endsWith('.yaml') || templatePath.endsWith('.yml')) {
      // Convert YAML to JSON for CloudFormation
      templateBody = yaml.load(templateContent);
    } else {
      templateBody = JSON.parse(templateContent);
    }
    
    // Validate template
    const result = await cloudformation.validateTemplate({
      TemplateBody: JSON.stringify(templateBody)
    }).promise();
    
    return result;
  } catch (error) {
    console.error('Template validation error:', error);
    throw error;
  }
};

// Tests
describe('Infrastructure Tests', () => {
  jest.setTimeout(config.timeoutMs);
  
  describe('CloudFormation Template Validation', () => {
    test('Should validate CloudFormation template syntax', async () => {
      try {
        const result = await validateTemplate(config.templatePath);
        expect(result).toBeDefined();
      } catch (error) {
        console.error('Template validation failed:', error);
        throw error;
      }
    });
    
    test('Should check for required resources in template', () => {
      const templateContent = fs.readFileSync(config.templatePath, 'utf8');
      let template;
      
      if (config.templatePath.endsWith('.yaml') || config.templatePath.endsWith('.yml')) {
        template = yaml.load(templateContent);
      } else {
        template = JSON.parse(templateContent);
      }
      
      // Check for required sections
      expect(template).toHaveProperty('Resources');
      expect(template).toHaveProperty('Outputs');
      
      // Check for essential resources
      const resources = template.Resources;
      const resourceTypes = Object.values(resources).map(r => r.Type);
      
      // Security layer
      expect(resourceTypes).toContain('AWS::EC2::VPC');
      expect(resourceTypes).toContain('AWS::KMS::Key');
      
      // Storage layer
      expect(resourceTypes).toContain('AWS::S3::Bucket');
      expect(resourceTypes).toContain('AWS::DynamoDB::Table');
      
      // Auth layer
      expect(resourceTypes).toContain('AWS::Cognito::UserPool');
      expect(resourceTypes).toContain('AWS::Cognito::UserPoolClient');
      
      // API layer
      expect(resourceTypes).toContain('AWS::ApiGateway::RestApi');
      
      // Lambda functions
      expect(resourceTypes).toContain('AWS::Lambda::Function');
    });
  });
  
  describe('Stack Outputs Validation', () => {
    // These tests will only run if the stacks exist in the AWS account
    // They validate that the required outputs are present
    
    test('Should verify API Gateway outputs', async () => {
      const stackName = getStackName('api');
      const stack = await describeStack(stackName);
      
      if (!stack) {
        console.warn(`Stack ${stackName} does not exist, skipping test`);
        return;
      }
      
      const outputs = stack.Outputs;
      const outputKeys = outputs.map(o => o.OutputKey);
      
      expect(outputKeys).toContain('ApiEndpoint');
      
      // Get API endpoint for further testing
      const apiEndpoint = outputs.find(o => o.OutputKey === 'ApiEndpoint').OutputValue;
      expect(apiEndpoint).toMatch(/^https:\/\//);
    });
    
    test('Should verify Cognito User Pool outputs', async () => {
      const stackName = getStackName('auth');
      const stack = await describeStack(stackName);
      
      if (!stack) {
        console.warn(`Stack ${stackName} does not exist, skipping test`);
        return;
      }
      
      const outputs = stack.Outputs;
      const outputKeys = outputs.map(o => o.OutputKey);
      
      expect(outputKeys).toContain('UserPoolId');
      expect(outputKeys).toContain('UserPoolClientId');
    });
    
    test('Should verify Storage outputs', async () => {
      const stackName = getStackName('storage');
      const stack = await describeStack(stackName);
      
      if (!stack) {
        console.warn(`Stack ${stackName} does not exist, skipping test`);
        return;
      }
      
      const outputs = stack.Outputs;
      const outputKeys = outputs.map(o => o.OutputKey);
      
      expect(outputKeys).toContain('DynamoTableName');
      expect(outputKeys).toContain('DocumentBucketName');
    });
  });
  
  describe('Resource Configuration Tests', () => {
    // These tests verify that resources are configured properly
    // They will only run if the stacks exist in the AWS account
    
    test('Should verify S3 bucket encryption', async () => {
      const stackName = getStackName('storage');
      const stack = await describeStack(stackName);
      
      if (!stack) {
        console.warn(`Stack ${stackName} does not exist, skipping test`);
        return;
      }
      
      const bucketNameOutput = stack.Outputs.find(o => o.OutputKey === 'DocumentBucketName');
      if (!bucketNameOutput) {
        console.warn('Document bucket name output not found, skipping test');
        return;
      }
      
      const bucketName = bucketNameOutput.OutputValue;
      
      try {
        const encryption = await s3.getBucketEncryption({
          Bucket: bucketName
        }).promise();
        
        expect(encryption).toHaveProperty('ServerSideEncryptionConfiguration');
        expect(encryption.ServerSideEncryptionConfiguration.Rules.length).toBeGreaterThan(0);
        
        // Check that SSE is enabled
        const sseRule = encryption.ServerSideEncryptionConfiguration.Rules[0];
        expect(sseRule).toHaveProperty('ApplyServerSideEncryptionByDefault');
      } catch (error) {
        if (error.code === 'ServerSideEncryptionConfigurationNotFoundError') {
          fail('S3 bucket encryption is not enabled');
        } else {
          throw error;
        }
      }
    });
    
    test('Should verify DynamoDB encryption', async () => {
      const stackName = getStackName('storage');
      const stack = await describeStack(stackName);
      
      if (!stack) {
        console.warn(`Stack ${stackName} does not exist, skipping test`);
        return;
      }
      
      const tableNameOutput = stack.Outputs.find(o => o.OutputKey === 'DynamoTableName');
      if (!tableNameOutput) {
        console.warn('DynamoDB table name output not found, skipping test');
        return;
      }
      
      const tableName = tableNameOutput.OutputValue;
      
      try {
        const tableInfo = await dynamodb.describeTable({
          TableName: tableName
        }).promise();
        
        expect(tableInfo).toHaveProperty('Table');
        expect(tableInfo.Table).toHaveProperty('SSEDescription');
        expect(tableInfo.Table.SSEDescription.Status).toBe('ENABLED');
      } catch (error) {
        console.error('Failed to verify DynamoDB encryption:', error);
        throw error;
      }
    });
    
    test('Should verify Cognito password policy', async () => {
      const stackName = getStackName('auth');
      const stack = await describeStack(stackName);
      
      if (!stack) {
        console.warn(`Stack ${stackName} does not exist, skipping test`);
        return;
      }
      
      const userPoolIdOutput = stack.Outputs.find(o => o.OutputKey === 'UserPoolId');
      if (!userPoolIdOutput) {
        console.warn('User Pool ID output not found, skipping test');
        return;
      }
      
      const userPoolId = userPoolIdOutput.OutputValue;
      
      try {
        const userPoolInfo = await cognito.describeUserPool({
          UserPoolId: userPoolId
        }).promise();
        
        expect(userPoolInfo).toHaveProperty('UserPool');
        expect(userPoolInfo.UserPool).toHaveProperty('Policies');
        expect(userPoolInfo.UserPool.Policies).toHaveProperty('PasswordPolicy');
        
        const passwordPolicy = userPoolInfo.UserPool.Policies.PasswordPolicy;
        expect(passwordPolicy.MinimumLength).toBeGreaterThanOrEqual(8);
        expect(passwordPolicy.RequireUppercase).toBe(true);
        expect(passwordPolicy.RequireLowercase).toBe(true);
        expect(passwordPolicy.RequireNumbers).toBe(true);
        expect(passwordPolicy.RequireSymbols).toBe(true);
      } catch (error) {
        console.error('Failed to verify Cognito password policy:', error);
        throw error;
      }
    });
    
    test('Should verify API Gateway CORS configuration', async () => {
      const stackName = getStackName('api');
      const stack = await describeStack(stackName);
      
      if (!stack) {
        console.warn(`Stack ${stackName} does not exist, skipping test`);
        return;
      }
      
      try {
        // Get the API ID from the stack outputs
        const apiId = stack.Outputs.find(o => o.OutputKey === 'ApiEndpoint')
          .OutputValue.split('.')[0].replace('https://', '');
        
        // Get REST API resources
        const resources = await apigateway.getResources({
          restApiId: apiId,
          limit: 500
        }).promise();
        
        // Check if at least one resource has CORS enabled
        const resourcesWithCors = resources.items.filter(resource => {
          return resource.resourceMethods && 
                 resource.resourceMethods.OPTIONS &&
                 resource.resourceMethods.OPTIONS.methodIntegration &&
                 resource.resourceMethods.OPTIONS.methodIntegration.integrationResponses &&
                 resource.resourceMethods.OPTIONS.methodIntegration.integrationResponses['200'] &&
                 resource.resourceMethods.OPTIONS.methodIntegration.integrationResponses['200'].responseParameters &&
                 resource.resourceMethods.OPTIONS.methodIntegration.integrationResponses['200'].responseParameters['method.response.header.Access-Control-Allow-Origin'];
        });
        
        expect(resourcesWithCors.length).toBeGreaterThan(0);
      } catch (error) {
        console.error('Failed to verify API Gateway CORS configuration:', error);
        throw error;
      }
    });
  });
  
  describe('Lambda Function Tests', () => {
    // These tests verify that Lambda functions are configured properly
    // They will only run if the stacks exist in the AWS account
    
    test('Should verify Lambda function environment encryption', async () => {
      const stackName = getStackName('application');
      const stack = await describeStack(stackName);
      
      if (!stack) {
        console.warn(`Stack ${stackName} does not exist, skipping test`);
        return;
      }
      
      try {
        // Get a list of Lambda functions from the stack
        const cfnResources = await cloudformation.listStackResources({
          StackName: stackName
        }).promise();
        
        const lambdaResources = cfnResources.StackResourceSummaries.filter(
          resource => resource.ResourceType === 'AWS::Lambda::Function'
        );
        
        expect(lambdaResources.length).toBeGreaterThan(0);
        
        // Check that environment variables are encrypted for each Lambda function
        for (const lambdaResource of lambdaResources) {
          const functionName = lambdaResource.PhysicalResourceId;
          
          const functionConfig = await lambda.getFunctionConfiguration({
            FunctionName: functionName
          }).promise();
          
          // Check if the Lambda has environment variables
          if (functionConfig.Environment) {
            expect(functionConfig.Environment).toHaveProperty('Variables');
            expect(Object.keys(functionConfig.Environment.Variables).length).toBeGreaterThan(0);
            
            // KMS key should be configured for environment variable encryption
            expect(functionConfig).toHaveProperty('KMSKeyArn');
            expect(functionConfig.KMSKeyArn).toBeTruthy();
          }
        }
      } catch (error) {
        console.error('Failed to verify Lambda function environment encryption:', error);
        throw error;
      }
    });
    
    test('Should verify Lambda function VPC configuration', async () => {
      const stackName = getStackName('application');
      const stack = await describeStack(stackName);
      
      if (!stack) {
        console.warn(`Stack ${stackName} does not exist, skipping test`);
        return;
      }
      
      try {
        // Get a list of Lambda functions from the stack
        const cfnResources = await cloudformation.listStackResources({
          StackName: stackName
        }).promise();
        
        const lambdaResources = cfnResources.StackResourceSummaries.filter(
          resource => resource.ResourceType === 'AWS::Lambda::Function'
        );
        
        expect(lambdaResources.length).toBeGreaterThan(0);
        
        // Check that Lambda functions are configured with VPC access where needed
        for (const lambdaResource of lambdaResources) {
          const functionName = lambdaResource.PhysicalResourceId;
          
          const functionConfig = await lambda.getFunctionConfiguration({
            FunctionName: functionName
          }).promise();
          
          // Lambda functions that need access to RDS or VPC resources should be in a VPC
          if (functionConfig.Environment && 
              functionConfig.Environment.Variables && 
              (functionConfig.Environment.Variables.DB_SECRET_ARN || 
               functionConfig.Environment.Variables.DYNAMODB_TABLE)) {
            
            expect(functionConfig).toHaveProperty('VpcConfig');
            expect(functionConfig.VpcConfig).toHaveProperty('SubnetIds');
            expect(functionConfig.VpcConfig.SubnetIds.length).toBeGreaterThan(0);
            expect(functionConfig.VpcConfig).toHaveProperty('SecurityGroupIds');
            expect(functionConfig.VpcConfig.SecurityGroupIds.length).toBeGreaterThan(0);
          }
        }
      } catch (error) {
        console.error('Failed to verify Lambda function VPC configuration:', error);
        throw error;
      }
    });
  });
  
  describe('End-to-End Stack Tests', () => {
    // These tests verify that all the stacks are deployed and resources are accessible
    // They will only run if the stacks exist in the AWS account
    
    test('Should verify all required stacks are deployed', async () => {
      const requiredStacks = [
        'security',
        'storage',
        'auth',
        'data-processing',
        'bedrock',
        'application',
        'api',
        'client',
        'monitoring'
      ];
      
      for (const stackSuffix of requiredStacks) {
        const stackName = getStackName(stackSuffix);
        const stack = await describeStack(stackName);
        
        if (!stack) {
          console.warn(`Stack ${stackName} does not exist`);
          continue;
        }
        
        expect(stack.StackStatus).not.toBe('ROLLBACK_COMPLETE');
        expect(stack.StackStatus).not.toBe('DELETE_COMPLETE');
        expect(stack.StackStatus).not.toContain('FAILED');
        
        console.log(`Stack ${stackName} status: ${stack.StackStatus}`);
      }
    });
    
    test('Should verify CloudFront distribution is accessible', async () => {
      const stackName = getStackName('client');
      const stack = await describeStack(stackName);
      
      if (!stack) {
        console.warn(`Stack ${stackName} does not exist, skipping test`);
        return;
      }
      
      const cloudfrontDomainOutput = stack.Outputs.find(o => o.OutputKey === 'CloudFrontDomain');
      if (!cloudfrontDomainOutput) {
        console.warn('CloudFront domain output not found, skipping test');
        return;
      }
      
      const cloudfrontDomain = cloudfrontDomainOutput.OutputValue;
      
      // Use the fetch API to make a request to the CloudFront domain
      try {
        const response = await fetch(`https://${cloudfrontDomain}`);
        expect(response.status).toBe(200);
      } catch (error) {
        console.error('Failed to access CloudFront distribution:', error);
        throw error;
      }
    });
  });
});
