# Bedrock AI Lambda Functions

This directory contains the AWS Lambda functions for the Bedrock AI backend. The functions are written in TypeScript and use the AWS SDK v3.

## Functions

### Auth Function (`auth/index.ts`)
Handles user authentication using Amazon Cognito. Provides endpoints for:
- Login
- Token validation
- User profile management

### Document Function (`document/index.ts`)
Manages document storage and retrieval using Amazon S3 and DynamoDB. Provides endpoints for:
- Document upload/download
- Document metadata management
- Document listing and filtering

### Analysis Function (`analysis/index.ts`)
Processes documents using Amazon Bedrock. Provides endpoints for:
- Document analysis initiation
- Analysis status checking
- Analysis result retrieval

## Setup

1. Install dependencies:
```bash
cd auth && npm install
cd ../document && npm install
cd ../analysis && npm install
```

2. Configure environment variables:
```bash
# auth/.env
USER_POOL_ID=your-cognito-user-pool-id
CLIENT_ID=your-cognito-client-id

# document/.env
DOCUMENTS_TABLE=your-dynamodb-table
DOCUMENTS_BUCKET=your-s3-bucket

# analysis/.env
ANALYSIS_TABLE=your-dynamodb-table
DOCUMENTS_TABLE=your-dynamodb-table
DOCUMENTS_BUCKET=your-s3-bucket
BEDROCK_MODEL_ID=your-bedrock-model-id
```

3. Build the functions:
```bash
cd auth && npm run build
cd ../document && npm run build
cd ../analysis && npm run build
```

4. Deploy using AWS SAM or CloudFormation:
```bash
sam build
sam deploy
```

## API Endpoints

### Auth API
- `POST /auth/login` - User login
- `GET /auth/profile` - Get user profile
- `PUT /auth/profile` - Update user profile

### Document API
- `GET /documents` - List documents
- `POST /documents` - Upload document
- `GET /documents/{documentId}` - Get document
- `PUT /documents/{documentId}` - Update document
- `DELETE /documents/{documentId}` - Delete document

### Analysis API
- `POST /analysis` - Start document analysis
- `GET /analysis/{analysisId}` - Get analysis status and results

## Security

All endpoints are protected by Amazon Cognito authentication. The API Gateway validates the JWT token and passes the user's tenant ID to the Lambda functions.

## Error Handling

All functions follow a consistent error handling pattern:
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 500: Internal Server Error

## Logging

All functions use CloudWatch Logs for logging. Logs include:
- Request details
- Error information
- Performance metrics

## Monitoring

The functions are monitored using:
- CloudWatch Metrics
- X-Ray tracing
- CloudWatch Alarms

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 