import { api } from './api';

export interface Document {
  id: string;
  title: string;
  content: string;
  status: 'pending' | 'approved' | 'rejected';
  processedAt: string;
  submittedBy: string;
  submittedAt: string;
  tenantId: string;
}

export interface Analysis {
  id: string;
  documentId: string;
  summary: string;
  keyPoints: string[];
  recommendations: string[];
  createdAt: string;
}

export interface Message {
  id: string;
  content: string;
  sender: 'user' | 'assistant';
  timestamp: string;
  documentId?: string;
}

export const storageService = {
  // Document operations
  getDocuments: async (tenantId: string): Promise<Document[]> => {
    const response = await api.get<Document[]>(`/documents?tenantId=${tenantId}`);
    return response.data;
  },

  getDocument: async (documentId: string): Promise<Document> => {
    const response = await api.get<Document>(`/documents/${documentId}`);
    return response.data;
  },

  createDocument: async (
    document: Omit<Document, 'id' | 'processedAt' | 'submittedAt'>
  ): Promise<Document> => {
    const response = await api.post<Document>('/documents', document);
    return response.data;
  },

  updateDocument: async (documentId: string, updates: Partial<Document>): Promise<Document> => {
    const response = await api.put<Document>(`/documents/${documentId}`, updates);
    return response.data;
  },

  deleteDocument: async (documentId: string): Promise<void> => {
    await api.delete(`/documents/${documentId}`);
  },

  // Analysis operations
  getAnalysis: async (documentId: string): Promise<Analysis> => {
    const response = await api.get<Analysis>(`/documents/${documentId}/analysis`);
    return response.data;
  },

  createAnalysis: async (analysis: Omit<Analysis, 'id' | 'createdAt'>): Promise<Analysis> => {
    const response = await api.post<Analysis>('/analysis', analysis);
    return response.data;
  },

  // Message operations
  getMessages: async (documentId?: string): Promise<Message[]> => {
    const url = documentId ? `/messages?documentId=${documentId}` : '/messages';
    const response = await api.get<Message[]>(url);
    return response.data;
  },

  createMessage: async (message: Omit<Message, 'id' | 'timestamp'>): Promise<Message> => {
    const response = await api.post<Message>('/messages', message);
    return response.data;
  },

  // Tenant operations
  getTenantDocuments: async (tenantId: string): Promise<Document[]> => {
    const response = await api.get<Document[]>(`/tenants/${tenantId}/documents`);
    return response.data;
  },

  getTenantAnalytics: async (tenantId: string, timeRange: string): Promise<any> => {
    const response = await api.get(`/tenants/${tenantId}/analytics?timeRange=${timeRange}`);
    return response.data;
  },
};
