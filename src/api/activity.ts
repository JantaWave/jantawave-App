import axiosClient from './axiosClient';

interface GetActivityParams {
  limit?: number;
  cursor?: string | null;
}

interface ActivityResponse {
  activities: any[];
  nextCursor: string | null;
}

interface ActivityStats {
  myActivitiesCount: number;
  receivedActivitiesCount: number;
  uniqueEntityTypes: number;
  lastActivityAt: string | null;
}

/* ---------------- GET RECEIVED ACTIVITY (As Leader) ---------------- */
export const getUserActivity = async ({
  limit = 10,
  cursor = null,
}: GetActivityParams = {}): Promise<ActivityResponse> => {
  const response = await axiosClient.get('/api/v1/activity/me', {
    params: { limit, cursor },
  });
  console.log('Received activity:', response.data.data);
  return response.data.data;
};

/* ---------------- GET MY ACTIVITY (Activities I Performed) ---------------- */
export const getMyActivity = async ({
  limit = 10,
  cursor = null,
}: GetActivityParams = {}): Promise<ActivityResponse> => {
  const response = await axiosClient.get('/api/v1/activity/myActivities', {
    params: { limit, cursor },
  });
  console.log('My activity:', response.data.data);
  return response.data.data;
};

/* ---------------- GET COMBINED ACTIVITY (Both Sent & Received) ---------------- */
export const getCombinedActivity = async ({
  limit = 10,
  cursor = null,
}: GetActivityParams = {}): Promise<ActivityResponse> => {
  const response = await axiosClient.get('/api/v1/activity/combined', {
    params: { limit, cursor },
  });
  console.log('Combined activity:', response.data.data);
  return response.data.data;
};

/* ---------------- GET ACTIVITY BY TYPE ---------------- */
export const getActivityByType = async (
  type: 'me' | 'myActivities' | 'combined',
  { limit = 10, cursor = null }: GetActivityParams = {}
): Promise<ActivityResponse> => {
  const response = await axiosClient.get(`/api/v1/activity/${type}`, {
    params: { limit, cursor },
  });
  console.log(`${type} activity:`, response.data.data);
  return response.data.data;
};

/* ---------------- GET ACTIVITY STATS ---------------- */
export const getActivityStats = async (): Promise<ActivityStats> => {
  const response = await axiosClient.get('/api/v1/activity/stats');
  console.log('Activity stats:', response.data.data);
  return response.data.data;
};

/* ---------------- DELETE ACTIVITY ---------------- */
export const deleteActivity = async (activityId: string): Promise<any> => {
  const response = await axiosClient.delete(`/api/v1/activity/${activityId}`);
  console.log('Deleted activity:', response.data.data);
  return response.data.data;
};
