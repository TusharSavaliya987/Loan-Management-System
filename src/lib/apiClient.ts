import { auth } from './firebase'; // Assuming this is your client-side Firebase auth instance

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

  const currentUser = auth.currentUser;
  if (currentUser) {
    try {
      const token = await currentUser.getIdToken();
      headers['Authorization'] = `Bearer ${token}`;
    } catch (error) {
      console.error("Error getting ID token:", error);
      // Handle error appropriately, e.g., redirect to login or throw
      throw new Error("User not authenticated or token retrieval failed.");
    }
  } else {
    // Handle cases where user is not logged in but an authenticated endpoint is called
    // This might be an error, or some endpoints might be public
    console.warn(`API call to ${endpoint} made without a logged-in user.`);
    // Depending on your API design, you might throw an error here or allow the call
    // For now, we'll throw if it's not a GET request or a known public endpoint
    if (method !== 'GET') { // Example: restrict non-GET calls without auth
        // throw new Error("User not authenticated.");
    }
  }

  const config: RequestOptions = {
    method: method,
    headers: headers,
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
    if (error.status !== undefined) {
        throw error;
    } else {
        throw { status: 500, message: error.message || "An unexpected network error occurred." };
    }
  }
}

export default apiClient; 