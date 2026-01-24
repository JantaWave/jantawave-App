import axiosClient from './axiosClient';

export const getMyNotifications = async (params?: { limit?: number; offset?: number }) => {
  const res = await axiosClient.get('/api/v1/notifications/', { params });
  return res.data.data;
};

export const getUnreadCount = async () => {
  const res = await axiosClient.get('/api/v1/notifications/unread-count');
  return res.data.data;
};

export const markNotificationRead = async (id: string) => {
  const res = await axiosClient.patch(`/api/v1/notifications/${id}/read`);
  return res.data.data;
};

export const markAllNotificationsRead = async () => {
  const res = await axiosClient.patch('/api/v1/notifications/read-all');
  return res.data.data;
};

export const deleteNotification = async (id: string) => {
  const res = await axiosClient.delete(`/api/v1/notifications/${id}`);
  return res.data.data;
};
