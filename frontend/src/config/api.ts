/**
 * Configuration for API endpoints
 */

// Backend API base URL - can be adjusted per environment
export const API_CONFIG = {
  // Default to localhost:8080 for development
  baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080',
  
  // Endpoints
  endpoints: {
    profile: '/api/profile',
  }
};

/**
 * Helper function to get the full URL for an API endpoint
 */
export const getApiUrl = (endpoint: keyof typeof API_CONFIG.endpoints): string => {
  return `${API_CONFIG.baseUrl}${API_CONFIG.endpoints[endpoint]}`;
};