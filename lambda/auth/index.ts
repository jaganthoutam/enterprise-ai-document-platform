import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { CognitoIdentityProviderClient, InitiateAuthCommand, GetUserCommand } from '@aws-sdk/client-cognito-identity-provider';
import { DynamoDBClient, GetItemCommand, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';

const cognito = new CognitoIdentityProviderClient({});
const dynamo = new DynamoDBClient({});

interface LoginRequest {
  email: string;
  password: string;
}

interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: string;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
}

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const path = event.path;
    const method = event.httpMethod;

    if (path === '/auth/login' && method === 'POST') {
      return await handleLogin(event);
    } else if (path === '/auth/profile' && method === 'GET') {
      return await handleGetProfile(event);
    } else if (path === '/auth/profile' && method === 'PUT') {
      return await handleUpdateProfile(event);
    }

    return {
      statusCode: 404,
      body: JSON.stringify({ message: 'Not found' }),
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal server error' }),
    };
  }
};

async function handleLogin(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const { email, password } = JSON.parse(event.body || '{}') as LoginRequest;

  try {
    const authResponse = await cognito.send(new InitiateAuthCommand({
      AuthFlow: 'USER_PASSWORD_AUTH',
      ClientId: process.env.USER_POOL_CLIENT_ID,
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password,
      },
    }));

    const userResponse = await cognito.send(new GetUserCommand({
      AccessToken: authResponse.AuthenticationResult?.AccessToken,
    }));

    const userProfile = await getUserProfile(userResponse.Username || '');

    return {
      statusCode: 200,
      body: JSON.stringify({
        accessToken: authResponse.AuthenticationResult?.AccessToken,
        idToken: authResponse.AuthenticationResult?.IdToken,
        refreshToken: authResponse.AuthenticationResult?.RefreshToken,
        user: userProfile,
      }),
    };
  } catch (error) {
    console.error('Login error:', error);
    return {
      statusCode: 401,
      body: JSON.stringify({ message: 'Invalid credentials' }),
    };
  }
}

async function handleGetProfile(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const accessToken = event.headers.Authorization?.split(' ')[1];
  if (!accessToken) {
    return {
      statusCode: 401,
      body: JSON.stringify({ message: 'Unauthorized' }),
    };
  }

  try {
    const userResponse = await cognito.send(new GetUserCommand({
      AccessToken: accessToken,
    }));

    const userProfile = await getUserProfile(userResponse.Username || '');

    return {
      statusCode: 200,
      body: JSON.stringify(userProfile),
    };
  } catch (error) {
    console.error('Get profile error:', error);
    return {
      statusCode: 401,
      body: JSON.stringify({ message: 'Unauthorized' }),
    };
  }
}

async function handleUpdateProfile(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const accessToken = event.headers.Authorization?.split(' ')[1];
  if (!accessToken) {
    return {
      statusCode: 401,
      body: JSON.stringify({ message: 'Unauthorized' }),
    };
  }

  try {
    const userResponse = await cognito.send(new GetUserCommand({
      AccessToken: accessToken,
    }));

    const userId = userResponse.Username;
    const updates = JSON.parse(event.body || '{}') as Partial<UserProfile>;

    const currentProfile = await getUserProfile(userId || '');
    const updatedProfile = {
      ...currentProfile,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    await dynamo.send(new PutItemCommand({
      TableName: process.env.DYNAMODB_TABLE,
      Item: marshall(updatedProfile),
    }));

    return {
      statusCode: 200,
      body: JSON.stringify(updatedProfile),
    };
  } catch (error) {
    console.error('Update profile error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Failed to update profile' }),
    };
  }
}

async function getUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const result = await dynamo.send(new GetItemCommand({
      TableName: process.env.DYNAMODB_TABLE,
      Key: marshall({ id: userId }),
    }));

    if (!result.Item) {
      return null;
    }

    return unmarshall(result.Item) as UserProfile;
  } catch (error) {
    console.error('Get user profile error:', error);
    return null;
  }
} 