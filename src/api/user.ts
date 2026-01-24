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

export const updateUserProfile = async (userData) => {
  // userData should contain: { first_name, last_name, bio, avatar_url, village, ... }
  const response = await axiosClient.patch('/api/v1/user/profile', userData);
  return response.data;
};

export const getUserProfileStats = async () => {
  const response = await axiosClient.get('/api/v1/user/profile/stats');
  console.log('stats data', response.data);
  return response.data.data;
};

// export const updateUserProfile = async (data: UpdateProfileRequest) => {
//   const response = await axiosClient.put('/api/v1/user/update', data);
//   return response.data;
// };

export const getUserStreams = async (userId: string, limit = 5, cursor = null) => {
  const response = await axiosClient.get(`/api/v1/streams/${userId}`, {
    params: {
      limit,
      cursor,
    },
  });

  return response.data.data;
};

export const searchLeaders = async (query: String) => {
  const response = await axiosClient.get('/api/v1/search/leaders', { params: { query: query } });
  console.log(response.data.data);
  return response.data.data;
};

export const getLeaderProfile = async (userId: String) => {
  const response = await axiosClient.get(`/api/v1/user/${userId}/profile`);
  console.log(response.data.data);
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
