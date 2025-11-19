import axiosClient from './axiosClient';

export const createYouTubeLive = async (payload: {
  userId: string;
  title: string;
  description: string;
  scheduledStartTime: string; // ISO string
}) => {
  const { data } = await axiosClient.post(`/api/v1/streams/create-live`, payload);
  return data; // contains ingestion info
};
