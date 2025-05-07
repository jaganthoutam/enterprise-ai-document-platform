import { API } from 'aws-amplify';

const API_NAME = 'api';

export const fetchConversations = async () => API.get(API_NAME, '/ai/conversations');
export const createConversation = async (title) => API.post(API_NAME, '/ai/conversations', { body: { title } });
export const deleteConversation = async (id) => API.del(API_NAME, `/ai/conversations/${id}`);
export const renameConversation = async (id, title) => API.put(API_NAME, `/ai/conversations/${id}`, { body: { title } });
export const fetchConversationMessages = async (id) => API.get(API_NAME, `/ai/conversations/${id}`);
export const sendMessage = async (id, message, context) =>
  API.post(API_NAME, `/ai/conversations/${id}/messages`, { body: { message, context } }); 