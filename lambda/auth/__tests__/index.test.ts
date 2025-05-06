import { APIGatewayProxyEvent } from 'aws-lambda';
import { handler } from '../index';

jest.mock('@aws-sdk/client-cognito-identity-provider', () => ({
  CognitoIdentityProviderClient: jest.fn(() => ({
    send: jest.fn(),
  })),
  InitiateAuthCommand: jest.fn(),
  GetUserCommand: jest.fn(),
}));

jest.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: jest.fn(() => ({
    send: jest.fn(),
  })),
  GetItemCommand: jest.fn(),
  PutItemCommand: jest.fn(),
}));

describe('Auth Lambda', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Login', () => {
    it('should return tokens and user profile on successful login', async () => {
      const event = {
        path: '/auth/login',
        httpMethod: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'password123',
        }),
      } as APIGatewayProxyEvent;

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body)).toHaveProperty('accessToken');
      expect(JSON.parse(result.body)).toHaveProperty('idToken');
      expect(JSON.parse(result.body)).toHaveProperty('refreshToken');
      expect(JSON.parse(result.body)).toHaveProperty('user');
    });

    it('should return 401 on invalid credentials', async () => {
      const event = {
        path: '/auth/login',
        httpMethod: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'wrongpassword',
        }),
      } as APIGatewayProxyEvent;

      const result = await handler(event);

      expect(result.statusCode).toBe(401);
      expect(JSON.parse(result.body)).toHaveProperty('message', 'Invalid credentials');
    });
  });

  describe('Get Profile', () => {
    it('should return user profile with valid token', async () => {
      const event = {
        path: '/auth/profile',
        httpMethod: 'GET',
        headers: {
          Authorization: 'Bearer valid-token',
        },
      } as APIGatewayProxyEvent;

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body)).toHaveProperty('id');
      expect(JSON.parse(result.body)).toHaveProperty('email');
      expect(JSON.parse(result.body)).toHaveProperty('name');
      expect(JSON.parse(result.body)).toHaveProperty('role');
      expect(JSON.parse(result.body)).toHaveProperty('tenantId');
    });

    it('should return 401 without token', async () => {
      const event = {
        path: '/auth/profile',
        httpMethod: 'GET',
        headers: {},
      } as APIGatewayProxyEvent;

      const result = await handler(event);

      expect(result.statusCode).toBe(401);
      expect(JSON.parse(result.body)).toHaveProperty('message', 'Unauthorized');
    });
  });

  describe('Update Profile', () => {
    it('should update user profile with valid token', async () => {
      const event = {
        path: '/auth/profile',
        httpMethod: 'PUT',
        headers: {
          Authorization: 'Bearer valid-token',
        },
        body: JSON.stringify({
          name: 'Updated Name',
        }),
      } as APIGatewayProxyEvent;

      const result = await handler(event);

      expect(result.statusCode).toBe(200);
      expect(JSON.parse(result.body)).toHaveProperty('name', 'Updated Name');
      expect(JSON.parse(result.body)).toHaveProperty('updatedAt');
    });

    it('should return 401 without token', async () => {
      const event = {
        path: '/auth/profile',
        httpMethod: 'PUT',
        headers: {},
        body: JSON.stringify({
          name: 'Updated Name',
        }),
      } as APIGatewayProxyEvent;

      const result = await handler(event);

      expect(result.statusCode).toBe(401);
      expect(JSON.parse(result.body)).toHaveProperty('message', 'Unauthorized');
    });
  });
}); 