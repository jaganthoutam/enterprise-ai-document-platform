import { API } from 'aws-amplify';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'https://api.example.com';

export const searchDocuments = async (query, filters = {}) => {
  try {
    const response = await axios.post(`${API_URL}/search`, {
      query,
      filters,
      vectorSearch: true
    });
    return response.data;
  } catch (error) {
    console.error('Error searching documents:', error);
    throw error;
  }
};

export const semanticSearch = async (query, limit = 10) => {
  try {
    const response = await axios.post(`${API_URL}/search/semantic`, {
      query,
      limit
    });
    return response.data;
  } catch (error) {
    console.error('Error performing semantic search:', error);
    throw error;
  }
};

export const searchByVector = async (vector, limit = 10) => {
  try {
    const response = await axios.post(`${API_URL}/search/vector`, {
      vector,
      limit
    });
    return response.data;
  } catch (error) {
    console.error('Error searching by vector:', error);
    throw error;
  }
};

export async function vectorSearch(query, topK = 5) {
  const response = await API.post('api', '/search', {
    body: { query, topK }
  });
  return response.results; // Array of top documents
} 