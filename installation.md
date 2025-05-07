# Installation & Deployment Guide

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

## 5. Deploy Backend (Lambdas, DynamoDB, S3, API Gateway)

You can use AWS SAM, CDK, or the AWS Console to deploy the backend.

### Example with AWS SAM:
```sh
cd backend
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
    /api         # API client files for backend endpoints
    /pages       # React pages (AI Assistant, Users, Tenants, etc.)
    /components  # Shared UI components (StatusChip, ConfirmDialog, etc.)
    /tests       # (Recommended) Automated tests
  /public        # Static assets
  /backend/      # Lambda functions, infra templates
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

**For any questions or issues, please refer to the project README or contact the maintainers.** 