import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { BaseStack, BaseStackProps } from './base-stack';

export interface ApiLayerStackProps extends BaseStackProps {
  readonly vpc: cdk.aws_ec2.Vpc;
  readonly userPool: cdk.aws_cognito.UserPool;
  readonly lambdaFunctions: Record<string, cdk.aws_lambda.Function>;
}

export class ApiLayerStack extends BaseStack {
  public readonly apiGateway: cdk.aws_apigateway.RestApi;
  public readonly apiEndpoint: string;
  public readonly cloudfrontDistribution: cdk.aws_cloudfront.Distribution;

  constructor(scope: Construct, id: string, props: ApiLayerStackProps) {
    super(scope, id, props);

    // Create API Gateway
    this.apiGateway = new cdk.aws_apigateway.RestApi(this, 'ApiGateway', {
      restApiName: `${props.projectName}-${props.stage}-api`,
      description: `API for ${props.projectName} ${props.stage}`,
      endpointTypes: [cdk.aws_apigateway.EndpointType.REGIONAL],
      deployOptions: {
        stageName: props.stage,
        tracingEnabled: true,
        loggingLevel: cdk.aws_apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: true,
        metricsEnabled: true,
      },
      defaultCorsPreflightOptions: {
        allowOrigins: cdk.aws_apigateway.Cors.ALL_ORIGINS, // This will be restricted in production
        allowMethods: cdk.aws_apigateway.Cors.ALL_METHODS,
        allowHeaders: [
          'Content-Type',
          'Authorization',
          'X-Amz-Date',
          'X-Api-Key',
          'X-Amz-Security-Token',
          'X-Amz-User-Agent',
        ],
        maxAge: cdk.Duration.days(1),
      },
      minCompressionSize: cdk.Size.kibibytes(1),
      cloudWatchRole: true,
    });

    // Create Cognito Authorizer
    const cognitoAuthorizer = new cdk.aws_apigateway.CognitoUserPoolsAuthorizer(this, 'CognitoAuthorizer', {
      cognitoUserPools: [props.userPool],
      identitySource: 'method.request.header.Authorization',
    });

    // Create API Gateway Lambda Integration
    const createLambdaIntegration = (functionName: string) => {
      const lambdaFunction = props.lambdaFunctions[functionName];
      if (!lambdaFunction) {
        throw new Error(`Lambda function "${functionName}" not found`);
      }
      
      return new cdk.aws_apigateway.LambdaIntegration(lambdaFunction, {
        proxy: true,
        allowTestInvoke: true,
      });
    };

    // Define API Gateway Resources and Methods
    
    // Auth Resource
    const authResource = this.apiGateway.root.addResource('auth');
    authResource.addMethod('POST', createLambdaIntegration('auth'), {
      apiKeyRequired: false,
      methodResponses: [
        {
          statusCode: '200',
          responseModels: {
            'application/json': cdk.aws_apigateway.Model.EMPTY_MODEL,
          },
        },
        {
          statusCode: '400',
          responseModels: {
            'application/json': cdk.aws_apigateway.Model.ERROR_MODEL,
          },
        },
        {
          statusCode: '401',
          responseModels: {
            'application/json': cdk.aws_apigateway.Model.ERROR_MODEL,
          },
        },
      ],
    });

    // Users Resource
    const usersResource = this.apiGateway.root.addResource('users');
    usersResource.addMethod('GET', createLambdaIntegration('users'), {
      authorizer: cognitoAuthorizer,
      authorizationType: cdk.aws_apigateway.AuthorizationType.COGNITO,
      apiKeyRequired: false,
      methodResponses: [
        {
          statusCode: '200',
          responseModels: {
            'application/json': cdk.aws_apigateway.Model.EMPTY_MODEL,
          },
        },
        {
          statusCode: '403',
          responseModels: {
            'application/json': cdk.aws_apigateway.Model.ERROR_MODEL,
          },
        },
      ],
    });

    const userResource = usersResource.addResource('{userId}');
    userResource.addMethod('GET', createLambdaIntegration('users'), {
      authorizer: cognitoAuthorizer,
      authorizationType: cdk.aws_apigateway.AuthorizationType.COGNITO,
      apiKeyRequired: false,
      methodResponses: [
        {
          statusCode: '200',
          responseModels: {
            'application/json': cdk.aws_apigateway.Model.EMPTY_MODEL,
          },
        },
        {
          statusCode: '404',
          responseModels: {
            'application/json': cdk.aws_apigateway.Model.ERROR_MODEL,
          },
        },
        {
          statusCode: '403',
          responseModels: {
            'application/json': cdk.aws_apigateway.Model.ERROR_MODEL,
          },
        },
      ],
    });

    userResource.addMethod('PUT', createLambdaIntegration('users'), {
      authorizer: cognitoAuthorizer,
      authorizationType: cdk.aws_apigateway.AuthorizationType.COGNITO,
      apiKeyRequired: false,
      methodResponses: [
        {
          statusCode: '200',
          responseModels: {
            'application/json': cdk.aws_apigateway.Model.EMPTY_MODEL,
          },
        },
        {
          statusCode: '400',
          responseModels: {
            'application/json': cdk.aws_apigateway.Model.ERROR_MODEL,
          },
        },
        {
          statusCode: '403',
          responseModels: {
            'application/json': cdk.aws_apigateway.Model.ERROR_MODEL,
          },
        },
      ],
    });

    // Documents Resource
    const documentsResource = this.apiGateway.root.addResource('documents');
    documentsResource.addMethod('GET', createLambdaIntegration('documents'), {
      authorizer: cognitoAuthorizer,
      authorizationType: cdk.aws_apigateway.AuthorizationType.COGNITO,
      apiKeyRequired: false,
      methodResponses: [
        {
          statusCode: '200',
          responseModels: {
            'application/json': cdk.aws_apigateway.Model.EMPTY_MODEL,
          },
        },
        {
          statusCode: '403',
          responseModels: {
            'application/json': cdk.aws_apigateway.Model.ERROR_MODEL,
          },
        },
      ],
    });

    documentsResource.addMethod('POST', createLambdaIntegration('documents'), {
      authorizer: cognitoAuthorizer,
      authorizationType: cdk.aws_apigateway.AuthorizationType.COGNITO,
      apiKeyRequired: false,
      methodResponses: [
        {
          statusCode: '201',
          responseModels: {
            'application/json': cdk.aws_apigateway.Model.EMPTY_MODEL,
          },
        },
        {
          statusCode: '400',
          responseModels: {
            'application/json': cdk.aws_apigateway.Model.ERROR_MODEL,
          },
        },
        {
          statusCode: '403',
          responseModels: {
            'application/json': cdk.aws_apigateway.Model.ERROR_MODEL,
          },
        },
      ],
    });

    const documentResource = documentsResource.addResource('{documentId}');
    documentResource.addMethod('GET', createLambdaIntegration('documents'), {
      authorizer: cognitoAuthorizer,
      authorizationType: cdk.aws_apigateway.AuthorizationType.COGNITO,
      apiKeyRequired: false,
      methodResponses: [
        {
          statusCode: '200',
          responseModels: {
            'application/json': cdk.aws_apigateway.Model.EMPTY_MODEL,
          },
        },
        {
          statusCode: '404',
          responseModels: {
            'application/json': cdk.aws_apigateway.Model.ERROR_MODEL,
          },
        },
        {
          statusCode: '403',
          responseModels: {
            'application/json': cdk.aws_apigateway.Model.ERROR_MODEL,
          },
        },
      ],
    });

    // AI Resource
    const aiResource = this.apiGateway.root.addResource('ai');
    
    const chatResource = aiResource.addResource('chat');
    chatResource.addMethod('POST', createLambdaIntegration('ai'), {
      authorizer: cognitoAuthorizer,
      authorizationType: cdk.aws_apigateway.AuthorizationType.COGNITO,
      apiKeyRequired: false,
      methodResponses: [
        {
          statusCode: '200',
          responseModels: {
            'application/json': cdk.aws_apigateway.Model.EMPTY_MODEL,
          },
        },
        {
          statusCode: '400',
          responseModels: {
            'application/json': cdk.aws_apigateway.Model.ERROR_MODEL,
          },
        },
        {
          statusCode: '403',
          responseModels: {
            'application/json': cdk.aws_apigateway.Model.ERROR_MODEL,
          },
        },
      ],
    });

    const analyzeResource = aiResource.addResource('analyze');
    analyzeResource.addMethod('POST', createLambdaIntegration('ai'), {
      authorizer: cognitoAuthorizer,
      authorizationType: cdk.aws_apigateway.AuthorizationType.COGNITO,
      apiKeyRequired: false,
      methodResponses: [
        {
          statusCode: '200',
          responseModels: {
            'application/json': cdk.aws_apigateway.Model.EMPTY_MODEL,
          },
        },
        {
          statusCode: '400',
          responseModels: {
            'application/json': cdk.aws_apigateway.Model.ERROR_MODEL,
          },
        },
        {
          statusCode: '403',
          responseModels: {
            'application/json': cdk.aws_apigateway.Model.ERROR_MODEL,
          },
        },
      ],
    });

    // Data Resource
    const dataResource = this.apiGateway.root.addResource('data');
    dataResource.addMethod('GET', createLambdaIntegration('data'), {
      authorizer: cognitoAuthorizer,
      authorizationType: cdk.aws_apigateway.AuthorizationType.COGNITO,
      apiKeyRequired: false,
      methodResponses: [
        {
          statusCode: '200',
          responseModels: {
            'application/json': cdk.aws_apigateway.Model.EMPTY_MODEL,
          },
        },
        {
          statusCode: '403',
          responseModels: {
            'application/json': cdk.aws_apigateway.Model.ERROR_MODEL,
          },
        },
      ],
    });

    // Create API Usage Plan
    const apiUsagePlan = this.apiGateway.addUsagePlan('ApiUsagePlan', {
      name: `${props.projectName}-${props.stage}-usage-plan`,
      description: `Usage plan for ${props.projectName} ${props.stage} API`,
      throttle: {
        rateLimit: 10, // requests per second
        burstLimit: 20, // concurrent requests
      },
      quota: {
        limit: 10000, // requests per period
        period: cdk.aws_apigateway.Period.MONTH,
      },
    });

    apiUsagePlan.addApiStage({
      stage: this.apiGateway.deploymentStage,
    });

    // Create CloudFront distribution
    this.cloudfrontDistribution = new cdk.aws_cloudfront.Distribution(this, 'CloudFrontDistribution', {
      defaultBehavior: {
        origin: new cdk.aws_cloudfront_origins.RestApiOrigin(this.apiGateway),
        allowedMethods: cdk.aws_cloudfront.AllowedMethods.ALLOW_ALL,
        cachedMethods: cdk.aws_cloudfront.CachedMethods.CACHE_GET_HEAD,
        cachePolicy: cdk.aws_cloudfront.CachePolicy.CACHING_OPTIMIZED,
        originRequestPolicy: cdk.aws_cloudfront.OriginRequestPolicy.ALL_VIEWER,
        viewerProtocolPolicy: cdk.aws_cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        compress: true,
      },
      priceClass: cdk.aws_cloudfront.PriceClass.PRICE_CLASS_100,
      enableLogging: true,
      logBucket: new cdk.aws_s3.Bucket(this, 'CloudFrontLogBucket', {
        encryption: cdk.aws_s3.BucketEncryption.S3_MANAGED,
        blockPublicAccess: cdk.aws_s3.BlockPublicAccess.BLOCK_ALL,
        enforceSSL: true,
        removalPolicy: cdk.RemovalPolicy.RETAIN,
      }),
      logFilePrefix: 'cloudfront-logs/',
      httpVersion: cdk.aws_cloudfront.HttpVersion.HTTP2_AND_3,
      minimumProtocolVersion: cdk.aws_cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
      defaultRootObject: 'index.html',
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
        },
      ],
    });

    // Create WAF Web ACL association for API Gateway
    const webAclId = this.importSsmParameter(`${props.projectName}-security-${props.stage}`, 'WebAclId');

    new cdk.aws_wafv2.CfnWebACLAssociation(this, 'ApiGatewayWafAssociation', {
      resourceArn: this.apiGateway.deploymentStage.stageArn,
      webAclArn: `arn:aws:wafv2:${this.region}:${this.account}:regional/webacl/${webAclId}`,
    });

    // Outputs
    this.apiEndpoint = this.apiGateway.url;
    this.createOutput('ApiEndpoint', this.apiEndpoint, 'API Gateway endpoint URL');
    this.createOutput('CloudFrontDomain', this.cloudfrontDistribution.distributionDomainName, 'CloudFront domain name');

    // SSM Parameters
    this.createSsmParameter('ApiEndpoint', this.apiEndpoint);
    this.createSsmParameter('CloudFrontDomain', this.cloudfrontDistribution.distributionDomainName);
  }
}