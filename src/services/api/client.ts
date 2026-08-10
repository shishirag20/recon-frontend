/**
 * Generic HTTP Client Wrapper using standard Fetch API
 * Provides unified request handling, header injection, and typed ApiError handling.
 */
import { API_BASE_URL, AUTH_TOKEN_KEY } from './config';
import { ApiError, type ApiResponse } from '../../types';

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { params, headers: customHeaders, body, ...customConfig } = options;

  let url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes('?') ? '&' : '?') + queryString;
    }
  }

  const token = localStorage.getItem(AUTH_TOKEN_KEY);

  const isFormData = body instanceof FormData;

  const headers: Record<string, string> = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    Accept: 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(customHeaders as Record<string, string>),
  };

  const config: RequestInit = {
    ...customConfig,
    headers,
    body: isFormData ? body : body && typeof body === 'object' ? JSON.stringify(body) : body,
  };

  try {
    const response = await fetch(url, config);

    if (!response.ok) {
      let errorMessage = `HTTP error! status: ${response.status}`;
      let errorDetails: any = null;

      try {
        const errorJson = await response.json();
        errorMessage = errorJson.message || errorMessage;
        errorDetails = errorJson;
      } catch {
        // Fall back to default status text if not JSON
        errorMessage = response.statusText || errorMessage;
      }

      throw new ApiError(errorMessage, response.status, undefined, errorDetails);
    }

    if (response.status === 204) {
      return {} as T;
    }

    const data: ApiResponse<T> | T = await response.json();
    
    // Un-wrap if wrapped in standard { data: ... } envelope
    if (data && typeof data === 'object' && 'data' in data) {
      return (data as ApiResponse<T>).data;
    }

    return data as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      error instanceof Error ? error.message : 'Network failure or API server unreachable',
      500
    );
  }
}

export const api = {
  get: <T>(endpoint: string, options?: RequestOptions) =>
    apiClient<T>(endpoint, { ...options, method: 'GET' }),
  
  post: <T>(endpoint: string, body?: any, options?: RequestOptions) =>
    apiClient<T>(endpoint, { ...options, method: 'POST', body }),
  
  put: <T>(endpoint: string, body?: any, options?: RequestOptions) =>
    apiClient<T>(endpoint, { ...options, method: 'PUT', body }),
  
  patch: <T>(endpoint: string, body?: any, options?: RequestOptions) =>
    apiClient<T>(endpoint, { ...options, method: 'PATCH', body }),
  
  delete: <T>(endpoint: string, options?: RequestOptions) =>
    apiClient<T>(endpoint, { ...options, method: 'DELETE' }),

  /**
   * Upload a file via multipart/form-data (POST).
   * Omits Content-Type header so the browser sets it with the correct boundary.
   */
  postForm: <T>(endpoint: string, formData: FormData, options?: RequestOptions) => {
    const { headers: customHeaders, ...rest } = options || {};
    return apiClient<T>(endpoint, {
      ...rest,
      method: 'POST',
      body: formData,
      headers: {
        // Explicitly omit Content-Type so fetch sets multipart/form-data + boundary
        Accept: 'application/json',
        ...(customHeaders as Record<string, string>),
      },
    });
  },
};

