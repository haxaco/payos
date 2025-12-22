/**
 * x402 Schema Validation
 * 
 * Validates that all x402 database tables and columns exist
 * 
 * Run with: tsx scripts/validate-x402-schema.ts
 */

// Use MCP Supabase tools instead for validation
console.log('For schema validation, use the Supabase MCP tools or query directly.');
console.log('Checking via direct Supabase queries...\n');

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY!;

// Create a simple fetch-based client
const supabaseRequest = async (table: string, select?: string) => {
  const url = `${SUPABASE_URL}/rest/v1/${table}${select ? `?select=${select}` : ''}`;
  const response = await fetch(url, {
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Prefer': 'count=exact'
    }
  });
  
  const count = response.headers.get('content-range')?.split('/')[1];
  
  if (!response.ok && response.status !== 416) {
    const error = await response.json();
    throw new Error(JSON.stringify(error));
  }
  
  return {
    ok: response.ok || response.status === 416,
    count: count ? parseInt(count) : 0
  };
};

interface ValidationResult {
  name: string;
  passed: boolean;
  error?: string;
}

async function validateSchema(): Promise<ValidationResult[]> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const results: ValidationResult[] = [];
  
  console.log('🔍 Validating x402 Database Schema...\n');
  
  // Test 1: x402_endpoints table exists
  try {
    const { data, error } = await supabase
      .from('x402_endpoints')
      .select('id')
      .limit(1);
    
    if (error && error.code !== 'PGRST116') {
      throw error;
    }
    
    results.push({
      name: 'x402_endpoints table exists',
      passed: true
    });
    console.log('✅ x402_endpoints table exists');
  } catch (error: any) {
    results.push({
      name: 'x402_endpoints table exists',
      passed: false,
      error: error.message
    });
    console.log('❌ x402_endpoints table missing');
  }
  
  // Test 2: wallets table exists
  try {
    const { data, error } = await supabase
      .from('wallets')
      .select('id')
      .limit(1);
    
    if (error && error.code !== 'PGRST116') {
      throw error;
    }
    
    results.push({
      name: 'wallets table exists',
      passed: true
    });
    console.log('✅ wallets table exists');
  } catch (error: any) {
    results.push({
      name: 'wallets table exists',
      passed: false,
      error: error.message
    });
    console.log('❌ wallets table missing');
  }
  
  // Test 3: Check transfers table has x402_metadata column
  try {
    const { data, error } = await supabase
      .from('transfers')
      .select('id, x402_metadata')
      .limit(1);
    
    if (error && error.code !== 'PGRST116') {
      throw error;
    }
    
    results.push({
      name: 'transfers.x402_metadata column exists',
      passed: true
    });
    console.log('✅ transfers.x402_metadata column exists');
  } catch (error: any) {
    results.push({
      name: 'transfers.x402_metadata column exists',
      passed: false,
      error: error.message
    });
    console.log('❌ transfers.x402_metadata column missing');
  }
  
  // Test 4: Check accounts table has agent_config column
  try {
    const { data, error } = await supabase
      .from('accounts')
      .select('id, agent_config')
      .limit(1);
    
    if (error && error.code !== 'PGRST116') {
      throw error;
    }
    
    results.push({
      name: 'accounts.agent_config column exists',
      passed: true
    });
    console.log('✅ accounts.agent_config column exists');
  } catch (error: any) {
    results.push({
      name: 'accounts.agent_config column exists',
      passed: false,
      error: error.message
    });
    console.log('❌ accounts.agent_config column missing');
  }
  
  // Test 5: Check x402_endpoints has required columns
  try {
    const { data, error } = await supabase
      .from('x402_endpoints')
      .select('id, name, path, method, base_price, currency, payment_address, network, status, total_calls, total_revenue')
      .limit(1);
    
    if (error && error.code !== 'PGRST116') {
      throw error;
    }
    
    results.push({
      name: 'x402_endpoints has all required columns',
      passed: true
    });
    console.log('✅ x402_endpoints has all required columns');
  } catch (error: any) {
    results.push({
      name: 'x402_endpoints has all required columns',
      passed: false,
      error: error.message
    });
    console.log('❌ x402_endpoints missing columns');
  }
  
  // Test 6: Check wallets has required columns
  try {
    const { data, error } = await supabase
      .from('wallets')
      .select('id, owner_account_id, managed_by_agent_id, balance, currency, spending_policy, payment_address, network, status')
      .limit(1);
    
    if (error && error.code !== 'PGRST116') {
      throw error;
    }
    
    results.push({
      name: 'wallets has all required columns',
      passed: true
    });
    console.log('✅ wallets has all required columns');
  } catch (error: any) {
    results.push({
      name: 'wallets has all required columns',
      passed: false,
      error: error.message
    });
    console.log('❌ wallets missing columns');
  }
  
  // Test 7: Count existing data
  try {
    const { count: endpointsCount } = await supabase
      .from('x402_endpoints')
      .select('*', { count: 'exact', head: true });
    
    const { count: walletsCount } = await supabase
      .from('wallets')
      .select('*', { count: 'exact', head: true });
    
    console.log(`\n📊 Current Data:`);
    console.log(`   - x402_endpoints: ${endpointsCount || 0} rows`);
    console.log(`   - wallets: ${walletsCount || 0} rows`);
    
    results.push({
      name: 'Data count retrieved',
      passed: true
    });
  } catch (error: any) {
    results.push({
      name: 'Data count retrieved',
      passed: false,
      error: error.message
    });
  }
  
  return results;
}

// Run validation
validateSchema()
  .then(results => {
    const passed = results.filter(r => r.passed).length;
    const total = results.length;
    
    console.log(`\n${'='.repeat(50)}`);
    console.log(`Validation Results: ${passed}/${total} passed`);
    console.log('='.repeat(50));
    
    if (passed === total) {
      console.log('\n✅ All schema validations passed!');
      console.log('   The database is ready for x402 operations.');
      process.exit(0);
    } else {
      console.log('\n⚠️  Some validations failed:');
      results
        .filter(r => !r.passed)
        .forEach(r => {
          console.log(`   ❌ ${r.name}`);
          if (r.error) {
            console.log(`      Error: ${r.error}`);
          }
        });
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('\n❌ Validation failed with error:', error);
    process.exit(1);
  });

