import axios, { AxiosError } from "axios";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Use EXPO_PUBLIC_ prefix
const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

// Debug: Log to see if it's loaded
if (__DEV__) {
  console.log("API URL:", API_URL);
}

if (!API_URL) {
  console.error("⚠️ EXPO_PUBLIC_BACKEND_URL is not set! Check your .env file");
}

const axiosClient = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
    "X-Platform": Platform.OS,
  },
});

// Request interceptor
axiosClient.interceptors.request.use(
  async (config) => {
    if (__DEV__) {
      console.log("Making request to:", config.baseURL + config.url);
    }

    try {
      const token = await AsyncStorage.getItem("auth_token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error("Error retrieving auth token:", error);
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Response interceptor
axiosClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    // Enhanced error logging
    if (__DEV__) {
      console.error("API Error:", {
        url: error.config?.url,
        method: error.config?.method?.toUpperCase(),
        status: error.response?.status,
        statusText: error.response?.statusText,
        message: error.message,
        data: error.response?.data,
      });
    }

    // Handle 401 Unauthorized
    if (error.response?.status === 401) {
      try {
        await AsyncStorage.removeItem("auth_token");
        // Optional: Navigate to login screen or trigger logout event
        // You can add a callback or event emitter here
      } catch (storageError) {
        console.error("Error clearing auth token:", storageError);
      }
    }

    // Network error handling
    if (error.message === "Network Error" || !error.response) {
      return Promise.reject({
        ...error,
        message:
          "Network connection failed. Please check your internet connection.",
      });
    }

    // Timeout error handling
    if (error.code === "ECONNABORTED") {
      return Promise.reject({
        ...error,
        message: "Request timeout. Please try again.",
      });
    }

    return Promise.reject(error);
  },
);

// Optional: Add retry logic for failed requests
export const setupRetryInterceptor = (retries = 3, retryDelay = 1000) => {
  axiosClient.interceptors.response.use(undefined, async (error) => {
    const config = error.config;

    if (!config || !config.retry) {
      config.retry = 0;
    }

    // Don't retry on 4xx errors (except 429 rate limit)
    if (
      error.response?.status >= 400 &&
      error.response?.status < 500 &&
      error.response?.status !== 429
    ) {
      return Promise.reject(error);
    }

    if (config.retry >= retries) {
      return Promise.reject(error);
    }

    config.retry += 1;

    // Exponential backoff
    const delay = retryDelay * Math.pow(2, config.retry - 1);
    await new Promise((resolve) => setTimeout(resolve, delay));

    if (__DEV__) {
      console.log(`Retrying request (${config.retry}/${retries})...`);
    }

    return axiosClient(config);
  });
};

// Helper function to check API health
export const checkAPIHealth = async (): Promise<boolean> => {
  try {
    await axiosClient.get("/health");
    return true;
  } catch (error) {
    console.error("API health check failed:", error);
    return false;
  }
};

// Helper to clear all auth data
export const clearAuthData = async () => {
  try {
    await AsyncStorage.removeItem("auth_token");
    // Add any other auth-related storage keys here
  } catch (error) {
    console.error("Error clearing auth data:", error);
  }
};

export default axiosClient;
