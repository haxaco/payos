/**
 * Authentication helpers for PayOS SDK
 * 
 * Supports both API key and username/password authentication
 */

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: {
    id: string;
    email: string;
    tenant_id: string;
  };
}

/**
 * Authenticate with email and password to get an access token
 * 
 * @param credentials - Email and password
 * @param apiUrl - PayOS API URL (default: http://localhost:4000)
 * @returns Login response with access token
 * 
 * @example
 * ```ts
 * const auth = await loginWithPassword({
 *   email: 'user@example.com',
 *   password: 'mypassword'
 * });
 * 
 * const payos = new PayOS({
 *   apiKey: auth.access_token,
 *   environment: 'sandbox'
 * });
 * ```
 */
export async function loginWithPassword(
  credentials: LoginCredentials,
  apiUrl: string = 'http://localhost:4000'
): Promise<LoginResponse> {
  const response = await fetch(`${apiUrl}/v1/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(credentials),
  });

  if (!response.ok) {
    const error: any = await response.json().catch(() => ({ 
      error: response.statusText 
    }));
    throw new Error(error.error || `Login failed: ${response.status}`);
  }

  return response.json() as Promise<LoginResponse>;
}

/**
 * Create a PayOS SDK instance with username/password authentication
 * 
 * @param credentials - Email and password
 * @param environment - Environment to connect to
 * @param apiUrl - PayOS API URL (default: http://localhost:4000)
 * @returns PayOS instance authenticated with the user's session
 * 
 * @example
 * ```ts
 * import { PayOS, createWithPassword } from '@payos/sdk';
 * 
 * const payos = await createWithPassword({
 *   email: 'user@example.com',
 *   password: 'mypassword',
 * }, 'sandbox');
 * 
 * // Now use payos normally
 * const mandate = await payos.ap2.createMandate({...});
 * ```
 */
export async function createWithPassword(
  credentials: LoginCredentials,
  environment: 'sandbox' | 'testnet' | 'production' = 'sandbox',
  apiUrl?: string
): Promise<any> {
  // Dynamic import to avoid circular dependency
  const { PayOS } = await import('./index');
  
  const auth = await loginWithPassword(credentials, apiUrl);
  
  return new PayOS({
    apiKey: auth.access_token,
    environment,
    apiUrl,
  });
}

/**
 * Verify if an API key is valid
 * 
 * @param apiKey - API key to verify
 * @param apiUrl - PayOS API URL
 * @returns True if valid, false otherwise
 */
export async function verifyApiKey(
  apiKey: string,
  apiUrl: string = 'http://localhost:4000'
): Promise<boolean> {
  try {
    const response = await fetch(`${apiUrl}/v1/auth/me`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });
    return response.ok;
  } catch {
    return false;
  }
}

