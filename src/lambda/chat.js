const AWS = require('aws-sdk');
const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');
const { OpenSearchClient } = require('@opensearch-project/opensearch');
const { AwsSigv4Signer } = require('@opensearch-project/opensearch/aws');
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');

// Initialize AWS clients
const dynamoDB = new AWS.DynamoDB.DocumentClient();
const bedrock = new BedrockRuntimeClient();
const secretsManager = new SecretsManagerClient();

// Initialize OpenSearch client
let opensearchClient;

// Environment variables
const CHAT_HISTORY_TABLE = process.env.CHAT_HISTORY_TABLE;
const ANALYSIS_TABLE = process.env.ANALYSIS_TABLE;
const DOCUMENTS_TABLE = process.env.DOCUMENTS_TABLE;
const OPENSEARCH_ENDPOINT = process.env.OPENSEARCH_ENDPOINT;
const SECRETS_ARN = process.env.SECRETS_ARN;

// Initialize OpenSearch client with AWS credentials
async function initOpenSearchClient() {
  if (!opensearchClient) {
    const credentials = AWS.config.credentials;
    const signer = new AwsSigv4Signer({
      region: AWS.config.region,
      credentials: {
        accessKeyId: credentials.accessKeyId,
        secretAccessKey: credentials.secretAccessKey,
        sessionToken: credentials.sessionToken
      }
    });
    
    opensearchClient = new OpenSearchClient({
      ...signer.getClient(),
      node: `https://${OPENSEARCH_ENDPOINT}`
    });
  }
  return opensearchClient;
}

// Get secrets from Secrets Manager
async function getSecrets() {
  const command = new GetSecretValueCommand({
    SecretId: SECRETS_ARN
  });
  
  const response = await secretsManager.send(command);
  return JSON.parse(response.SecretString);
}

// Generate embeddings using Bedrock
async function generateEmbeddings(text) {
  const modelId = 'amazon.titan-embed-text-v1';
  
  const input = {
    inputText: text
  };
  
  const command = new InvokeModelCommand({
    modelId,
    body: JSON.stringify(input)
  });
  
  const response = await bedrock.send(command);
  const responseBody = JSON.parse(new TextDecoder().decode(response.body));
  
  return responseBody.embedding;
}

// Search for relevant documents in OpenSearch
async function searchRelevantDocuments(query, userId, tenantId, limit = 5) {
  const opensearch = await initOpenSearchClient();
  
  // Generate query embedding
  const queryEmbedding = await generateEmbeddings(query);
  
  // Search using vector similarity
  const response = await opensearch.search({
    index: 'documents',
    body: {
      size: limit,
      query: {
        bool: {
          must: [
            {
              script_score: {
                query: { match_all: {} },
                script: {
                  source: "cosineSimilarity(params.query_vector, 'embedding') + 1.0",
                  params: { query_vector: queryEmbedding }
                }
              }
            },
            {
              term: { tenantId }
            }
          ],
          filter: [
            {
              term: { userId }
            }
          ]
        }
      }
    }
  });
  
  return response.body.hits.hits.map(hit => ({
    documentId: hit._source.documentId,
    fileName: hit._source.fileName,
    text: hit._source.text,
    score: hit._score
  }));
}

// Get chat history
async function getChatHistory(userId, tenantId, limit = 10) {
  const params = {
    TableName: CHAT_HISTORY_TABLE,
    KeyConditionExpression: 'userId = :userId AND tenantId = :tenantId',
    ExpressionAttributeValues: {
      ':userId': userId,
      ':tenantId': tenantId
    },
    ScanIndexForward: false,
    Limit: limit
  };
  
  const result = await dynamoDB.query(params).promise();
  return result.Items.reverse();
}

// Store chat message
async function storeChatMessage(userId, tenantId, message, response, metadata = {}) {
  const timestamp = new Date().toISOString();
  const messageId = `${userId}-${tenantId}-${timestamp}`;
  
  const params = {
    TableName: CHAT_HISTORY_TABLE,
    Item: {
      messageId,
      userId,
      tenantId,
      message,
      response,
      metadata,
      createdAt: timestamp
    }
  };
  
  await dynamoDB.put(params).promise();
  return params.Item;
}

// Generate response using Bedrock
async function generateResponse(query, context) {
  const modelId = 'anthropic.claude-3-sonnet-20240229-v1:0';
  
  // Prepare system prompt
  const systemPrompt = `You are an AI assistant that helps users analyze and understand their documents. 
You have access to the following context from the user's documents:
${context}

Use this context to provide accurate and helpful responses to the user's questions.
If the context doesn't contain relevant information, say so and ask for clarification.
Be concise, accurate, and helpful.`;

  // Prepare user prompt
  const userPrompt = query;
  
  const input = {
    anthropic_version: "bedrock-2023-05-31",
    max_tokens: 1000,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: userPrompt
      }
    ]
  };
  
  const command = new InvokeModelCommand({
    modelId,
    body: JSON.stringify(input)
  });
  
  const response = await bedrock.send(command);
  const responseBody = JSON.parse(new TextDecoder().decode(response.body));
  
  return responseBody.content[0].text;
}

// Main handler function
exports.handler = async (event) => {
  try {
    console.log('Event:', JSON.stringify(event));
    
    // Parse request body
    const body = JSON.parse(event.body);
    const { userId, tenantId, message } = body;
    
    // Validate required fields
    if (!userId || !tenantId || !message) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          message: 'Missing required fields'
        })
      };
    }
    
    // Get chat history
    const chatHistory = await getChatHistory(userId, tenantId);
    
    // Search for relevant documents
    const relevantDocuments = await searchRelevantDocuments(message, userId, tenantId);
    
    // Prepare context from relevant documents
    let context = '';
    if (relevantDocuments.length > 0) {
      context = relevantDocuments.map(doc => {
        return `Document: ${doc.fileName}\nContent: ${doc.text.substring(0, 1000)}...`;
      }).join('\n\n');
    } else {
      context = 'No relevant documents found.';
    }
    
    // Generate response
    const response = await generateResponse(message, context);
    
    // Store chat message
    const chatMessage = await storeChatMessage(userId, tenantId, message, response, {
      relevantDocuments: relevantDocuments.map(doc => ({
        documentId: doc.documentId,
        fileName: doc.fileName,
        score: doc.score
      }))
    });
    
    // Return success response
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        message: 'Chat message processed successfully',
        response,
        messageId: chatMessage.messageId,
        relevantDocuments: relevantDocuments.map(doc => ({
          documentId: doc.documentId,
          fileName: doc.fileName,
          score: doc.score
        }))
      })
    };
  } catch (error) {
    console.error('Error:', error);
    
    // Return error response
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        message: 'Error processing chat message',
        error: error.message
      })
    };
  }
}; 