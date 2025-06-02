// Removed: import { auth } from './firebase'; // Assuming this is your client-side Firebase auth instance
// Removed: import Cookies from 'js-cookie';

interface RequestOptions extends RequestInit {
  body?: any; // Allow structured body
}

async function apiClient<T = any>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
  data?: Record<string, any>
): Promise<T> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  // No longer manually setting Authorization header.
  // The browser will automatically send the httpOnly 'auth-session' cookie.

  // Removed token logic:
  // const token = Cookies.get('auth-session');
  // if (token) {
  //   headers['Authorization'] = `Bearer ${token}`;
  // } else {
  //   console.warn(`API call to ${endpoint} made without an auth token cookie.`);
  //   if (method !== 'GET') {
  //     // throw new Error("User not authenticated: No auth token cookie found.");
  //   }
  // }

  const config: RequestOptions = {
    method: method,
    headers: headers,
    // credentials: 'include', // Usually not needed for same-origin requests with cookies, browser handles it.
                            // Only needed if your API is on a different domain/subdomain and requires credentials.
  };

  if (data) {
    if (method === 'GET') {
      // For GET requests, append data as query parameters
      const params = new URLSearchParams(data as Record<string, string>);
      endpoint = `${endpoint}?${params.toString()}`;
    } else {
      config.body = JSON.stringify(data);
    }
  }

  try {
    const response = await fetch(`/api/${endpoint}`, config); // Assuming API routes are under /api/

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        // Not a JSON response
        errorData = { message: response.statusText };
      }
      console.error('API Error:', response.status, errorData);
      throw { status: response.status, message: errorData?.message || response.statusText, data: errorData };
    }

    // Handle cases where the response might be empty (e.g., 204 No Content for DELETE)
    if (response.status === 204) {
      return null as T; 
    }
    
    return await response.json() as T;
  } catch (error: any) {
    console.error(`API call failed for ${method} ${endpoint}:`, error.message);
    // Re-throw the error so it can be caught by the caller (e.g., in stores)
    // The error object might already be in the desired shape { status, message, data }
    // If not, construct one.
    if (error.status !== undefined && error.message !== undefined) { // Ensure error has status and message
        throw error;
    } else {
        // Create a structured error if it's not already
        throw { 
            status: error.status || 500, 
            message: error.message || "An unexpected network or application error occurred.", 
            data: error.data 
        };
    }
  }
}

export default apiClient; 