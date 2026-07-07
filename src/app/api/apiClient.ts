import AsyncStorage from '@react-native-async-storage/async-storage';

// Base URL for physical device testing over local network (Host IP)
// AuthService runs on 9898
export const API_BASE_URL = 'http://177.171.101.42:9898';

// ExpenseService runs on 9820
export const EXPENSE_API_BASE_URL = 'http://177.171.101.42:9820';

interface FetchOptions extends RequestInit {
  requireAuth?: boolean;
  baseUrl?: string;
}

export const apiClient = async (endpoint: string, options: FetchOptions = {}) => {
  const { requireAuth = true, headers, ...customConfig } = options;

  const config: RequestInit = {
    ...customConfig,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      ...headers,
    },
  };

  if (requireAuth) {
    const token = await AsyncStorage.getItem('accessToken');
    if (token) {
      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${token}`,
      };
    }
  }

  const url = `${options.baseUrl || API_BASE_URL}${endpoint}`;
  let response = await fetch(url, config);

  // Note: If 401 occurs and we want to refresh, that logic could be added here
  // But due to the current setup, we handle refresh in components for now,
  // or we can implement it centrally in future.

  return response;
};
