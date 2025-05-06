# Bedrock AI Web Client

A modern web application for document analysis and AI insights, built with React, TypeScript, and AWS services.

## Features

- User authentication with AWS Cognito
- Document management with AWS S3
- AI-powered document analysis
- Real-time chat with WebSocket support
- Admin dashboard for tenant management
- Multi-tenant support
- Modern UI with Ant Design
- Responsive design for all devices

## Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)
- Access to Bedrock AI API

## Environment Variables

Create a `.env` file in the root directory with the following variables:

### API Configuration
```
REACT_APP_API_URL=http://localhost:3000
REACT_APP_WS_URL=ws://localhost:3000
```

### Authentication
```
REACT_APP_GOOGLE_CLIENT_ID=your-google-client-id
```

### AWS Configuration
```
REACT_APP_AWS_REGION=us-east-1
REACT_APP_AWS_USER_POOL_ID=your-user-pool-id
REACT_APP_AWS_USER_POOL_WEB_CLIENT_ID=your-web-client-id
REACT_APP_AWS_IDENTITY_POOL_ID=your-identity-pool-id
REACT_APP_AWS_S3_BUCKET=your-s3-bucket
REACT_APP_AWS_CLOUDFRONT_DOMAIN=your-cloudfront-domain
```

### Analytics and Monitoring
```
REACT_APP_ANALYTICS_ID=your-analytics-id
REACT_APP_SENTRY_DSN=your-sentry-dsn
```

### Application Settings
```
REACT_APP_LOG_LEVEL=debug # Options: debug, info, warn, error
REACT_APP_ENABLE_ANALYTICS=true
REACT_APP_ENABLE_SENTRY=true
REACT_APP_ENABLE_CHAT=true
REACT_APP_ENABLE_ADMIN_DASHBOARD=true
```

### Cache Settings
```
REACT_APP_CACHE_TTL=3600
REACT_APP_MAX_CACHE_SIZE=100
```

### UI Configuration
```
REACT_APP_THEME=light # Options: light, dark, system
REACT_APP_LANGUAGE=en # Options: en, es, fr
REACT_APP_DATE_FORMAT=MM/DD/YYYY
REACT_APP_TIME_FORMAT=HH:mm:ss
```

### API Rate Limiting
```
REACT_APP_API_RATE_LIMIT=100
REACT_APP_API_RATE_WINDOW=60000
```

### Document Settings
```
REACT_APP_MAX_DOCUMENT_SIZE=10485760 # 10MB in bytes
REACT_APP_ALLOWED_DOCUMENT_TYPES=pdf,doc,docx,txt
```

### Security
```
REACT_APP_SESSION_TIMEOUT=3600000 # 1 hour in milliseconds
REACT_APP_MAX_LOGIN_ATTEMPTS=5
REACT_APP_PASSWORD_MIN_LENGTH=8
```

### Notification Settings
```
REACT_APP_ENABLE_PUSH_NOTIFICATIONS=true
REACT_APP_NOTIFICATION_SOUND=true
REACT_APP_NOTIFICATION_DURATION=5000
```

## Setup

1. Clone the repository
```bash
git clone https://github.com/your-username/bedrock-ai.git
cd bedrock-ai/web-client
```

2. Install dependencies
```bash
npm install
```

3. Create environment files
```bash
cp .env.example .env
```
Edit the `.env` file with your configuration values.

4. Start the development server
```bash
npm start
```

## Available Scripts

- `npm start` - Runs the app in development mode
- `npm test` - Launches the test runner
- `npm run build` - Builds the app for production
- `npm run lint` - Runs ESLint
- `npm run lint:fix` - Fixes ESLint errors
- `npm run format` - Formats code with Prettier
- `npm run typecheck` - Runs TypeScript type checking
- `npm run test:coverage` - Runs tests with coverage report
- `npm run test:watch` - Runs tests in watch mode
- `npm run analyze` - Analyzes bundle size

## Project Structure

```
web-client/
├── public/              # Static files
├── src/                 # Source code
│   ├── components/      # React components
│   ├── contexts/        # React contexts
│   ├── hooks/          # Custom hooks
│   ├── services/       # API and utility services
│   ├── styles/         # Global styles
│   ├── types/          # TypeScript types
│   ├── utils/          # Utility functions
│   ├── App.tsx         # Root component
│   └── index.tsx       # Entry point
├── tests/              # Test files
├── .eslintrc.json      # ESLint config
├── .prettierrc         # Prettier config
├── .gitignore         # Git ignore rules
├── package.json       # Dependencies and scripts
├── tsconfig.json      # TypeScript config
└── README.md          # Project documentation
```

## Authentication

The application uses AWS Cognito for authentication. Configure the following in your AWS Console:

1. Create a User Pool
2. Create a User Pool Client
3. Configure OAuth settings
4. Update environment variables with pool details

## API Integration

The application integrates with the Bedrock AI API:

1. Development: Uses local API (`http://localhost:3000`)
2. Production: Uses deployed API (`https://api.yourdomain.com`)
3. WebSocket support for real-time features

## Deployment

1. Build the application:
```bash
npm run build
```

2. Deploy using AWS Amplify:
```bash
amplify push
```

Or deploy manually to your hosting service.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 