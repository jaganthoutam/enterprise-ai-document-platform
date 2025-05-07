import { API } from 'aws-amplify';

const API_NAME = 'api';

export const listUsers = async () => API.get(API_NAME, '/users');
export const createUser = async (user) => API.post(API_NAME, '/users', { body: user });
export const updateUser = async (id, updates) => API.put(API_NAME, `/users/${id}`, { body: updates });
export const deleteUser = async (id) => API.del(API_NAME, `/users/${id}`);

export const getUsers = async (filters = {}, page = 1, limit = 10) => {
  try {
    const response = await API.get(API_NAME, '/users', {
      params: {
        ...filters,
        page,
        limit
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error getting users:', error);
    throw error;
  }
};

export const getUser = async (userId) => {
  try {
    const response = await API.get(API_NAME, `/users/${userId}`);
    return response.data;
  } catch (error) {
    console.error('Error getting user:', error);
    throw error;
  }
};

export const getTenants = async (filters = {}, page = 1, limit = 10) => {
  try {
    const response = await API.get(API_NAME, '/tenants', {
      params: {
        ...filters,
        page,
        limit
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error getting tenants:', error);
    throw error;
  }
};

export const getTenant = async (tenantId) => {
  try {
    const response = await API.get(API_NAME, `/tenants/${tenantId}`);
    return response.data;
  } catch (error) {
    console.error('Error getting tenant:', error);
    throw error;
  }
};

export const createTenant = async (tenantData) => {
  try {
    const response = await API.post(API_NAME, '/tenants', { body: tenantData });
    return response.data;
  } catch (error) {
    console.error('Error creating tenant:', error);
    throw error;
  }
};

export const updateTenant = async (tenantId, tenantData) => {
  try {
    const response = await API.put(API_NAME, `/tenants/${tenantId}`, { body: tenantData });
    return response.data;
  } catch (error) {
    console.error('Error updating tenant:', error);
    throw error;
  }
};

export const deleteTenant = async (tenantId) => {
  try {
    const response = await API.del(API_NAME, `/tenants/${tenantId}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting tenant:', error);
    throw error;
  }
};

export const getTenantUsers = async (tenantId, filters = {}, page = 1, limit = 10) => {
  try {
    const response = await API.get(API_NAME, `/tenants/${tenantId}/users`, {
      params: {
        ...filters,
        page,
        limit
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error getting tenant users:', error);
    throw error;
  }
};

export const addUserToTenant = async (tenantId, userId, role) => {
  try {
    const response = await API.post(API_NAME, `/tenants/${tenantId}/users`, {
      body: {
        userId,
        role
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error adding user to tenant:', error);
    throw error;
  }
};

export const removeUserFromTenant = async (tenantId, userId) => {
  try {
    const response = await API.del(API_NAME, `/tenants/${tenantId}/users/${userId}`);
    return response.data;
  } catch (error) {
    console.error('Error removing user from tenant:', error);
    throw error;
  }
}; 