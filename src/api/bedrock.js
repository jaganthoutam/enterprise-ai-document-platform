import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'https://api.example.com';

export const queryKnowledgeBase = async (query, knowledgeBaseId) => {
  try {
    const response = await axios.post(`${API_URL}/bedrock/knowledge-base/query`, {
      query,
      knowledgeBaseId
    });
    return response.data;
  } catch (error) {
    console.error('Error querying knowledge base:', error);
    throw error;
  }
};

export const createKnowledgeBase = async (name, description, dataSource) => {
  try {
    const response = await axios.post(`${API_URL}/bedrock/knowledge-base`, {
      name,
      description,
      dataSource
    });
    return response.data;
  } catch (error) {
    console.error('Error creating knowledge base:', error);
    throw error;
  }
};

export const listKnowledgeBases = async () => {
  try {
    const response = await axios.get(`${API_URL}/bedrock/knowledge-base`);
    return response.data;
  } catch (error) {
    console.error('Error listing knowledge bases:', error);
    throw error;
  }
};

export const invokeAgent = async (agentId, input) => {
  try {
    const response = await axios.post(`${API_URL}/bedrock/agent/invoke`, {
      agentId,
      input
    });
    return response.data;
  } catch (error) {
    console.error('Error invoking agent:', error);
    throw error;
  }
};

export const createAgent = async (name, description, instructions, tools) => {
  try {
    const response = await axios.post(`${API_URL}/bedrock/agent`, {
      name,
      description,
      instructions,
      tools
    });
    return response.data;
  } catch (error) {
    console.error('Error creating agent:', error);
    throw error;
  }
};

export const listAgents = async () => {
  try {
    const response = await axios.get(`${API_URL}/bedrock/agent`);
    return response.data;
  } catch (error) {
    console.error('Error listing agents:', error);
    throw error;
  }
};

export const applyGuardrails = async (input, guardrailId) => {
  try {
    const response = await axios.post(`${API_URL}/bedrock/guardrail/apply`, {
      input,
      guardrailId
    });
    return response.data;
  } catch (error) {
    console.error('Error applying guardrails:', error);
    throw error;
  }
};

export const createGuardrail = async (name, description, rules) => {
  try {
    const response = await axios.post(`${API_URL}/bedrock/guardrail`, {
      name,
      description,
      rules
    });
    return response.data;
  } catch (error) {
    console.error('Error creating guardrail:', error);
    throw error;
  }
};

export const listGuardrails = async () => {
  try {
    const response = await axios.get(`${API_URL}/bedrock/guardrail`);
    return response.data;
  } catch (error) {
    console.error('Error listing guardrails:', error);
    throw error;
  }
}; 