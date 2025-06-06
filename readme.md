# AWS Bedrock for AI-powered document analysis and processing

A serverless multi-tier application leveraging AWS Bedrock for AI-powered document analysis and processing.

## Architecture Overview

The application is built using a multi-layered architecture:

## System Architecture Diagram

![System Architecture Diagram](screens/architecture.png)

This diagram illustrates the complete serverless architecture including all the layers described above, their interactions, and data flows.

### Client Layer
- **Web Application** - Built with React.js
- **Third-Party Systems** - API integration capabilities

### API Layer
- **Amazon API Gateway** - Main entry point for API requests
- **AWS WAF** - Web Application Firewall for security
- **Amazon CloudFront** - Content delivery and caching

### Authentication Layer
- **Amazon Cognito** - User authentication and authorization
- **AWS IAM** - Identity and access management
- **Enterprise IAP** - Enterprise identity provider integration (SAML/OIDC)

### Application Layer
- **Application Lambdas** - Core business logic
- **AWS Step Functions** - Workflow orchestration
- **Amazon EventBridge** - Event-driven architecture

### Data Storage Layer
- **Amazon DynamoDB** - NoSQL database
- **Amazon RDS** - Relational database
- **Amazon S3** - Document storage

### Data Processing Layer
- **S3 Data Processing** - ETL processes
- **Vector Embedding Lambdas** - AI/ML processing
- **Amazon OpenSearch** - Vector database for AI/search
- **Data Transformation Lambdas** - Data formatting and transformation

### Amazon Bedrock Layer
- **Knowledge Bases** - Foundation for AI capabilities
- **Agents** - Intelligent automation
- **Guardrails** - Safety and compliance
- **Foundation Models** - Claude 3, Titan, etc.

### Monitoring & Observability
- **Amazon CloudWatch** - Metrics and logs
- **AWS X-Ray** - Distributed tracing
- **AWS CloudTrail** - API activity tracking
- **Amazon QuickSight** - Business intelligence

### Security Layer
- **AWS KMS** - Key management
- **AWS Secrets Manager** - Secure secrets storage
- **AWS Security Hub** - Security posture management
- **Amazon VPC** - Network isolation

## Application Visualizations

This repository includes comprehensive visualizations of the application interfaces and user experiences:

### 1. User Dashboard (Web Interface)

![ Dashboard Web Interface](screens/dashboard-svg.svg)

The web dashboard presents a branded interface for THOUTAM Corporation featuring:

- **Brand Identity**: Utilizes THOUTAM's primary color (#0052CC) throughout the interface

- **Pending Approvals**:
  - 3 contracts awaiting legal review
  - 2 reports pending executive approval
  - 5 documents requiring compliance verification

- **Recent AI Analyses**:
  - Contract risk assessment
  - Market trend analysis
  - Regulatory compliance check
  - Competitive intelligence summary

### 2. Document Viewer with AI Analysis

![Document Viewer with AI Analysis](screens/document-viewer-svg.svg)

The document viewer integrates intelligent analysis capabilities:

- **Document Display**: Full contract text with section navigation
- **AI Analysis Panel**:
  ```
  SUMMARY
  This agreement outlines the terms of service between THOUTAM Corporation 
  and the client, including service level requirements, payment terms, 
  confidentiality provisions, and termination conditions.
  ```

- **Key Terms**:
  - Term: 24 months with auto-renewal
  - Payment: Net 30 days
  - Early termination fee: 20% of remaining contract value
  - Confidentiality: 5-year NDA from termination

- **Document Metadata**:
  - Created: May 1, 2025
  - Last modified: May 5, 2025
  - Status: Pending approval
  - Classification: Confidential

- **Action Buttons**:
  - Download
  - Share
  - Request approval
  - Run AI analysis

### 3. AI Assistant Chat Interface

![AI Assistant Chat Interface](screens/ai-assistant-svg.svg)

The AI assistant provides contextual document support:

- **Conversation History**:
  - Contract review
  - Marketing strategy
  - Competitor analysis
  - Regulatory inquiries

- **Chat Transcript Example**:
  ```
  User: What are the key terms in the THOUTAM Services Agreement?
  
  AI: Based on the THOUTAM Services Agreement, the key terms include:
  - 24-month contract term with automatic renewal
  - Net 30 payment terms with 1.5% late fee
  - 99.9% uptime SLA with service credits
  - 60-day termination notice required
  
  Would you like me to explain any of these terms in more detail?
  ```

- **Source Citations**:
  - Reference to document section 3.2
  - Link to full agreement
  - Reference to previous version changes

- **Document Summary Cards**:
  - Quick reference cards for mentioned documents
  - Highlighted relevant sections
  - Direct links to document viewers


### 4. Admin Dashboard (Multi-Tenant View)

![Admin Dashboard Multi-Tenant View](screens/admin-dashboard-svg.svg)

The admin interface provides system-wide management:

- **System Health Metrics**:
  - API response time: 87ms avg
  - Function invocations: 12.5M daily
  - Error rate: 0.02%
  - Current system load: 42%

- **Usage Analytics**:
  - Peak usage periods
  - Function execution distribution
  - Storage growth trends
  - Cost optimization recommendations

- **Tenant Management**:
  - Provisioning controls
  - Quota management
  - Authentication settings
  - Compliance reporting

## Implementation Considerations

The visualization highlights several important implementation details:

- **Responsive Design**: All interfaces adapt to different screen sizes and orientations
- **Tenant Isolation**: Multi-tenant architecture with strict data separation
- **Serverless Scaling**: Automatic scaling based on demand patterns
- **Cost Optimization**: Resource utilization tracking and optimization
- **Security Controls**: Role-based access control and data encryption

## Prerequisites

* AWS Account with appropriate permissions
* AWS CLI installed and configured
* Node.js (v18 or later)
* AWS SAM CLI
* Docker (for local testing)

## Setup Instructions

1. Clone this repository
```
git clone <repository-url>
cd <repository-directory>
```

2. Install dependencies
```
npm install
```

3. Deploy the infrastructure
```
npm run deploy
```

4. Configure the application
```
npm run configure
```

## Development

### Local Development
For local development and testing:
```
npm run dev
```

### Testing
To run tests:
```
npm test
```

### Deployment
To deploy to AWS:
```
npm run deploy
```

## Documentation

For detailed documentation about each component, refer to the `/docs` directory.

## Security Considerations

This application implements security best practices including:
- Least privilege access
- Encryption at rest and in transit
- Input validation and sanitization
- Cross-origin resource sharing (CORS) configuration
- Regular dependency updates
- AWS WAF protection

## Next Steps

Based on these visualizations and architecture, recommended next steps include:

1. Detailed component specification
2. API design and documentation
3. Security architecture review
4. Development environment setup
5. CI/CD pipeline configuration

## License

This project is licensed under the MIT License - see the LICENSE file for details.
