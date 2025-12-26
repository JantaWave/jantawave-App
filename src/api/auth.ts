import axiosClient from './axiosClient';

export interface SendOTPRequest {
  contact: string;
}

export interface VerifyOTPRequest {
  contact: string;
  otp: string;
}

export interface RegisterRequest {
  first_name: string;
  last_name: string;
  village_id: string;
  contact: string;
  mpin: string;
  date_of_birth: string;
  gender: string;
}

export interface LoginRequest {
  contact: string;
  otp?: string;
  mpin?: string;
}

export const sendOTP = async (data: SendOTPRequest) => {
  const response = await axiosClient.post('/api/v1/send-otp', data);
  return response.data;
};

export const verifyOTP = async (data: VerifyOTPRequest) => {
  const response = await axiosClient.post('/api/v1/verify-otp', data);
  return response.data;
};

export const register = async (data: RegisterRequest) => {
  const response = await axiosClient.post('/api/v1/register', data);
  return response.data;
};

export const login = async (data: LoginRequest) => {
  const response = await axiosClient.post('/api/v1/login', data);
  return response.data.data;
};

export const refreshAccessToken = async () => {
  const response = await axiosClient.post('/api/v1/auth/refresh');
  return response.data.data;
};

export const getStates = async () => {
  const response = await axiosClient.get('/api/v1/states');
  return response.data;
};

export const getCities = async (stateId: string) => {
  const response = await axiosClient.get(`/api/v1/states/${stateId}/districts`);
  return response.data;
};

export const getBlocks = async (districtId: string) => {
  const response = await axiosClient.get(`/api/v1/districts/${districtId}/blocks`);
  return response.data;
};

export const getVillages = async (blockId: string) => {
  const response = await axiosClient.get(`/api/v1/blocks/${blockId}/villages`);
  return response.data;
};
export async function getAddress(villageId: string) {
  const response = await axiosClient.get(`/api/v1/address/${villageId}`);
  return response.data;
}

export const getTerms = async () => {
  const response = await axiosClient.get('/api/v1/users');
  return response.data;
};
