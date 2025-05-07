# Notification System

This document provides an overview of the notification system implemented in the BedrockAI application.

## Overview

The notification system allows the application to send notifications to users about various events. Notifications are stored in a DynamoDB table and can be accessed through the Notifications page in the UI.

## Components

### Frontend

- **NotificationBadge**: A component that displays the number of unread notifications.
- **Notifications Page**: A page that displays all notifications.
- **Notification Service**: A service that provides functions for creating notifications.

### Services

- **Notifications API**: A Lambda function that provides endpoints for managing notifications.
- **Notification Handlers**: Lambda functions that process notifications from SNS topics.
- **SNS Topics**: Topics for different types of notifications.
- **SNS Publisher**: A utility for publishing notifications to SNS topics.

## Notification Types

The system supports the following notification types:

- **Document Analysis**: Notifications about document analysis status (processing, completed, failed).
- **System Maintenance**: Notifications about system maintenance.
- **User Role Change**: Notifications about user role changes.
- **Tenant Creation**: Notifications about tenant creation.

## How to Use

### Creating Notifications

To create a notification from the frontend, use the notification service:

```javascript
import { createNotificationForCurrentUser } from '../services/notificationService';

// Create a notification for the current user
await createNotificationForCurrentUser(
  'Notification Title',
  'Notification Message',
  'info', // Type: info, warning, error
  { metadata: 'Additional metadata' }
);
```

### Publishing Notifications to SNS

To publish a notification to an SNS topic from a Lambda function:

```javascript
const { publishDocumentAnalysisNotification } = require('../utils/snsPublisher');

// Publish a document analysis notification
await publishDocumentAnalysisNotification(
  userId,
  documentName,
  'completed', // Status: processing, completed, failed
  'Your document analysis is complete.'
);
```

### Processing Notifications from SNS

The notification handlers process notifications from SNS topics and create notifications in the DynamoDB table. These handlers are triggered automatically when a message is published to the corresponding SNS topic.

## API Endpoints

The Notifications API provides the following endpoints:

- `GET /notifications`: Get all notifications for the current user.
- `PUT /notifications/{id}/read`: Mark a notification as read.
- `DELETE /notifications/{id}`: Delete a notification.
- `PUT /notifications/read-all`: Mark all notifications as read.
- `DELETE /notifications/clear-all`: Clear all notifications.
- `GET /notifications/unread-count`: Get the count of unread notifications.
- `POST /notifications/create`: Create a notification for a specific user.
- `POST /notifications/create-for-current-user`: Create a notification for the current user.
- `POST /notifications/create-for-all-users`: Create a notification for all users.
- `POST /notifications/create-for-users-with-role`: Create a notification for users with a specific role.

## SNS Topics

The system uses the following SNS topics:

- `DocumentAnalysisNotificationTopic`: For document analysis notifications.
- `SystemMaintenanceNotificationTopic`: For system maintenance notifications.
- `UserRoleChangeNotificationTopic`: For user role change notifications.
- `TenantCreationNotificationTopic`: For tenant creation notifications.

## DynamoDB Table

Notifications are stored in the `NotificationsTable` DynamoDB table with the following schema:

- `id`: String (Partition Key)
- `userId`: String (Sort Key)
- `title`: String
- `message`: String
- `type`: String (info, warning, error)
- `metadata`: Map
- `read`: Boolean
- `createdAt`: String (ISO 8601 timestamp)

## Future Enhancements

- **Email Notifications**: Send notifications via email.
- **Push Notifications**: Send notifications to mobile devices.
- **Notification Preferences**: Allow users to configure which notifications they want to receive.
- **Notification Templates**: Use templates for common notification types.
- **Notification Analytics**: Track notification engagement and effectiveness. 