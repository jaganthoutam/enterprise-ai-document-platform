const { BedrockRuntime } = require('@aws-sdk/client-bedrock-runtime');
const { Client } = require('@opensearch-project/opensearch');

const bedrock = new BedrockRuntime();
const client = new Client({ node: process.env.OPENSEARCH_ENDPOINT });
const OPENSEARCH_INDEX = process.env.OPENSEARCH_INDEX || 'documents';

exports.handler = async (event) => {
  try {
    const { httpMethod, path, body } = event;
    if (httpMethod === 'POST' && path === '/search') {
      const { query, topK = 5 } = JSON.parse(body);
      // 1. Generate embedding for the query using Bedrock
      const embeddingResponse = await bedrock.invokeModel({
        modelId: 'amazon.titan-embed-text-v1',
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify({ inputText: query }),
      });
      const embedding = JSON.parse(embeddingResponse.body.toString()).embedding;
      // 2. Search OpenSearch using k-NN vector search
      const osResult = await client.search({
        index: OPENSEARCH_INDEX,
        size: topK,
        body: {
          query: {
            knn: {
              embedding: {
                vector: embedding,
                k: topK,
              },
            },
          },
        },
      });
      // 3. Return top documents
      const hits = osResult.body.hits.hits.map((hit) => ({
        id: hit._id,
        score: hit._score,
        ...hit._source,
      }));
      return response(200, { results: hits });
    }
    if (httpMethod === 'POST' && path === '/index') {
      // Index a document with embedding
      const { id, userId, title, description, tags, text, embedding, createdAt, updatedAt } = JSON.parse(body);
      await client.index({
        index: OPENSEARCH_INDEX,
        id,
        body: {
          id,
          userId,
          title,
          description,
          tags,
          text,
          embedding,
          createdAt,
          updatedAt,
        },
      });
      return response(200, { success: true });
    }
    return response(400, { error: 'Unsupported operation' });
  } catch (error) {
    console.error('Error in OpenSearch Lambda:', error);
    return response(500, { error: error.message });
  }
};

function response(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  };
} 