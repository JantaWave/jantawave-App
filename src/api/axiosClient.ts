import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authActions } from '@/src/context/AuthContext'; // ✅ Bridge Import

const ACCESS_KEY = 'access_token';
const REFRESH_KEY = 'refresh_token';
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
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Request Interceptor
axiosClient.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem(ACCESS_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor
axiosClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // 1. Detect 401 (Unauthorized)
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
        const refreshToken = await AsyncStorage.getItem(REFRESH_KEY);

        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        // 2. Call Backend Refresh Endpoint
        const response = await axios.post(`${API_URL}/api/v1/auth/refresh-token`, {
          refreshToken: refreshToken,
        });

        // ⚠️ CRITICAL FIX: Extract data correctly based on your ApiResponse class
        // Usually it's in response.data.data
        const { accessToken, refreshToken: newRefreshToken } = response.data.data || response.data;

        // 3. Update Storage (Save BOTH tokens)
        await AsyncStorage.setItem(ACCESS_KEY, accessToken);

        // ✅ CRITICAL: Save the NEW refresh token (Token Rotation)
        if (newRefreshToken) {
          await AsyncStorage.setItem(REFRESH_KEY, newRefreshToken);
        }

        // 4. Update React Context via Bridge
        authActions.updateToken(accessToken);

        // 5. Retry Original Request
        axiosClient.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`;
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;

        processQueue(null, accessToken);
        return axiosClient(originalRequest);
      } catch (refreshError) {
        // 6. Refresh Failed -> Logout
        processQueue(refreshError, null);
        console.error('Session expired, logging out...');

        authActions.logout(); // ✅ Clears Context & Redirects to Login
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default axiosClient;
