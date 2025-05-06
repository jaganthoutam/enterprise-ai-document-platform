import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useNotification } from './NotificationContext';
import { createErrorHandlingService } from '../services/error-handling';
import { createAnalyticsService } from '../services/analytics';
import { createWebSocketService } from '../services/websocket';

interface Document {
  id: string;
  title: string;
  createdAt: string;
  status: string;
  processedAt?: string;
  submittedBy?: string;
  submittedAt?: string;
}

interface Metrics {
  totalDocuments: number;
  processedToday: number;
  pendingApproval: number;
  avgProcessingTime: number;
  processedDocuments: number;
  errorRate: number;
}

interface AppContextType {
  isInitialized: boolean;
  errorHandler: ReturnType<typeof createErrorHandlingService>;
  analytics: ReturnType<typeof createAnalyticsService>;
  websocket: ReturnType<typeof createWebSocketService>;
  initializeApp: () => Promise<void>;
  metrics: Metrics;
  recentDocuments: Document[];
  pendingApprovals: Document[];
  loading: boolean;
  error: string | null;
  fetchMetrics: () => Promise<void>;
  fetchRecentDocuments: () => Promise<void>;
  fetchPendingApprovals: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [metrics, setMetrics] = useState<Metrics>({
    totalDocuments: 0,
    processedToday: 0,
    pendingApproval: 0,
    avgProcessingTime: 0,
    processedDocuments: 0,
    errorRate: 0,
  });
  const [recentDocuments, setRecentDocuments] = useState<Document[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const notificationService = useNotification();

  const errorHandler = createErrorHandlingService();
  const analytics = createAnalyticsService(process.env.REACT_APP_ANALYTICS_API_KEY || '');
  const websocket = createWebSocketService(process.env.REACT_APP_WEBSOCKET_URL || '');

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      // TODO: Implement actual API call
      const mockMetrics: Metrics = {
        totalDocuments: 100,
        processedToday: 15,
        pendingApproval: 5,
        avgProcessingTime: 45,
        processedDocuments: 95,
        errorRate: 0.02,
      };
      setMetrics(mockMetrics);
    } catch (err) {
      setError('Failed to fetch metrics');
      errorHandler.handleError(err as Error, { context: 'Fetching metrics' });
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentDocuments = async () => {
    setLoading(true);
    try {
      // TODO: Implement actual API call
      const mockDocuments: Document[] = [
        {
          id: '1',
          title: 'Document 1',
          createdAt: new Date().toISOString(),
          status: 'processed',
          processedAt: new Date().toISOString(),
        },
      ];
      setRecentDocuments(mockDocuments);
    } catch (err) {
      setError('Failed to fetch recent documents');
      errorHandler.handleError(err as Error, { context: 'Fetching recent documents' });
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingApprovals = async () => {
    setLoading(true);
    try {
      // TODO: Implement actual API call
      const mockDocuments: Document[] = [
        {
          id: '2',
          title: 'Document 2',
          createdAt: new Date().toISOString(),
          status: 'pending',
          submittedBy: 'John Doe',
          submittedAt: new Date().toISOString(),
        },
      ];
      setPendingApprovals(mockDocuments);
    } catch (err) {
      setError('Failed to fetch pending approvals');
      errorHandler.handleError(err as Error, { context: 'Fetching pending approvals' });
    } finally {
      setLoading(false);
    }
  };

  const initializeApp = async () => {
    try {
      // Initialize WebSocket connection
      websocket.connect();

      // Initialize analytics
      const user = localStorage.getItem('user');
      if (user) {
        const userData = JSON.parse(user);
        analytics.setUserId(userData.id);
      }

      // Track initial page view
      analytics.trackPageView(window.location.pathname);

      // Fetch initial data
      await Promise.all([fetchMetrics(), fetchRecentDocuments(), fetchPendingApprovals()]);

      setIsInitialized(true);
    } catch (error) {
      errorHandler.handleError(error as Error, { context: 'App initialization' });
      notificationService.showNotification({
        type: 'error',
        message: 'Failed to initialize application',
        description: 'Please try refreshing the page',
      });
    }
  };

  const value = {
    isInitialized,
    errorHandler,
    analytics,
    websocket,
    initializeApp,
    metrics,
    recentDocuments,
    pendingApprovals,
    loading,
    error,
    fetchMetrics,
    fetchRecentDocuments,
    fetchPendingApprovals,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
