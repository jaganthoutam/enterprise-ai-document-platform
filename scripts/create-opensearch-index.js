const { Client } = require('@opensearch-project/opensearch');

const OPENSEARCH_ENDPOINT = process.env.OPENSEARCH_ENDPOINT;
const OPENSEARCH_INDEX = process.env.OPENSEARCH_INDEX || 'documents';
const VECTOR_DIM = 1536; // Titan/Cohere output dimension

const client = new Client({ node: OPENSEARCH_ENDPOINT });

async function createIndex() {
  const exists = await client.indices.exists({ index: OPENSEARCH_INDEX });
  if (exists.body) {
    console.log('Index already exists.');
    return;
  }
  await client.indices.create({
    index: OPENSEARCH_INDEX,
    body: {
      settings: {
        'index.knn': true
      },
      mappings: {
        properties: {
          embedding: {
            type: 'knn_vector',
            dimension: VECTOR_DIM,
            method: {
              name: 'hnsw',
              space_type: 'l2',
              engine: 'nmslib'
            }
          },
          id: { type: 'keyword' },
          userId: { type: 'keyword' },
          title: { type: 'text' },
          description: { type: 'text' },
          tags: { type: 'keyword' },
          text: { type: 'text' },
          createdAt: { type: 'date' },
          updatedAt: { type: 'date' }
        }
      }
    }
  });
  console.log('Index created!');
}

createIndex().catch(console.error);
