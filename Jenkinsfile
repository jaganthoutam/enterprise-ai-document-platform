pipeline {
    agent any
    
    environment {
        PROJECT_NAME = 'serverless-multi-tier'
        AWS_REGION = 'us-east-1'
        
        // Use Jenkins credentials for AWS access
        AWS_ACCESS_KEY_ID = credentials('aws-access-key-id')
        AWS_SECRET_ACCESS_KEY = credentials('aws-secret-access-key')
        
        // Node.js setup
        NODE_VERSION = '18'
        
        // Use parameterized build to select environment
        DEPLOY_ENV = "${params.ENVIRONMENT ?: 'dev'}"
        
        // Docker image for AWS CLI and other tools
        DOCKER_IMAGE = 'amazon/aws-cli:latest'
    }
    
    parameters {
        choice(name: 'ENVIRONMENT', choices: ['dev', 'test', 'prod'], description: 'Deployment environment')
        booleanParam(name: 'SKIP_TESTS', defaultValue: false, description: 'Skip test execution')
        booleanParam(name: 'DESTROY_STACK', defaultValue: false, description: 'Destroy CloudFormation stack instead of deploying')
    }
    
    stages {
        stage('Checkout') {
            steps {
                checkout scm
                echo "Checked out code for ${PROJECT_NAME} project, deploying to ${DEPLOY_ENV} environment"
            }
        }
        
        stage('Setup') {
            steps {
                sh 'npm install -g aws-cdk typescript jest'
                sh 'npm install'
                sh 'npm ci'
                
                // Set up AWS CLI
                sh 'aws --version'
                sh 'aws configure set default.region ${AWS_REGION}'
                
                // Environment-specific configuration
                script {
                    if (DEPLOY_ENV == 'prod') {
                        echo "Preparing production deployment"
                        // Load production specific configurations or credentials
                    } else if (DEPLOY_ENV == 'test') {
                        echo "Preparing test deployment"
                    } else {
                        echo "Preparing development deployment"
                    }
                }
            }
        }
        
        stage('Lint') {
            steps {
                sh 'npm run lint || echo "Linting issues found, but continuing"'
            }
        }
        
        stage('Unit Tests') {
            when {
                expression { return !params.SKIP_TESTS }
            }
            steps {
                sh 'npm test'
            }
            post {
                always {
                    junit 'test-results/*.xml'
                }
            }
        }
        
        stage('Integration Tests') {
            when {
                expression { return !params.SKIP_TESTS }
            }
            steps {
                sh 'npm run test:integration || echo "Some integration tests failed, but continuing pipeline"'
            }
            post {
                always {
                    junit 'test-results/integration/*.xml'
                }
            }
        }
        
        stage('Build') {
            steps {
                sh 'npm run build'
                
                // Build Lambda functions
                sh 'cd lambda/auth && npm install && npm run build'
                sh 'cd lambda/users && npm install && npm run build'
                sh 'cd lambda/documents && npm install && npm run build'
                sh 'cd lambda/data-access && npm install && npm run build'
                sh 'cd lambda/ai-service && pip install -r requirements.txt -t .'
            }
        }
        
        stage('Package') {
            steps {
                // Package Lambda functions
                sh 'mkdir -p dist/lambda'
                sh 'zip -r dist/lambda/auth.zip lambda/auth'
                sh 'zip -r dist/lambda/users.zip lambda/users'
                sh 'zip -r dist/lambda/documents.zip lambda/documents'
                sh 'zip -r dist/lambda/data-access.zip lambda/data-access'
                sh 'zip -r dist/lambda/ai-service.zip lambda/ai-service'
                
                // CDK synthesis
                sh 'npm run cdk synth -- -c stage=${DEPLOY_ENV} > dist/template.yaml'
                
                // Archive artifacts
                archiveArtifacts artifacts: 'dist/**/*', fingerprint: true
            }
        }
        
        stage('Security Scan') {
            when {
                expression { return !params.SKIP_TESTS }
            }
            steps {
                // Scan CloudFormation template for security issues
                sh 'npm install -g cfn-nag'
                sh 'cfn_nag_scan --input-path dist/template.yaml || echo "Security issues found, review the output"'
                
                // Scan Node.js dependencies
                sh 'npm audit --audit-level=high || echo "Security issues found in dependencies"'
            }
        }
        
        stage('Deploy Infrastructure') {
            when {
                expression { return !params.DESTROY_STACK }
            }
            steps {
                script {
                    try {
                        // Bootstrap CDK (if not already done)
                        sh 'npm run cdk bootstrap -- -c stage=${DEPLOY_ENV}'
                        
                        // Deploy with CDK
                        sh 'npm run cdk deploy -- -c stage=${DEPLOY_ENV} --all --require-approval never'
                    } catch (Exception e) {
                        echo "Deployment failed: ${e.message}"
                        currentBuild.result = 'FAILURE'
                        error("Deployment failed")
                    }
                }
            }
        }
        
        stage('Deploy Frontend Apps') {
            when {
                expression { return !params.DESTROY_STACK }
            }
            steps {
                script {
                    // Get the CloudFront distribution domain and S3 bucket from outputs
                    def cloudfrontDomain = sh(
                        script: "aws cloudformation describe-stacks --stack-name ${PROJECT_NAME}-${DEPLOY_ENV}-client --query 'Stacks[0].Outputs[?OutputKey==`WebAppUrl`].OutputValue' --output text",
                        returnStdout: true
                    ).trim()
                    
                    def s3Bucket = sh(
                        script: "aws cloudformation describe-stacks --stack-name ${PROJECT_NAME}-${DEPLOY_ENV}-client --query 'Stacks[0].Outputs[?OutputKey==`WebAppBucketName`].OutputValue' --output text",
                        returnStdout: true
                    ).trim()
                    
                    // Build and deploy React web app
                    sh """
                    cd web-client
                    npm install
                    REACT_APP_API_ENDPOINT=${cloudfrontDomain}/api \
                    REACT_APP_ENV=${DEPLOY_ENV} \
                    npm run build
                    
                    aws s3 sync build/ s3://${s3Bucket}/ --delete
                    
                    # Invalidate CloudFront cache
                    aws cloudfront create-invalidation --distribution-id \$(aws cloudfront list-distributions --query "DistributionList.Items[?Aliases.Items!=null] | [?contains(Aliases.Items, '${cloudfrontDomain}')].Id" --output text) --paths "/*"
                    """
                }
            }
        }
        
        stage('Post-Deployment Tests') {
            when {
                expression { return !params.SKIP_TESTS && !params.DESTROY_STACK }
            }
            steps {
                script {
                    def apiEndpoint = sh(
                        script: "aws cloudformation describe-stacks --stack-name ${PROJECT_NAME}-${DEPLOY_ENV}-api --query 'Stacks[0].Outputs[?OutputKey==`ApiEndpoint`].OutputValue' --output text",
                        returnStdout: true
                    ).trim()
                    
                    // Run API smoke tests
                    sh """
                    cd tests
                    API_ENDPOINT=${apiEndpoint} npm run test:api
                    """
                }
            }
        }
        
        stage('Destroy Stack') {
            when {
                expression { return params.DESTROY_STACK }
            }
            steps {
                script {
                    // Confirm before destroying
                    input message: "Are you sure you want to destroy the ${DEPLOY_ENV} environment?", ok: 'Yes, destroy it'
                    
                    // Empty S3 buckets before destruction
                    sh """
                    for bucket in \$(aws cloudformation describe-stack-resources --stack-name ${PROJECT_NAME}-${DEPLOY_ENV}-storage --query "StackResources[?ResourceType=='AWS::S3::Bucket'].PhysicalResourceId" --output text)
                    do
                      echo "Emptying bucket \$bucket"
                      aws s3 rm s3://\$bucket --recursive
                    done
                    """
                    
                    // Destroy all stacks in reverse order
                    sh 'npm run cdk destroy -- -c stage=${DEPLOY_ENV} --all --force'
                }
            }
        }
    }
    
    post {
        always {
            echo 'Cleaning workspace...'
            cleanWs()
        }
        
        success {
            echo 'Pipeline completed successfully!'
            // Send success notification
            mail to: 'team@example.com',
                 subject: "${PROJECT_NAME} Pipeline - Build ${env.BUILD_NUMBER} - SUCCESS",
                 body: "The pipeline completed successfully.\nCheck: ${env.BUILD_URL}"
        }
        
        failure {
            echo 'Pipeline failed!'
            // Send failure notification
            mail to: 'team@example.com',
                 subject: "${PROJECT_NAME} Pipeline - Build ${env.BUILD_NUMBER} - FAILED",
                 body: "The pipeline failed.\nCheck: ${env.BUILD_URL}"
        }
    }
}
