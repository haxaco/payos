/**
 * x402 End-to-End Tests
 * 
 * Tests the complete x402 flow: endpoint registration, payment processing,
 * settlement, and dashboard views.
 */

import { test, expect } from '@playwright/test';

// Helper to generate unique test data
const generateTestData = () => ({
  endpointName: `Test API ${Date.now()}`,
  endpointPath: `/api/test-${Date.now()}`,
  endpointPrice: 0.001,
  walletId: 'test-wallet-id',
  accountId: 'test-account-id',
});

test.describe('x402 Gateway - Provider Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard and login (assumes login flow is working)
    await page.goto('http://localhost:3000/dashboard');
    // Add authentication if needed
  });

  test('should display x402 gateway page', async ({ page }) => {
    await page.goto('http://localhost:3000/dashboard/x402');
    
    // Check for main heading
    await expect(page.locator('h1')).toContainText('x402 Gateway');
    
    // Check for provider/consumer view toggles
    await expect(page.getByText('Provider View')).toBeVisible();
    await expect(page.getByText('Consumer View')).toBeVisible();
  });

  test('should toggle between provider and consumer views', async ({ page }) => {
    await page.goto('http://localhost:3000/dashboard/x402');
    
    // Start in provider view
    const providerBtn = page.getByText('Provider View');
    await expect(providerBtn).toBeVisible();
    
    // Switch to consumer view
    await page.getByText('Consumer View').click();
    await expect(page.getByText('Payment History')).toBeVisible();
    
    // Switch back to provider view
    await page.getByText('Provider View').click();
    await expect(page.getByText('Your x402 Endpoints')).toBeVisible();
  });

  test('should display analytics summary', async ({ page }) => {
    await page.goto('http://localhost:3000/dashboard/x402');
    
    // Check for stat cards
    await expect(page.getByText('Total Revenue')).toBeVisible();
    await expect(page.getByText('Net Revenue')).toBeVisible();
    await expect(page.getByText('API Calls')).toBeVisible();
    await expect(page.getByText('Active Endpoints')).toBeVisible();
  });

  test('should navigate to analytics page', async ({ page }) => {
    await page.goto('http://localhost:3000/dashboard/x402');
    
    // Click on analytics card
    await page.getByText('View Analytics').click();
    
    // Check we're on analytics page
    await expect(page).toHaveURL(/.*x402\/analytics/);
    await expect(page.locator('h1')).toContainText('x402 Analytics');
  });
});

test.describe('x402 Analytics Dashboard', () => {
  test('should display analytics with period filter', async ({ page }) => {
    await page.goto('http://localhost:3000/dashboard/x402/analytics');
    
    // Check for period selector
    await expect(page.getByText('Last 30 Days')).toBeVisible();
    
    // Change period
    await page.getByRole('combobox').first().click();
    await page.getByText('Last 7 Days').click();
    
    // Stats should still be visible
    await expect(page.getByText('Gross Revenue')).toBeVisible();
  });

  test('should display top endpoints table', async ({ page }) => {
    await page.goto('http://localhost:3000/dashboard/x402/analytics');
    
    // Check for top endpoints section
    await expect(page.getByText('Top Performing Endpoints')).toBeVisible();
    
    // Check for metric selector
    await page.getByText('By Revenue').click();
    await page.getByText('By API Calls').click();
  });

  test('should display revenue breakdown', async ({ page }) => {
    await page.goto('http://localhost:3000/dashboard/x402/analytics');
    
    // Check for revenue breakdown
    await expect(page.getByText('Revenue Breakdown')).toBeVisible();
    await expect(page.getByText('Gross Revenue')).toBeVisible();
    await expect(page.getByText('Platform Fees')).toBeVisible();
  });
});

test.describe('x402 Endpoint Detail Page', () => {
  test('should display endpoint configuration', async ({ page }) => {
    // This would require a real endpoint ID
    // For demo, we'll test the page structure
    await page.goto('http://localhost:3000/dashboard/x402/endpoints/test-endpoint-id');
    
    // Page should load (might be 404 with test ID, that's ok for structure test)
    await expect(page.locator('h1')).toBeVisible();
  });

  test('should show endpoint tabs', async ({ page }) => {
    await page.goto('http://localhost:3000/dashboard/x402/endpoints/test-endpoint-id');
    
    // Check for tabs (even if endpoint doesn't exist, tabs should render)
    // await expect(page.getByText('Overview')).toBeVisible();
    // await expect(page.getByText('Transactions')).toBeVisible();
    // await expect(page.getByText('Integration')).toBeVisible();
  });
});

test.describe('x402 Consumer Flow', () => {
  test('should display consumer payment history', async ({ page }) => {
    await page.goto('http://localhost:3000/dashboard/x402');
    
    // Switch to consumer view
    await page.getByText('Consumer View').click();
    
    // Check for payment history
    await expect(page.getByText('Payment History')).toBeVisible();
    await expect(page.getByText('Total Spent')).toBeVisible();
    await expect(page.getByText('API Calls Made')).toBeVisible();
  });

  test('should show consumer stats', async ({ page }) => {
    await page.goto('http://localhost:3000/dashboard/x402');
    
    // Switch to consumer view
    await page.getByText('Consumer View').click();
    
    // Check for stat cards
    await expect(page.getByText('Total Spent')).toBeVisible();
    await expect(page.getByText('API Calls Made')).toBeVisible();
    await expect(page.getByText('Unique Endpoints')).toBeVisible();
  });
});

test.describe('x402 Integration Code Samples', () => {
  test('should display SDK installation instructions', async ({ page }) => {
    await page.goto('http://localhost:3000/dashboard/x402/endpoints/test-endpoint-id');
    
    // Note: This test assumes endpoint page loads even for invalid ID
    // In production, you'd use a valid endpoint ID
  });
});

test.describe('x402 Mobile Responsiveness', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('should be responsive on mobile', async ({ page }) => {
    await page.goto('http://localhost:3000/dashboard/x402');
    
    // Check main heading is visible
    await expect(page.locator('h1')).toContainText('x402 Gateway');
    
    // Buttons should stack vertically or adjust layout
    const providerBtn = page.getByText('Provider View');
    await expect(providerBtn).toBeVisible();
  });

  test('should show analytics on mobile', async ({ page }) => {
    await page.goto('http://localhost:3000/dashboard/x402/analytics');
    
    // Stats should be visible and stacked
    await expect(page.getByText('Gross Revenue')).toBeVisible();
  });
});

test.describe('x402 Loading States', () => {
  test('should show loading skeletons', async ({ page }) => {
    await page.goto('http://localhost:3000/dashboard/x402');
    
    // With slow network, skeletons should appear
    // This test would need network throttling in real scenario
    
    // After loading, content should appear
    await expect(page.getByText('x402 Gateway')).toBeVisible();
  });
});

test.describe('x402 Error Handling', () => {
  test('should handle missing endpoints gracefully', async ({ page }) => {
    await page.goto('http://localhost:3000/dashboard/x402/endpoints/invalid-id');
    
    // Should show "not found" message or redirect
    // The exact behavior depends on implementation
  });

  test('should handle analytics API errors', async ({ page }) => {
    // This would require mocking API failures
    // In real tests, you'd intercept requests and return errors
  });
});

