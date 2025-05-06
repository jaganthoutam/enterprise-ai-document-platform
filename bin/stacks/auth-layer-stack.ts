import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { BaseStack, BaseStackProps } from './base-stack';

export class AuthLayerStack extends BaseStack {
  public readonly userPool: cdk.aws_cognito.UserPool;
  public readonly userPoolClient: cdk.aws_cognito.UserPoolClient;
  public readonly identityPool: cdk.aws_cognito.CfnIdentityPool;
  public readonly authenticatedRole: cdk.aws_iam.Role;
  public readonly unauthenticatedRole: cdk.aws_iam.Role;

  constructor(scope: Construct, id: string, props: BaseStackProps) {
    super(scope, id, props);

    // Create Cognito User Pool
    this.userPool = new cdk.aws_cognito.UserPool(this, 'UserPool', {
      userPoolName: `${props.projectName}-${props.stage}-user-pool`,
      selfSignUpEnabled: true,
      signInAliases: {
        email: true,
        username: true,
      },
      autoVerify: {
        email: true,
        phone: true,
      },
      standardAttributes: {
        email: {
          required: true,
          mutable: true,
        },
        givenName: {
          required: true,
          mutable: true,
        },
        familyName: {
          required: true,
          mutable: true,
        },
      },
      customAttributes: {
        tenantId: new cdk.aws_cognito.StringAttribute({ mutable: false }),
        role: new cdk.aws_cognito.StringAttribute({ mutable: true }),
      },
      passwordPolicy: {
        minLength: 12,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true,
        tempPasswordValidity: cdk.Duration.days(3),
      },
      accountRecovery: cdk.aws_cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      mfa: cdk.aws_cognito.Mfa.OPTIONAL,
      mfaSecondFactor: {
        sms: false,
        otp: true,
      },
      userInvitation: {
        emailSubject: `Welcome to ${props.projectName}!`,
        emailBody: `Hello {username}, you've been invited to join ${props.projectName}! Your temporary password is {####}`,
        smsMessage: `Hello {username}, your temporary password for ${props.projectName} is {####}`,
      },
      userVerification: {
        emailSubject: `Verify your email for ${props.projectName}`,
        emailBody: 'Thanks for signing up! Your verification code is {####}',
        emailStyle: cdk.aws_cognito.VerificationEmailStyle.CODE,
        smsMessage: `Your verification code for ${props.projectName} is {####}`,
      },
      deviceTracking: {
        challengeRequiredOnNewDevice: true,
        deviceOnlyRememberedOnUserPrompt: true,
      },
    });

    // Create User Pool Domain
    const domain = this.userPool.addDomain('UserPoolDomain', {
      cognitoDomain: {
        domainPrefix: `${props.projectName}-${props.stage}`,
      },
    });

    // Add resource server for scopes
    const resourceServer = this.userPool.addResourceServer('ResourceServer', {
      identifier: `${props.projectName}.${props.stage}.api`,
      scopes: [
        {
          scopeName: 'read',
          scopeDescription: 'Read access',
        },
        {
          scopeName: 'write',
          scopeDescription: 'Write access',
        },
        {
          scopeName: 'admin',
          scopeDescription: 'Admin access',
        },
      ],
    });

    // Create User Pool Client for web app
    this.userPoolClient = this.userPool.addClient('WebAppClient', {
      userPoolClientName: `${props.projectName}-${props.stage}-web-client`,
      generateSecret: false,
      authFlows: {
        userPassword: true,
        userSrp: true,
        adminUserPassword: true,
      },
      oAuth: {
        flows: {
          authorizationCodeGrant: true,
          implicitCodeGrant: true,
        },
        scopes: [
          cdk.aws_cognito.OAuthScope.EMAIL,
          cdk.aws_cognito.OAuthScope.OPENID,
          cdk.aws_cognito.OAuthScope.PROFILE,
          cdk.aws_cognito.OAuthScope.COGNITO_ADMIN,
          cdk.aws_cognito.OAuthScope.custom(`${props.projectName}.${props.stage}.api/read`),
          cdk.aws_cognito.OAuthScope.custom(`${props.projectName}.${props.stage}.api/write`),
        ],
        callbackUrls: [
          `https://${props.projectName}-${props.stage}.example.com/callback`,
          'http://localhost:3000/callback',
        ],
        logoutUrls: [
          `https://${props.projectName}-${props.stage}.example.com/logout`,
          'http://localhost:3000/logout',
        ],
      },
      preventUserExistenceErrors: true,
      refreshTokenValidity: cdk.Duration.days(30),
      accessTokenValidity: cdk.Duration.hours(1),
      idTokenValidity: cdk.Duration.hours(1),
      enableTokenRevocation: true,
      supportedIdentityProviders: [
        cdk.aws_cognito.UserPoolClientIdentityProvider.COGNITO,
      ],
    });

    // Create User Pool Client for mobile app
    const mobileAppClient = this.userPool.addClient('MobileAppClient', {
      userPoolClientName: `${props.projectName}-${props.stage}-mobile-client`,
      generateSecret: false,
      authFlows: {
        userPassword: true,
        userSrp: true,
        adminUserPassword: true,
      },
      oAuth: {
        flows: {
          authorizationCodeGrant: true,
          implicitCodeGrant: true,
        },
        scopes: [
          cdk.aws_cognito.OAuthScope.EMAIL,
          cdk.aws_cognito.OAuthScope.OPENID,
          cdk.aws_cognito.OAuthScope.PROFILE,
          cdk.aws_cognito.OAuthScope.custom(`${props.projectName}.${props.stage}.api/read`),
          cdk.aws_cognito.OAuthScope.custom(`${props.projectName}.${props.stage}.api/write`),
        ],
        callbackUrls: [
          `${props.projectName}:/callback`,
          'exp://localhost:19000/--/callback',
        ],
        logoutUrls: [
          `${props.projectName}:/logout`,
          'exp://localhost:19000/--/logout',
        ],
      },
      preventUserExistenceErrors: true,
      refreshTokenValidity: cdk.Duration.days(30),
      accessTokenValidity: cdk.Duration.hours(1),
      idTokenValidity: cdk.Duration.hours(1),
      enableTokenRevocation: true,
      supportedIdentityProviders: [
        cdk.aws_cognito.UserPoolClientIdentityProvider.COGNITO,
      ],
    });

    // Create Identity Pool for authenticated and unauthenticated access
    this.identityPool = new cdk.aws_cognito.CfnIdentityPool(this, 'IdentityPool', {
      identityPoolName: `${props.projectName}${props.stage}IdentityPool`,
      allowUnauthenticatedIdentities: true,
      cognitoIdentityProviders: [
        {
          clientId: this.userPoolClient.userPoolClientId,
          providerName: this.userPool.userPoolProviderName,
        },
        {
          clientId: mobileAppClient.userPoolClientId,
          providerName: this.userPool.userPoolProviderName,
        },
      ],
    });

    // Create authenticated role
    this.authenticatedRole = new cdk.aws_iam.Role(this, 'AuthenticatedRole', {
      assumedBy: new cdk.aws_iam.FederatedPrincipal(
        'cognito-identity.amazonaws.com',
        {
          StringEquals: {
            'cognito-identity.amazonaws.com:aud': this.identityPool.ref,
          },
          'ForAnyValue:StringLike': {
            'cognito-identity.amazonaws.com:amr': 'authenticated',
          },
        },
        'sts:AssumeRoleWithWebIdentity'
      ),
    });

    // Create unauthenticated role
    this.unauthenticatedRole = new cdk.aws_iam.Role(this, 'UnauthenticatedRole', {
      assumedBy: new cdk.aws_iam.FederatedPrincipal(
        'cognito-identity.amazonaws.com',
        {
          StringEquals: {
            'cognito-identity.amazonaws.com:aud': this.identityPool.ref,
          },
          'ForAnyValue:StringLike': {
            'cognito-identity.amazonaws.com:amr': 'unauthenticated',
          },
        },
        'sts:AssumeRoleWithWebIdentity'
      ),
    });

    // Add minimal permissions to authenticated role
    this.authenticatedRole.addToPrincipalPolicy(
      new cdk.aws_iam.PolicyStatement({
        effect: cdk.aws_iam.Effect.ALLOW,
        actions: [
          'cognito-sync:*',
          'cognito-identity:*',
        ],
        resources: ['*'],
      })
    );

    // Add very limited permissions to unauthenticated role
    this.unauthenticatedRole.addToPrincipalPolicy(
      new cdk.aws_iam.PolicyStatement({
        effect: cdk.aws_iam.Effect.ALLOW,
        actions: [
          'cognito-sync:*',
        ],
        resources: ['*'],
      })
    );

    // Attach roles to Identity Pool
    new cdk.aws_cognito.CfnIdentityPoolRoleAttachment(this, 'IdentityPoolRoleAttachment', {
      identityPoolId: this.identityPool.ref,
      roles: {
        authenticated: this.authenticatedRole.roleArn,
        unauthenticated: this.unauthenticatedRole.roleArn,
      },
      roleMappings: {
        mapping: {
          type: 'Token',
          ambiguousRoleResolution: 'AuthenticatedRole',
          identityProvider: `cognito-idp.${this.region}.amazonaws.com/${this.userPool.userPoolId}:${this.userPoolClient.userPoolClientId}`,
        },
      },
    });

    // Create groups in Cognito with different permission levels
    const adminGroup = new cdk.aws_cognito.CfnUserPoolGroup(this, 'AdminGroup', {
      userPoolId: this.userPool.userPoolId,
      groupName: 'Admins',
      description: 'Administrator group with full access',
      precedence: 0,
    });

    const powerUserGroup = new cdk.aws_cognito.CfnUserPoolGroup(this, 'PowerUserGroup', {
      userPoolId: this.userPool.userPoolId,
      groupName: 'PowerUsers',
      description: 'Power users with elevated access',
      precedence: 1,
    });

    const standardUserGroup = new cdk.aws_cognito.CfnUserPoolGroup(this, 'StandardUserGroup', {
      userPoolId: this.userPool.userPoolId,
      groupName: 'StandardUsers',
      description: 'Standard users with basic access',
      precedence: 2,
    });

    // Create Lambda for Cognito triggers
    const preSignUpLambda = new cdk.aws_lambda.Function(this, 'PreSignUpLambda', {
      runtime: cdk.aws_lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: cdk.aws_lambda.Code.fromInline(`
        exports.handler = async (event) => {
          event.response.autoConfirmUser = true;
          if (event.request.userAttributes.hasOwnProperty('email')) {
            event.response.autoVerifyEmail = true;
          }
          if (event.request.userAttributes.hasOwnProperty('phone_number')) {
            event.response.autoVerifyPhone = true;
          }
          return event;
        };
      `),
      timeout: cdk.Duration.seconds(30),
      description: 'Pre sign-up Lambda for Cognito',
    });

    // Add Lambda as a Cognito trigger
    this.userPool.addTrigger(
      cdk.aws_cognito.UserPoolOperation.PRE_SIGN_UP,
      preSignUpLambda
    );

    // Outputs
    this.createOutput('UserPoolId', this.userPool.userPoolId, 'Cognito User Pool ID');
    this.createOutput('UserPoolClientId', this.userPoolClient.userPoolClientId, 'Cognito User Pool Client ID');
    this.createOutput('IdentityPoolId', this.identityPool.ref, 'Cognito Identity Pool ID');
    this.createOutput('UserPoolDomain', domain.domainName, 'Cognito User Pool Domain');

    // SSM Parameters
    this.createSsmParameter('UserPoolId', this.userPool.userPoolId);
    this.createSsmParameter('UserPoolClientId', this.userPoolClient.userPoolClientId);
    this.createSsmParameter('IdentityPoolId', this.identityPool.ref);
    this.createSsmParameter('UserPoolDomain', domain.domainName);
  }
}
