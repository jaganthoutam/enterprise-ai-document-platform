# Comprehensive Deployment Guide for Bedrock AI Document Analysis Application

This guide is based on the project's React frontend, AWS serverless architecture (including API Gateway, Lambda, DynamoDB, and S3), as identified in files like package.json, template.yaml, and Lambda scripts.

# Table of Contents
- [Architecture Overview](#architecture-overview)
- [Prerequisites](#prerequisites)
- [Detailed Deployment Steps](#detailed-deployment-steps)
- [Troubleshooting Common Issues](#troubleshooting-common-issues)
- [Best Practices for Deployment](#best-practices-for-deployment)
- [Resource References](#resource-references)
- [Final Verification](#final-verification)

## Architecture Overview
- **Frontend**: React app with Material-UI for UI components, handling authentication, dashboards, and document analysis.
- **Services**: AWS Lambda functions for document processing, API Gateway for endpoints, DynamoDB for data storage, and S3 for file handling.
- **Key Files**: package.json (dependencies), template.yaml (AWS resources), and Lambda scripts.

---

## Prerequisites
- Node.js (v16+ recommended)
- npm or yarn
- AWS CLI configured with appropriate permissions
- (Optional) Python 3.x for AWS SAM/CloudFormation/CDK if using infrastructure-as-code

---

## 1. Clone the Repository
```sh
git clone <your-repo-url>
cd <your-repo-name>
```

---

## 2. Install Frontend Dependencies
```sh
cd src
npm install
# or
yarn install
```

---

## 3. Environment Variables
Create a `.env` file in the `src/` directory with the following (example for Amplify):
```
REACT_APP_AWS_REGION=your-region
REACT_APP_USER_POOL_ID=your-user-pool-id
REACT_APP_USER_POOL_CLIENT_ID=your-client-id
REACT_APP_API_ENDPOINT=https://your-api-gateway-url
REACT_APP_AUTH_API_ENDPOINT=https://your-auth-api-gateway-url
```

---

## 4. Run the Frontend Locally
```sh
npm start
# or
yarn start
```
The app will be available at [http://localhost:3000](http://localhost:3000).

---

## 5. Deploy Services (Lambdas, DynamoDB, S3, API Gateway)

You can use AWS SAM, CDK, or the AWS Console to deploy the services.

### Example with AWS SAM:
```sh
sam build
sam deploy --guided
```
- Set environment variables for each Lambda (table names, bucket names, etc.)
- Make sure your API Gateway routes match the frontend API client paths.

### Lambda Functions
- Place all Lambda handler files in `src/lambda/`.
- Each Lambda should be mapped to the corresponding API Gateway route.
- Set environment variables for DynamoDB table names, S3 bucket, etc.

---

## 6. (Optional) Run Tests
```sh
npm test
# or
yarn test
```

---

## 7. Folder Structure
```
/ (root)
  /src
    /api         # API client files for service endpoints
    /pages       # React pages (AI Assistant, Users, Tenants, etc.)
    /components  # Shared UI components (StatusChip, ConfirmDialog, etc.)
    /tests       # (Recommended) Automated tests
  /public        # Static assets
  package.json   # Project dependencies and scripts
  .env           # Environment variables
  installation.md # This installation guide
```

---

## 8. Additional Notes
- Make sure your AWS IAM roles allow access to DynamoDB, S3, and Bedrock/OpenAI as needed.
- For production, set up CI/CD and environment-specific variables.
- For infrastructure-as-code, see `template.yaml` or your CDK/SAM templates.

---

## 9. Load Sample Data
To load sample data into the application, follow these steps:

1. Navigate to the `sample-data` directory.
2. Use the following commands to load the sample data into your application:

   ```sh
   # Load sample users
   aws dynamodb put-item --table-name <your-users-table-name> --item file://sample-users.json

   # Load sample tenants
   aws dynamodb put-item --table-name <your-tenants-table-name> --item file://sample-tenants.json

   # Load sample documents
   aws dynamodb put-item --table-name <your-documents-table-name> --item file://sample-documents.json

   # Load sample analysis
   aws dynamodb put-item --table-name <your-analysis-table-name> --item file://sample-analysis.txt

   # Load sample conversations
   aws dynamodb put-item --table-name <your-chat-history-table-name> --item file://sample-conversations.txt

   # Load sample tenant configuration
   aws dynamodb put-item --table-name <your-settings-table-name> --item file://sample-tenant-config.txt
   ```

   Replace `<your-users-table-name>`, `<your-tenants-table-name>`, `<your-documents-table-name>`, `<your-analysis-table-name>`, `<your-chat-history-table-name>`, and `<your-settings-table-name>` with the actual table names from your DynamoDB setup.

3. Verify the data has been loaded by checking the respective tables in the AWS DynamoDB console.

---

## Post-Deployment Appearance
After deploying your application (e.g., via AWS Amplify), the app will feature a modern React-based interface, including:
- A secure login page for user authentication.
- A main dashboard with document analysis tools like summaries, key terms, and risk assessments.
- Easy navigation for settings, notifications, and admin features.
- Responsive Material-UI components for a professional look with cards, buttons, and forms.
The app will be hosted on a URL like `your-app-name.amplifyapp.com` and adapt to various devices.

---

## Advanced Deployment Steps
### Using AWS Amplify for Full Deployment:
1. Install Amplify CLI: `npm install -g @aws-amplify/cli`.
2. Initialize: `amplify init` and follow prompts.
3. Add services: `amplify add api` and `amplify add function` for Lambda.
4. Push changes: `amplify push`.

### Post-Deployment Verification
- Access the app at your hosted URL (e.g., `your-app-name.amplifyapp.com`).
- Verify AWS resources in the console (e.g., check DynamoDB tables for sample data).

**Note**: Ensure all environment variables are set for production.

---

## Detailed Deployment Steps
### Step 1: Prerequisites Verification
- Ensure AWS CLI is configured: Run `aws configure` to set up your credentials.
- Install necessary tools: `npm install -g @aws-amplify/cli aws-cdk` for Amplify and CDK support.

### Step 2: Services Deployment with AWS SAM
- Build your SAM template: `sam build` in the src/lambda directory.
- Deploy: `sam deploy --guided` and input parameters like stack name and region.
- Verify resources: Check AWS Console for API Gateway endpoints, Lambda functions, and DynamoDB tables.

### Step 3: Frontend Deployment with Amplify
- Initialize Amplify: `amplify init`.
- Add services: `amplify add hosting` and `amplify add api`.
- Publish: `amplify publish` to deploy to a global CDN.

### Step 4: Environment Variables and Security
- Set up .env file with keys like REACT_APP_API_ENDPOINT.
- Configure IAM roles for Lambda to access S3 and DynamoDB.

### Step 5: Testing and Verification
- Test endpoints: Use tools like Postman to call API Gateway.
- Monitor: Use AWS CloudWatch for logs and errors.

## Troubleshooting Common Issues
- **API Gateway Errors**: Check CloudWatch logs for Lambda invocation errors; ensure IAM roles have the necessary permissions for S3 and DynamoDB.
- **Deployment Failures**: If `amplify publish` fails, verify your AWS credentials and region settings.
- **Environment Variable Issues**: Use `echo $ENV_VAR` to confirm variables are set; update .env file and rebuild.

### Step 6: Scaling and Monitoring
- Set up auto-scaling for Lambda functions via AWS Console.
- Use CloudWatch for monitoring metrics like invocation counts and errors.
- Enable alarms for high error rates.

### Step 7: Custom Domain Setup
- In Amplify Console, add a custom domain and configure SSL for secure access.

---

## Best Practices for Deployment
- Use environment-specific configurations (e.g., separate .env files for dev and prod).
- Automate deployments with CI/CD tools like GitHub Actions or AWS CodePipeline.
- Regularly update dependencies in package.json to avoid vulnerabilities.

## Resource References
- AWS Documentation: Refer to AWS Amplify and SAM guides for detailed API references.
- Project Files: Cross-reference with template.yaml for resource definitions and src/lambda/documentAnalysis.js for Lambda specifics.

### Final Verification
- Run smoke tests: Access the app and perform basic operations like login and document upload.
- Clean up: Remove any unused resources in AWS to optimize costs.

**For any questions or issues, please refer to the project README or contact the maintainers.**

## Summary
This guide covers the full deployment process for your Bedrock AI application, from prerequisites to verification, based on React frontend and AWS services components. Refer to this for any future deployments.