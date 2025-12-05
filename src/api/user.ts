import axiosClient from './axiosClient';

export interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  stateId?: string;
  cityId?: string;
  block?: string;
  village?: string;
}

export const getUserProfile = async () => {
  const response = await axiosClient.get('/api/v1/user/profile');
  return response.data;
};

// export const updateUserProfile = async (data: UpdateProfileRequest) => {
//   const response = await axiosClient.put('/api/v1/user/update', data);
//   return response.data;
// };
//
export const getUserStreams = async () => {
  const response = await axiosClient.get('/api/v1/streams/');
  return response.data.data;
};
//
// export const getUserPosts = async () => {
//   const response = await axiosClient.get('/api/v1/user/posts');
//   return response.data;
// };
//
// export const getHome = async () => {
//   const response = await axiosClient.get('/api/v1/home');
//   return response.data;
// };
//
// export const getStreams = async () => {
//   const response = await axiosClient.get('/api/v1/streams');
//   return response.data;
// };
//
// export const getCommunity = async () => {
//   const response = await axiosClient.get('/api/v1/community');
//   return response.data;
// };
