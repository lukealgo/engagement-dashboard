import { config } from '../config/environment';

export interface HiBobApiError {
  status: number;
  message: string;
  details?: any;
}

export class HiBobApiClient {
  private baseUrl: string;
  private serviceUserId: string;
  private apiKey: string;
  private headers: Record<string, string>;

  constructor() {
    this.baseUrl = config.hibob.baseUrl;
    this.serviceUserId = config.hibob.serviceUserId;
    this.apiKey = config.hibob.apiKey;

    // Create base64 encoded credentials for Basic Auth
    const credentials = `${this.serviceUserId}:${this.apiKey}`;
    const encodedCredentials = Buffer.from(credentials).toString('base64');

    this.headers = {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${encodedCredentials}`
    };
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.headers,
          ...options.headers
        }
      });

      if (!response.ok) {
        const errorData = await response.text();
        const errorMessage = `HiBob API error ${response.status}: ${errorData || 'Unknown error'}`;

        if (response.status === 401) {
          console.warn('HiBob API 401: Authentication failed. Please check your API credentials.');
          throw new Error('HiBob API Authentication Failed: Please verify your HIBOBSECRET and HIBOBSERVICE credentials.');
        } else if (response.status === 403) {
          console.warn('HiBob API 403: Insufficient permissions. Please check service user permissions.');
          throw new Error('HiBob API Access Denied: Please verify your service user has the required permissions.');
        } else if (response.status === 429) {
          console.warn('HiBob API 429: Rate limit exceeded.');
          throw new Error('HiBob API Rate Limited: Please wait before retrying.');
        }

        throw new Error(errorMessage);
      }

      // Handle empty responses
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        return data as T;
      } else {
        const text = await response.text();
        return text as T;
      }
    } catch (error) {
      console.error(`HiBob API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.makeRequest<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.makeRequest<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.makeRequest<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.makeRequest<T>(endpoint, { method: 'DELETE' });
  }

  // Rate limiting helper - HiBob has various rate limits per endpoint
  async withRateLimit<T>(
    operation: () => Promise<T>,
    delayMs: number = 1000
  ): Promise<T> {
    try {
      return await operation();
    } catch (error: any) {
      if (error.message.includes('429') || error.message.includes('rate limit')) {
        console.log(`Rate limited, waiting ${delayMs}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        return this.withRateLimit(operation, delayMs * 2); // Exponential backoff
      }
      throw error;
    }
  }
}
