import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || 'http://192.168.100.123:8000';

type RequestOptions = RequestInit & {
  auth?: boolean;
};

async function getAccessToken() {
  return AsyncStorage.getItem('accessToken');
}

async function getRefreshToken() {
  return AsyncStorage.getItem('refreshToken');
}

async function saveTokens(access: string, refresh?: string) {
  const pairs: [string, string][] = [['accessToken', access]];
  if (refresh) pairs.push(['refreshToken', refresh]);
  await AsyncStorage.multiSet(pairs);
}

export async function clearTokens() {
  await AsyncStorage.multiRemove(['accessToken', 'refreshToken']);
}

async function refreshAccessToken() {
  const refresh = await getRefreshToken();
  if (!refresh) return null;

  const res = await fetch(`${API_BASE_URL}/api/auth/refresh/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh }),
  });

  if (!res.ok) {
    await clearTokens();
    return null;
  }

  const data = await res.json();
  if (data?.access) {
    await saveTokens(data.access, refresh);
    return data.access as string;
  }

  await clearTokens();
  return null;
}

async function request<T = any>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { auth = true, headers, ...rest } = options;

  let token = auth ? await getAccessToken() : null;

  const makeHeaders = (currentToken?: string | null) => ({
    'Content-Type': 'application/json',
    ...(headers || {}),
    ...(auth && currentToken ? { Authorization: `Bearer ${currentToken}` } : {}),
  });

  let res = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: makeHeaders(token),
  });

  if (res.status === 401 && auth) {
    token = await refreshAccessToken();
    if (token) {
      res = await fetch(`${API_BASE_URL}${path}`, {
        ...rest,
        headers: makeHeaders(token),
      });
    }
  }

  if (!res.ok) {
    let errorData: any = null;
    try {
      errorData = await res.json();
    } catch {
      errorData = { detail: 'Unknown error' };
    }
    throw errorData;
  }

  if (res.status === 204) return null as T;
  return res.json();
}

export const api = {
  get: <T = any>(path: string, auth = true) =>
    request<T>(path, { method: 'GET', auth }),

  post: <T = any>(path: string, body?: any, auth = true) =>
    request<T>(path, {
      method: 'POST',
      auth,
      body: body ? JSON.stringify(body) : undefined,
    }),

  patch: <T = any>(path: string, body?: any, auth = true) =>
    request<T>(path, {
      method: 'PATCH',
      auth,
      body: body ? JSON.stringify(body) : undefined,
    }),

  delete: <T = any>(path: string, auth = true) =>
    request<T>(path, { method: 'DELETE', auth }),
};

export async function loginRequest(email: string, password: string) {
  const data = await api.post<{
    access: string;
    refresh: string;
  }>(
    '/api/auth/login/',
    { email, password },
    false
  );

  await saveTokens(data.access, data.refresh);
  return data;
}

export async function getMe() {
  return api.get('/api/auth/me/');
}

export async function logoutRequest() {
  await clearTokens();
}