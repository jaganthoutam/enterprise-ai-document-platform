interface AnalyticsEvent {
  category: string;
  action: string;
  label?: string;
  value?: number;
}

class AnalyticsService {
  private isEnabled = true;
  private userId: string | undefined = undefined;

  constructor(private apiKey: string) {
    this.initialize();
  }

  private initialize() {
    // Check if analytics is enabled in user preferences
    const analyticsEnabled = localStorage.getItem('analytics_enabled');
    if (analyticsEnabled !== null) {
      this.isEnabled = analyticsEnabled === 'true';
    }

    // Get user ID from auth context
    const user = localStorage.getItem('user');
    if (user) {
      const userData = JSON.parse(user);
      this.userId = userData.id;
    }
  }

  trackPageView(path: string) {
    if (!this.isEnabled) return;

    this.sendEvent({
      category: 'Page View',
      action: 'view',
      label: path,
      userId: this.userId,
      timestamp: new Date().toISOString(),
    });
  }

  trackEvent(event: AnalyticsEvent) {
    if (!this.isEnabled) return;

    this.sendEvent({
      ...event,
      userId: this.userId,
      timestamp: new Date().toISOString(),
    });
  }

  private async sendEvent(event: AnalyticsEvent & { userId?: string; timestamp: string }) {
    try {
      const response = await fetch('/api/analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey,
        },
        body: JSON.stringify(event),
      });

      if (!response.ok) {
        throw new Error('Failed to send analytics event');
      }
    } catch (error) {
      console.error('Error sending analytics event:', error);
    }
  }

  enable() {
    this.isEnabled = true;
    localStorage.setItem('analytics_enabled', 'true');
  }

  disable() {
    this.isEnabled = false;
    localStorage.setItem('analytics_enabled', 'false');
  }

  setUserId(userId: string) {
    this.userId = userId;
  }
}

export const createAnalyticsService = (apiKey: string) => {
  return new AnalyticsService(apiKey);
};
