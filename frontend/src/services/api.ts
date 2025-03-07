/**
 * API service for making HTTP requests to the backend
 */
import { getApiUrl } from '../config/api';

/**
 * Generic error handling for API requests
 */
export class ApiError extends Error {
  status: number;
  
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

/**
 * Save a user profile to the backend
 * @param formData FormData containing the profile information
 * @returns Promise resolving to the saved profile data
 */
export const saveProfile = async (formData: FormData): Promise<any> => {
  try {
    // Check if we're in the browser environment
    // This prevents the fetch from running during server-side rendering
    if (typeof window === 'undefined') {
      console.log('Not in browser environment, skipping profile save');
      throw new ApiError('Cannot save profile on server side', 400);
    }
    
    const url = getApiUdrl('profile');
    console.log('Saving profile to:', url);
    
    // Ensure user_address is included in formData - it's required
    let hasAddress = false;
    let addressValue = '';
    for (const [key, value] of formData.entries()) {
      if (key === 'user_address' && value) {
        hasAddress = true;
        addressValue = value.toString();
        break;
      }
    }
    
    if (!hasAddress || !addressValue) {
      console.error('No wallet address provided in formData');
      throw new ApiError('Wallet address is required', 400);
    }
    
    // Debug output exactly like the curl command
    console.log(`Equivalent curl command:`);
    console.log(`curl -v -X POST "${url}" \\`);
    for (const [key, value] of formData.entries()) {
      if (typeof value === 'string') {
        console.log(`    -F "${key}=${value}" \\`);
      } else {
        console.log(`    -F "${key}=<file-data>" \\`);
      }
    }
    
    // Add a timeout to the fetch request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    try {
      // IMPORTANT: Do NOT set Content-Type header when sending FormData
      // Browser will automatically set it with the correct boundary
      console.log('Attempting POST from origin:', window.location.origin);
      
      // Enable more verbose debugging for FormData contents
      console.log('FormData entries:');
      for (const [key, value] of formData.entries()) {
        if (value instanceof File) {
          console.log(`- ${key}: File(${value.name}, ${value.type}, ${value.size} bytes)`);
        } else {
          console.log(`- ${key}: ${value}`);
        }
      }
      
      // Try to simplify the request as much as possible since we're having parsing issues
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      console.log('Profile save response status:', response.status);
      console.log('Profile save response headers:', 
        Array.from(response.headers.entries())
          .map(([key, value]) => `${key}: ${value}`)
          .join('\n')
      );
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'No error details');
        console.error('Server error response:', errorText);
        throw new ApiError(`Failed to save profile: ${response.statusText} - ${errorText}`, response.status);
      }
      
      // The backend returns a 200 OK status code with no content
      console.log('Profile saved successfully');
      
      // Check if there's any response data (might be empty)
      try {
        const data = await response.json();
        console.log('Profile save response data:', data);
        return data;
      } catch (e) {
        console.log('No JSON response from profile save (expected)');
        return { success: true };
      }
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error) {
    // Log the error for debugging
    console.error('API Error saving profile:', error);
    
    // Handle aborted requests
    if (error.name === 'AbortError') {
      throw new ApiError('Request timed out after 10 seconds', 408);
    }
    
    // Rethrow as an ApiError if it's not already
    if (error instanceof ApiError) {
      throw error;
    }
    
    throw new ApiError(`Failed to save profile: ${(error as Error).message}`, 500);
  }
};

/**
 * Get a user profile from the backend by wallet address
 * @param walletAddress The user's wallet address
 * @returns Promise resolving to the profile data
 */
export const getProfileByWalletAddress = async (walletAddress: string): Promise<any> => {
  try {
    // Check if we're in the browser environment
    // This prevents the fetch from running during server-side rendering
    if (typeof window === 'undefined') {
      console.log('Not in browser environment, skipping profile fetch');
      return null;
    }
    
    if (!walletAddress) {
      console.error('No wallet address provided to getProfileByWalletAddress');
      return null;
    }

    // The backend expects a query parameter 'address'
    const url = `${getApiUrl('profile')}?address=${encodeURIComponent(walletAddress)}`;
    console.log('Fetching profile from:', url);
    console.log(`Equivalent curl command: curl -v "${url}" -H "Accept: application/json"`);
    
    // Add a timeout to the fetch request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    try {
      // Try a simple fetch with no special CORS settings first
      console.log('Attempting fetch from origin:', window.location.origin);
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      // Log response details
      console.log('GET profile response status:', response.status);
      console.log('GET profile response headers:', 
        Array.from(response.headers.entries())
          .map(([key, value]) => `${key}: ${value}`)
          .join('\n')
      );
      
      // Per backend code, if address doesn't exist in DB, it returns a default profile with just the address field
      if (!response.ok) {
        console.error(`Failed to get profile: ${response.statusText}`);
        throw new ApiError(`Failed to get profile: ${response.statusText}`, response.status);
      }
      
      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        console.error('Error parsing JSON from profile response:', parseError);
        const responseText = await response.text();
        console.error('Raw response text:', responseText);
        throw new ApiError(`Failed to parse profile data: ${parseError.message}`, response.status);
      }
      
      console.log('Profile data received:', data);
      console.log('Raw profile data received:', JSON.stringify(data, null, 2));
      
      // Check if we got an empty object or null
      if (!data || Object.keys(data).length === 0) {
        console.log('Empty profile data returned');
        return null;
      }
      
      // Check if the profile has meaningful data beyond just the user_address
      // If user_name is empty and there's no other significant data, treat as non-existent profile
      if (!data.user_name && 
          !data.user_bio && 
          !data.github_account && 
          !data.x_account && 
          !data.tg_account && 
          !data.user_avatar) {
        console.log('Default profile returned - user has not set up profile yet');
        return null;
      }
      
      return data;
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error) {
    // Log the error for debugging
    console.error('API Error:', error);
    
    // Handle aborted requests
    if (error.name === 'AbortError') {
      throw new ApiError('Request timed out after 10 seconds', 408);
    }
    
    // Rethrow as an ApiError if it's not already
    if (error instanceof ApiError) {
      throw error;
    }
    
    throw new ApiError(`Failed to get profile: ${(error as Error).message}`, 500);
  }
};