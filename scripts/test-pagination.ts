#!/usr/bin/env tsx

/**
 * Automated Pagination Test Suite
 * 
 * Tests pagination functionality across all 12 PayOS dashboard pages
 * Run with: npx tsx scripts/test-pagination.ts
 */

const API_URL = process.env.API_URL || 'https://payos-api.up.railway.app/v1';
const TEST_EMAIL = 'haxaco@gmail.com';
const TEST_PASSWORD = 'Password123!';

interface PaginationResponse {
  data: any[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  count?: number; // Some APIs use this instead
}

interface TestResult {
  endpoint: string;
  passed: boolean;
  message: string;
  details?: any;
}

const results: TestResult[] = [];

// Colors for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function authenticate(): Promise<string> {
  log('\n🔐 Authenticating...', 'cyan');
  
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    }),
  });

  if (!response.ok) {
    throw new Error(`Authentication failed: ${response.status}`);
  }

  const data = await response.json();
  log('✅ Authentication successful', 'green');
  return data.accessToken;
}

async function testPagination(
  token: string,
  endpoint: string,
  expectedTotal: number,
  testName: string
): Promise<void> {
  log(`\n📊 Testing: ${testName}`, 'blue');
  log(`   Endpoint: ${endpoint}`, 'cyan');

  try {
    // Test 1: First page with default limit (50)
    const page1Response = await fetch(`${API_URL}${endpoint}?page=1&limit=50`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!page1Response.ok) {
      throw new Error(`HTTP ${page1Response.status}: ${await page1Response.text()}`);
    }

    const page1Data: PaginationResponse = await page1Response.json();
    const total = page1Data.pagination?.total || page1Data.count || 0;
    const recordsReceived = page1Data.data?.length || 0;

    // Validate total count
    if (total !== expectedTotal) {
      results.push({
        endpoint,
        passed: false,
        message: `❌ Total count mismatch. Expected ${expectedTotal}, got ${total}`,
      });
      log(`   ❌ FAIL: Expected ${expectedTotal} records, got ${total}`, 'red');
      return;
    }

    log(`   ✅ Total count correct: ${total}`, 'green');

    // Validate first page data
    const expectedPageSize = Math.min(50, total);
    if (recordsReceived !== expectedPageSize) {
      results.push({
        endpoint,
        passed: false,
        message: `❌ Page 1 size mismatch. Expected ${expectedPageSize}, got ${recordsReceived}`,
      });
      log(`   ❌ FAIL: Expected ${expectedPageSize} records on page 1, got ${recordsReceived}`, 'red');
      return;
    }

    log(`   ✅ Page 1 size correct: ${recordsReceived} records`, 'green');

    // Test 2: Second page (if exists)
    if (total > 50) {
      const page2Response = await fetch(`${API_URL}${endpoint}?page=2&limit=50`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!page2Response.ok) {
        throw new Error(`Page 2 fetch failed: ${page2Response.status}`);
      }

      const page2Data: PaginationResponse = await page2Response.json();
      const page2Records = page2Data.data?.length || 0;
      const expectedPage2Size = Math.min(50, total - 50);

      if (page2Records !== expectedPage2Size) {
        results.push({
          endpoint,
          passed: false,
          message: `❌ Page 2 size mismatch. Expected ${expectedPage2Size}, got ${page2Records}`,
        });
        log(`   ❌ FAIL: Page 2 size incorrect`, 'red');
        return;
      }

      log(`   ✅ Page 2 size correct: ${page2Records} records`, 'green');

      // Check for duplicate IDs between pages
      const page1Ids = new Set(page1Data.data.map((item: any) => item.id));
      const page2Ids = new Set(page2Data.data.map((item: any) => item.id));
      const duplicates = [...page1Ids].filter(id => page2Ids.has(id));

      if (duplicates.length > 0) {
        results.push({
          endpoint,
          passed: false,
          message: `❌ Found ${duplicates.length} duplicate IDs between pages`,
          details: { duplicates: duplicates.slice(0, 5) },
        });
        log(`   ❌ FAIL: Duplicate records found between pages`, 'red');
        return;
      }

      log(`   ✅ No duplicate records between pages`, 'green');
    }

    // Test 3: Different page sizes
    const page1Limit10Response = await fetch(`${API_URL}${endpoint}?page=1&limit=10`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!page1Limit10Response.ok) {
      throw new Error(`Limit=10 fetch failed: ${page1Limit10Response.status}`);
    }

    const page1Limit10Data: PaginationResponse = await page1Limit10Response.json();
    const limit10Records = page1Limit10Data.data?.length || 0;
    const expectedLimit10 = Math.min(10, total);

    if (limit10Records !== expectedLimit10) {
      results.push({
        endpoint,
        passed: false,
        message: `❌ Limit=10 test failed. Expected ${expectedLimit10}, got ${limit10Records}`,
      });
      log(`   ❌ FAIL: Items per page (10) not working correctly`, 'red');
      return;
    }

    log(`   ✅ Items per page (10) works correctly`, 'green');

    // Test 4: Last page
    const totalPages = Math.ceil(total / 50);
    if (totalPages > 1) {
      const lastPageResponse = await fetch(`${API_URL}${endpoint}?page=${totalPages}&limit=50`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!lastPageResponse.ok) {
        throw new Error(`Last page fetch failed: ${lastPageResponse.status}`);
      }

      const lastPageData: PaginationResponse = await lastPageResponse.json();
      const lastPageRecords = lastPageData.data?.length || 0;
      const expectedLastPageSize = total - (totalPages - 1) * 50;

      if (lastPageRecords !== expectedLastPageSize) {
        results.push({
          endpoint,
          passed: false,
          message: `❌ Last page size mismatch. Expected ${expectedLastPageSize}, got ${lastPageRecords}`,
        });
        log(`   ❌ FAIL: Last page size incorrect`, 'red');
        return;
      }

      log(`   ✅ Last page size correct: ${lastPageRecords} records`, 'green');
    }

    // All tests passed
    results.push({
      endpoint,
      passed: true,
      message: `✅ All pagination tests passed for ${testName}`,
      details: { total, pages: Math.ceil(total / 50) },
    });
    log(`   ✅ PASS: All pagination tests passed`, 'green');

  } catch (error: any) {
    results.push({
      endpoint,
      passed: false,
      message: `❌ Error: ${error.message}`,
      details: { error: error.stack },
    });
    log(`   ❌ ERROR: ${error.message}`, 'red');
  }
}

async function runAllTests() {
  log('\n' + '='.repeat(60), 'cyan');
  log('📋 PAGINATION TEST SUITE', 'cyan');
  log('='.repeat(60), 'cyan');

  try {
    const token = await authenticate();

    // Define all endpoints to test
    const endpoints = [
      { path: '/accounts', total: 1072, name: 'Accounts' },
      { path: '/transfers', total: 30884, name: 'Transfers' },
      { path: '/scheduled-transfers', total: 60, name: 'Schedules' },
      { path: '/refunds', total: 12, name: 'Refunds' },
      { path: '/card-transactions', total: 61, name: 'Cards' },
      { path: '/compliance/flags', total: 15, name: 'Compliance' },
      { path: '/reports', total: 147, name: 'Reports' },
      { path: '/agents', total: 68, name: 'Agents' },
      { path: '/x402/endpoints', total: 62, name: 'x402 Endpoints' },
      { path: '/wallets', total: 69, name: 'x402 Wallets' },
    ];

    // Run tests for each endpoint
    for (const endpoint of endpoints) {
      await testPagination(token, endpoint.path, endpoint.total, endpoint.name);
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Print summary
    log('\n' + '='.repeat(60), 'cyan');
    log('📊 TEST SUMMARY', 'cyan');
    log('='.repeat(60), 'cyan');

    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;

    log(`\nTotal Tests: ${results.length}`, 'blue');
    log(`Passed: ${passed}`, 'green');
    log(`Failed: ${failed}`, failed > 0 ? 'red' : 'green');

    if (failed > 0) {
      log('\n❌ FAILED TESTS:', 'red');
      results
        .filter(r => !r.passed)
        .forEach(r => {
          log(`   • ${r.endpoint}: ${r.message}`, 'red');
        });
    }

    log('\n' + '='.repeat(60), 'cyan');

    if (failed === 0) {
      log('✅ ALL PAGINATION TESTS PASSED! 🎉', 'green');
      log('All 10 endpoints support proper pagination.', 'green');
    } else {
      log('❌ SOME TESTS FAILED', 'red');
      log('Review failed tests above for details.', 'yellow');
    }

    log('='.repeat(60) + '\n', 'cyan');

    // Exit with appropriate code
    process.exit(failed > 0 ? 1 : 0);

  } catch (error: any) {
    log('\n❌ FATAL ERROR:', 'red');
    log(error.message, 'red');
    log(error.stack, 'yellow');
    process.exit(1);
  }
}

// Run the test suite
runAllTests();

