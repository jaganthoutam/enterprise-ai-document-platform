import { useNotification } from '../contexts/NotificationContext';

interface ErrorDetails {
  message: string;
  code?: string;
  stack?: string;
  context?: Record<string, any>;
}

class ErrorHandlingService {
  private notificationService = useNotification();

  handleError(error: Error | string, context?: Record<string, any>) {
    const errorDetails: ErrorDetails = {
      message: typeof error === 'string' ? error : error.message,
      stack: error instanceof Error ? error.stack : undefined,
      context,
    };

    // Log error to console
    console.error('Application Error:', errorDetails);

    // Send error to error tracking service
    this.sendToErrorTracking(errorDetails);

    // Show user-friendly notification
    this.notificationService.showNotification({
      type: 'error',
      message: 'An error occurred',
      description: errorDetails.message,
      duration: 5,
    });
  }

  private async sendToErrorTracking(errorDetails: ErrorDetails) {
    try {
      const response = await fetch('/api/errors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...errorDetails,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          url: window.location.href,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send error to tracking service');
      }
    } catch (error) {
      console.error('Error sending to tracking service:', error);
    }
  }

  handleApiError(error: any) {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      const status = error.response.status;
      const data = error.response.data;

      switch (status) {
        case 400:
          this.handleError('Bad Request: ' + (data.message || 'Invalid request'));
          break;
        case 401:
          this.handleError('Unauthorized: Please log in again');
          break;
        case 403:
          this.handleError('Forbidden: You do not have permission to perform this action');
          break;
        case 404:
          this.handleError('Not Found: The requested resource was not found');
          break;
        case 500:
          this.handleError('Server Error: Please try again later');
          break;
        default:
          this.handleError(`Error ${status}: ${data.message || 'An error occurred'}`);
      }
    } else if (error.request) {
      // The request was made but no response was received
      this.handleError('Network Error: Please check your internet connection');
    } else {
      // Something happened in setting up the request that triggered an Error
      this.handleError(error.message);
    }
  }
}

export const createErrorHandlingService = () => {
  return new ErrorHandlingService();
};
