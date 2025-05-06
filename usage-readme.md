# AWS Serverless Multi-Tier Application - Deployment and Usage Guide

This document provides detailed instructions on how to deploy, test, and use the AWS Serverless Multi-Tier Application.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Deployment Options](#deployment-options)
3. [Step-by-Step Deployment](#step-by-step-deployment)
4. [Automated Jenkins Deployment](#automated-jenkins-deployment)
5. [Testing](#testing)
6. [Usage Guide](#usage-guide)
7. [Troubleshooting](#troubleshooting)

## Prerequisites

Before you begin, ensure you have the following:

- AWS Account with appropriate permissions
- AWS CLI installed and configured
- Node.js (v18 or later)
- AWS CDK (v2.126.0 or later)
- Docker (for local testing)
- Git

## Deployment Options

You have several options for deploying this application:

1. **Manual Deployment** - Using AWS CDK or CloudFormation directly
2. **Automated Deployment** - Using the provided Jenkins pipeline
3. **Local Development** - Using AWS SAM for local testing

## Step-by-Step Deployment

### Option 1: AWS CDK Deployment

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd <repository-directory>
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Bootstrap the AWS CDK (first time only):
   ```bash
   npx cdk bootstrap
   ```

4. Deploy the infrastructure:
   ```bash
   npx cdk deploy --all -c stage=dev
   ```

   This will deploy all the stacks in the correct order. You can specify a different stage (`dev`, `test`, or `prod`) using the `stage` context variable.

5. Monitor the deployment progress in the AWS CloudFormation console.

### Option 2: CloudFormation Deployment

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd <repository-directory>
   ```

2. Synthesize the CloudFormation template:
   ```bash
   npx cdk synth -c stage=dev > template.yaml
   ```

3. Deploy using the AWS CLI:
   ```bash
   aws cloudformation deploy \
     --template-file template.yaml \
     --stack-name serverless-multi-tier-dev \
     --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM CAPABILITY_AUTO_EXPAND \
     --parameter-overrides Stage=dev
   ```

## Automated Jenkins Deployment

This project includes a Jenkinsfile that automates the build, test, and deployment process.

### Setting Up Jenkins

1. Create a Jenkins pipeline job
2. Configure the job to use the Jenkinsfile from your repository
3. Add the required credentials to Jenkins:
   - `aws-access-key-id`: AWS Access Key ID with appropriate permissions
   - `aws-secret-access-key`: AWS Secret Access Key

### Running the Pipeline

1. Start a build, optionally with parameters:
   - `ENVIRONMENT`: The deployment environment (`dev`, `test`, or `prod`)
   - `SKIP_TESTS`: Whether to skip test execution
   - `DESTROY_STACK`: Whether to destroy the CloudFormation stack instead of deploying

2. Monitor the build progress in Jenkins.

## Testing

The project includes a comprehensive test suite to verify functionality at multiple levels.

### Unit Tests

Run unit tests for all components:
```bash
npm test
```

### Integration Tests

Run API integration tests:
```bash
cd tests
npm install
npm run test:api
```

These tests verify that the API endpoints are working correctly.

### Infrastructure Tests

Verify that the deployed infrastructure meets requirements:
```bash
cd tests
npm install
npm run test:infrastructure
```

These tests check that resources are properly configured and secure.

## Usage Guide

After deployment, you'll have access to the following components:

### Web Application

Access the web application at the CloudFront URL shown in the outputs:
```bash
aws cloudformation describe-stacks --stack-name serverless-multi-tier-dev-client --query "Stacks[0].Outputs[?OutputKey=='WebAppUrl'].OutputValue" --output text
```

### API Endpoints

The API is available at the API Gateway URL:
```bash
aws cloudformation describe-stacks --stack-name serverless-multi-tier-dev-api --query "Stacks[0].Outputs[?OutputKey=='ApiEndpoint'].OutputValue" --output text
```

### User Management

1. **Create a new user**:
   - Navigate to the web application
   - Click "Sign Up" to create a new account
   - Verify your email address with the code sent to your inbox

2. **Login**:
   - Use your email and password to log in
   - The app will store your JWT tokens for subsequent API calls

### Document Management

1. **Upload a document**:
   - Navigate to the "Documents" section
   - Click "Upload" and select a file
   - Add metadata like title, description, and tags

2. **View and manage documents**:
   - Browse your documents in the dashboard
   - Click on a document to view details and download
   - Use the controls to update or delete documents

### AI Features

1. **Document Analysis**:
   - Select a document and click "Analyze"
   - Choose the type of analysis (summary, entities, sentiment)
   - View the analysis results

2. **Chat Interface**:
   - Navigate to the "AI Assistant" section
   - Ask questions about your documents or general inquiries
   - The system uses Amazon Bedrock to generate responses

## Troubleshooting

### Deployment Issues

1. **CDK Bootstrap Error**:
   - Ensure you have bootstrapped the CDK in your account/region
   - Check IAM permissions

2. **Resource Limits**:
   - Verify that your AWS account has sufficient service limits
   - Request limit increases if needed

3. **Deployment Failures**:
   - Check CloudFormation events for error details
   - Look at CloudWatch logs for Lambda functions

### Application Issues

1. **API Errors**:
   - Check API Gateway CloudWatch logs
   - Verify Lambda function execution

2. **Authentication Problems**:
   - Ensure Cognito is properly configured
   - Check browser console for JWT token issues

3. **Document Upload Failures**:
   - Verify S3 bucket permissions
   - Check Lambda function logs for processing errors

For detailed error analysis, use CloudWatch Logs and the provided monitoring dashboards.

---

For additional assistance, contact the DevOps team or open an issue in the repository.
