import axiosClient from './axiosClient';

export const followUser = async (id: String) => {
  const response = await axiosClient.post(`api/v1/user/${id}/follow`);
  return response.data;
};

export const unfollowUser = async (id: String) => {
  const response = await axiosClient.post(`api/v1/user/${id}/unfollow`);
  return response.data;
};

export const getUserFollowers = async () => {
  console.log('getUsrFollowers called');
  const response = await axiosClient.get('api/v1/user/followers');
  console.log('data', response.data);
  return response.data.data;
};

export const getUserFollowings = async () => {
  const response = await axiosClient.get('api/v1/user/followings');
  console.log('data', response.data);
  return response.data.data;
};

export const removeFollower = async (id: string) => {
  const res = await axiosClient.post(`/api/v1/user/${id}/remove-follower`);
  return res.data;
};
