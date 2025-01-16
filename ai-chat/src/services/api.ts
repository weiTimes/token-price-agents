import axios from 'axios';

const api = axios.create({
  // baseURL: 'http://localhost:3000',
  baseURL: 'https://token-price-agents.vercel.app',
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface CreateIntentRequest {
  userId: string;
  intent: string;
}

export interface CreateIntentResponse {
  id: string;
  userId: string;
  condition: {
    type: string;
    parameters: Record<string, any>;
    description: string;
  };
  createdAt: string;
  updatedAt: string;
}

export const createIntent = async (data: CreateIntentRequest) => {
  const response = await api.post<CreateIntentResponse>('/intents', data);
  return response.data;
};

export const getUserPreferences = async (userId: string) => {
  const response = await api.get<CreateIntentResponse[]>(
    `/notifications/user/${userId}`
  );
  return response.data;
};
