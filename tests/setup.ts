/**
 * Vitest global setup
 */

// Set test environment variables
process.env.NODE_ENV = 'test';

// Global test configuration
export const TEST_API_BASE = 'http://localhost:3000';
export const TEST_API_KEY = 'sk_llamune_default_key_change_this';

// Wait for API server to be ready
export async function waitForApiServer(maxAttempts = 10): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(`${TEST_API_BASE}/health`);
      if (response.ok) {
        return true;
      }
    } catch {
      // Server not ready yet
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  return false;
}

// Verify API server is running before tests
beforeAll(async () => {
  const isReady = await waitForApiServer();
  if (!isReady) {
    throw new Error('API server is not running. Please start it with: npm run api');
  }
});
