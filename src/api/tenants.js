import { API } from 'aws-amplify';

const API_NAME = 'api';

export const listTenants = async () => API.get(API_NAME, '/tenants');
export const createTenant = async (tenant) => API.post(API_NAME, '/tenants', { body: tenant });
export const updateTenant = async (id, updates) => API.put(API_NAME, `/tenants/${id}`, { body: updates }); 