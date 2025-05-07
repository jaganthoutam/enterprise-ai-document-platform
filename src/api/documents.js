import { API } from 'aws-amplify';

const API_NAME = 'api';

export const listRecentDocuments = async () => API.get(API_NAME, '/documents/recent');
export const getDocumentMetadata = async (id) => API.get(API_NAME, `/documents/${id}/metadata`);
export const generateUploadUrl = async (fileName, contentType) =>
  API.post(API_NAME, '/documents/upload-url', { body: { fileName, contentType } });
export const generateDownloadUrl = async (key) =>
  API.get(API_NAME, `/documents/download-url?key=${encodeURIComponent(key)}`);

/**
 * Upload a document for analysis
 * @param {FormData} formData - FormData containing the file to upload
 * @returns {Promise<Object>} - The uploaded document data
 */
export const uploadDocument = async (formData) => {
  try {
    const response = await API.post(API_NAME, '/documents/upload', {
      body: formData,
    });
    return response;
  } catch (error) {
    console.error('Error uploading document:', error);
    throw error;
  }
};

/**
 * Get all documents for the current user
 * @returns {Promise<Object>} - Object containing documents array
 */
export const getDocuments = async () => {
  try {
    const response = await API.get(API_NAME, '/documents');
    return response;
  } catch (error) {
    console.error('Error fetching documents:', error);
    throw error;
  }
};

/**
 * Get a specific document by ID
 * @param {string} documentId - The ID of the document to fetch
 * @returns {Promise<Object>} - The document data
 */
export const getDocument = async (documentId) => {
  try {
    const response = await API.get(API_NAME, `/documents/${documentId}`);
    return response;
  } catch (error) {
    console.error(`Error fetching document ${documentId}:`, error);
    throw error;
  }
};

/**
 * Delete a document
 * @param {string} documentId - The ID of the document to delete
 * @returns {Promise<Object>} - The response from the API
 */
export const deleteDocument = async (documentId) => {
  try {
    const response = await API.del(API_NAME, `/documents/${documentId}`);
    return response;
  } catch (error) {
    console.error(`Error deleting document ${documentId}:`, error);
    throw error;
  }
};

/**
 * Analyze a document using Bedrock AI
 * @param {string} documentId - The ID of the document to analyze
 * @returns {Promise<Object>} - The analysis results
 */
export const analyzeDocument = async (documentId) => {
  try {
    const response = await API.post(API_NAME, `/documents/${documentId}/analyze`);
    return response;
  } catch (error) {
    console.error(`Error analyzing document ${documentId}:`, error);
    throw error;
  }
};

/**
 * Get the analysis results for a document
 * @param {string} documentId - The ID of the document to get analysis for
 * @returns {Promise<Object>} - The analysis results
 */
export const getDocumentAnalysis = async (documentId) => {
  try {
    const response = await API.get(API_NAME, `/documents/${documentId}/analysis`);
    return response;
  } catch (error) {
    console.error(`Error fetching analysis for document ${documentId}:`, error);
    throw error;
  }
};

/**
 * Search documents by query
 * @param {string} query - The search query
 * @returns {Promise<Object>} - Object containing matching documents
 */
export const searchDocuments = async (query) => {
  try {
    const response = await API.get(API_NAME, '/documents/search', {
      queryStringParameters: { q: query },
    });
    return response;
  } catch (error) {
    console.error('Error searching documents:', error);
    throw error;
  }
};

/**
 * Get document statistics
 * @returns {Promise<Object>} - Object containing document statistics
 */
export const getDocumentStats = async () => {
  try {
    const response = await API.get(API_NAME, '/documents/stats');
    return response;
  } catch (error) {
    console.error('Error fetching document statistics:', error);
    throw error;
  }
};

export const downloadDocument = async (documentId) => {
  try {
    const response = await API.get(API_NAME, `/documents/${documentId}/download`, {
      responseType: 'blob'
    });
    return response.data;
  } catch (error) {
    console.error('Error downloading document:', error);
    throw error;
  }
};

export const shareDocument = async (documentId, users, permissions) => {
  try {
    const response = await API.post(API_NAME, `/documents/${documentId}/share`, {
      body: { users, permissions }
    });
    return response.data;
  } catch (error) {
    console.error('Error sharing document:', error);
    throw error;
  }
};

export const getDocumentVersions = async (documentId) => {
  try {
    const response = await API.get(API_NAME, `/documents/${documentId}/versions`);
    return response.data;
  } catch (error) {
    console.error('Error getting document versions:', error);
    throw error;
  }
};

export const restoreDocumentVersion = async (documentId, versionId) => {
  try {
    const response = await API.post(API_NAME, `/documents/${documentId}/versions/${versionId}/restore`);
    return response.data;
  } catch (error) {
    console.error('Error restoring document version:', error);
    throw error;
  }
}; 