import { API } from 'aws-amplify';

const API_NAME = 'api';

// Fetch all conversations for the user
export const fetchConversations = async () => {
  return API.get(API_NAME, '/ai/conversations');
};

// Create a new conversation
export const createConversation = async (title) => {
  return API.post(API_NAME, '/ai/conversations', { body: { title } });
};

// Fetch messages for a conversation
export const fetchConversationMessages = async (conversationId) => {
  return API.get(API_NAME, `/ai/conversations/${conversationId}`);
};

// Send a message in a conversation
export const sendMessage = async (conversationId, message, context) => {
  return API.post(API_NAME, `/ai/conversations/${conversationId}/messages`, {
    body: { message, context },
  });
}; 