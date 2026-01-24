import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authActions } from '@/src/context/AuthContext';
import { AUTH_KEYS } from '@/src/constants/storage';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

const axiosClient = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'X-Platform': Platform.OS,
  },
});

let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

// ✅ REQUEST INTERCEPTOR
axiosClient.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem(AUTH_KEYS.ACCESS_TOKEN);
    const sessionId = await AsyncStorage.getItem(AUTH_KEYS.SESSION_ID);

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // ✅ REQUIRED for session-based security
    if (sessionId) {
      config.headers['x-session-id'] = sessionId;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ✅ RESPONSE INTERCEPTOR
axiosClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 400) {
      console.log('❌ API 400 Error:', JSON.stringify(error.response.data, null, 2));
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise(function (resolve, reject) {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return axiosClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await AsyncStorage.getItem(AUTH_KEYS.REFRESH_TOKEN);
        const sessionId = await AsyncStorage.getItem(AUTH_KEYS.SESSION_ID);

        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        // ✅ IMPORTANT: use axiosClient (so baseURL + headers apply)
        const response = await axiosClient.post('/api/v1/auth/refresh-token', {
          refreshToken,
        });

        const { accessToken, refreshToken: newRefreshToken } = response.data.data || response.data;

        // ✅ store new tokens
        await AsyncStorage.setItem(AUTH_KEYS.ACCESS_TOKEN, accessToken);

        if (newRefreshToken) {
          await AsyncStorage.setItem(AUTH_KEYS.REFRESH_TOKEN, newRefreshToken);
        }

        authActions.updateToken(accessToken);

        // ✅ retry failed requests with new access token
        axiosClient.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;

        // ✅ also attach session header in retry (extra safe)
        if (sessionId) {
          originalRequest.headers['x-session-id'] = sessionId;
        }

        processQueue(null, accessToken);
        return axiosClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        console.error('Session expired / revoked, logging out...');

        authActions.logout();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default axiosClient;
