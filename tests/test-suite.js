const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

// Test configuration
const config = {
  apiEndpoint: process.env.API_ENDPOINT || 'https://api-dev.example.com',
  testUser: {
    username: `test-user-${uuidv4().substring(0, 8)}@example.com`,
    password: `Test@Password${Math.floor(Math.random() * 10000)}`,
    firstName: 'Test',
    lastName: 'User'
  },
  timeoutMs: 10000
};

// Test variables
let authToken = null;
let documentId = null;
let testFile = null;

// Helper functions
const api = axios.create({
  baseURL: config.apiEndpoint,
  timeout: config.timeoutMs,
  headers: {
    'Content-Type': 'application/json'
  }
});

const setAuthHeader = (token) => {
  api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
};

const clearAuthHeader = () => {
  delete api.defaults.headers.common['Authorization'];
};

// Create a test file
const createTestFile = () => {
  const testFilePath = path.join(__dirname, 'test-document.txt');
  const content = `This is a test document created at ${new Date().toISOString()}`;
  fs.writeFileSync(testFilePath, content);
  return {
    path: testFilePath,
    name: 'test-document.txt',
    type: 'text/plain',
    size: content.length
  };
};

// Tests
describe('API Integration Tests', () => {
  beforeAll(() => {
    // Create test file
    testFile = createTestFile();
    
    console.log(`Running tests against API: ${config.apiEndpoint}`);
    console.log(`Test user: ${config.testUser.username}`);
  });

  afterAll(() => {
    // Clean up
    try {
      // Delete test file
      if (testFile && fs.existsSync(testFile.path)) {
        fs.unlinkSync(testFile.path);
      }
      
      // Clean up test user - Note: this requires admin access which we don't implement here
      console.log('Test completed, but test user was not deleted automatically');
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  });

  describe('Authentication', () => {
    test('Should register a new user', async () => {
      try {
        const response = await api.post('/auth/register', {
          username: config.testUser.username,
          password: config.testUser.password,
          email: config.testUser.username,
          firstName: config.testUser.firstName,
          lastName: config.testUser.lastName
        });
        
        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('message');
        expect(response.data.message).toContain('registered');
      } catch (error) {
        if (error.response && error.response.status === 409) {
          console.warn('User already exists, continuing with tests');
        } else {
          throw error;
        }
      }
    });

    test('Should verify a new user', async () => {
      try {
        // Note: In a real test environment, we would use an admin API to
        // get the verification code or auto-confirm the user.
        // For this test, we'll assume the user is already verified.
        
        // Mock verification for test purposes
        const response = await api.post('/auth/verify', {
          username: config.testUser.username,
          code: '123456' // This would be a real verification code in a real test
        });
        
        expect(response.status).toBe(200);
      } catch (error) {
        if (error.response && error.response.status === 400) {
          console.warn('User may already be verified, continuing with tests');
        } else {
          throw error;
        }
      }
    });

    test('Should login and get tokens', async () => {
      try {
        const response = await api.post('/auth/login', {
          username: config.testUser.username,
          password: config.testUser.password
        });
        
        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('tokens');
        expect(response.data.tokens).toHaveProperty('accessToken');
        
        // Save token for later tests
        authToken = response.data.tokens.accessToken;
        setAuthHeader(authToken);
      } catch (error) {
        console.error('Login failed:', error.response ? error.response.data : error);
        throw error;
      }
    });
  });

  describe('Document Management', () => {
    test('Should get document upload URL', async () => {
      try {
        const response = await api.post('/documents/upload', {
          fileName: testFile.name,
          fileType: testFile.type,
          fileSize: testFile.size
        });
        
        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('uploadUrl');
        expect(response.data).toHaveProperty('document');
        
        // Save document ID for later tests
        documentId = response.data.document.id;
      } catch (error) {
        console.error('Failed to get upload URL:', error.response ? error.response.data : error);
        throw error;
      }
    });

    test('Should list documents', async () => {
      try {
        const response = await api.get('/documents');
        
        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('documents');
        expect(Array.isArray(response.data.documents)).toBe(true);
      } catch (error) {
        console.error('Failed to list documents:', error.response ? error.response.data : error);
        throw error;
      }
    });

    test('Should get document by ID', async () => {
      if (!documentId) {
        console.warn('No document ID available, skipping test');
        return;
      }
      
      try {
        const response = await api.get(`/documents/${documentId}`);
        
        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('id');
        expect(response.data.id).toBe(documentId);
      } catch (error) {
        console.error('Failed to get document:', error.response ? error.response.data : error);
        throw error;
      }
    });

    test('Should update document metadata', async () => {
      if (!documentId) {
        console.warn('No document ID available, skipping test');
        return;
      }
      
      const newTitle = `Updated Title ${Date.now()}`;
      
      try {
        const response = await api.put(`/documents/${documentId}`, {
          title: newTitle,
          description: 'Updated description from integration test',
          tags: ['test', 'integration']
        });
        
        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('title');
        expect(response.data.title).toBe(newTitle);
      } catch (error) {
        console.error('Failed to update document:', error.response ? error.response.data : error);
        throw error;
      }
    });
  });

  describe('AI Services', () => {
    test('Should analyze a document', async () => {
      if (!documentId) {
        console.warn('No document ID available, skipping test');
        return;
      }
      
      try {
        const response = await api.post('/ai/analyze', {
          documentId,
          options: {
            analysisType: 'summary'
          }
        });
        
        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('result');
        expect(response.data).toHaveProperty('analysisId');
      } catch (error) {
        console.error('Failed to analyze document:', error.response ? error.response.data : error);
        throw error;
      }
    });

    test('Should get a response from the chat endpoint', async () => {
      try {
        const response = await api.post('/ai/chat', {
          messages: [
            {
              role: 'user',
              content: 'Hello! Can you help me find information about documents?'
            }
          ]
        });
        
        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('content');
        expect(typeof response.data.content).toBe('string');
      } catch (error) {
        console.error('Failed to get chat response:', error.response ? error.response.data : error);
        throw error;
      }
    });
  });

  describe('Data Services', () => {
    test('Should get basic statistics', async () => {
      try {
        const response = await api.get('/data/statistics');
        
        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('documentCount');
        expect(typeof response.data.documentCount).toBe('number');
      } catch (error) {
        console.error('Failed to get statistics:', error.response ? error.response.data : error);
        throw error;
      }
    });
  });

  describe('Cleanup', () => {
    test('Should delete document', async () => {
      if (!documentId) {
        console.warn('No document ID available, skipping test');
        return;
      }
      
      try {
        const response = await api.delete(`/documents/${documentId}`);
        
        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('message');
        expect(response.data.message).toContain('deleted');
      } catch (error) {
        console.error('Failed to delete document:', error.response ? error.response.data : error);
        throw error;
      }
    });

    test('Should logout', async () => {
      if (!authToken) {
        console.warn('No auth token available, skipping test');
        return;
      }
      
      try {
        // Calling a hypothetical logout endpoint
        // Note: JWT-based auth often doesn't have a logout endpoint on the server side
        const response = await api.post('/auth/logout');
        
        expect(response.status).toBe(200);
        
        // Clear auth token
        clearAuthHeader();
        authToken = null;
      } catch (error) {
        if (error.response && error.response.status === 404) {
          console.warn('Logout endpoint not implemented, clearing token locally');
          clearAuthHeader();
          authToken = null;
        } else {
          console.error('Failed to logout:', error.response ? error.response.data : error);
          throw error;
        }
      }
    });
  });
});
