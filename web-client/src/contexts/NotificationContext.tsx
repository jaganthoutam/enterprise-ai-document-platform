import React, { createContext, useContext, useState, ReactNode } from 'react';
import { notification } from 'antd';

interface Notification {
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  description?: string;
  duration?: number;
}

interface NotificationContextType {
  showNotification: (notification: Notification) => void;
  clearNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [api, contextHolder] = notification.useNotification();

  const showNotification = ({ type, message, description, duration = 4.5 }: Notification) => {
    api[type]({
      message,
      description,
      duration,
      placement: 'topRight',
    });
  };

  const clearNotifications = () => {
    api.destroy();
  };

  return (
    <NotificationContext.Provider value={{ showNotification, clearNotifications }}>
      {contextHolder}
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};
