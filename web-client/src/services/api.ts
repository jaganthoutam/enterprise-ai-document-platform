import axios, { InternalAxiosRequestConfig, AxiosResponse, AxiosError, AxiosHeaders } from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://api.bedrockai.com';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor for authentication
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    if (!config.headers) {
      config.headers = new AxiosHeaders();
    }
    config.headers.set('Authorization', `Bearer ${token}`);
  }
  return config;
});

// Add response interceptor for error handling
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const dashboardService = {
  getMetrics: async () => {
    const response = await api.get('/dashboard/metrics');
    return response.data;
  },

  getRecentDocuments: async (limit = 10) => {
    const response = await api.get(`/documents/recent?limit=${limit}`);
    return response.data;
  },

  getPendingApprovals: async () => {
    const response = await api.get('/approvals/pending');
    return response.data;
  },
};

export const documentService = {
  getDocument: async (documentId: string) => {
    const response = await api.get(`/documents/${documentId}`);
    return response.data;
  },

  getDocumentAnalysis: async (documentId: string) => {
    const response = await api.get(`/documents/${documentId}/analysis`);
    return response.data;
  },

  requestApproval: async (documentId: string, approverId: string) => {
    const response = await api.post(`/documents/${documentId}/approval`, { approverId });
    return response.data;
  },

  runAnalysis: async (documentId: string) => {
    const response = await api.post(`/documents/${documentId}/analyze`);
    return response.data;
  },
};

export const aiAssistantService = {
  sendMessage: async (message: string, context?: { documentId?: string }) => {
    const response = await api.post('/assistant/chat', { message, context });
    return response.data;
  },

  getDocumentReferences: async (documentId: string) => {
    const response = await api.get(`/documents/${documentId}/references`);
    return response.data;
  },
};

export const adminService = {
  getTenants: async () => {
    const response = await api.get('/admin/tenants');
    return response.data;
  },

  getSystemMetrics: async () => {
    const response = await api.get('/admin/metrics');
    return response.data;
  },

  getUsageAnalytics: async (timeRange: string) => {
    const response = await api.get(`/admin/analytics?timeRange=${timeRange}`);
    return response.data;
  },

  updateTenantStatus: async (tenantId: string, status: string) => {
    const response = await api.put(`/admin/tenants/${tenantId}/status`, { status });
    return response.data;
  },
};
