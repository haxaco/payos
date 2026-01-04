
async function seedCards(supabase: any, tenantId: string, accounts: any[], summary: Summary) {
    console.log('💳 Creating cards...');

    const cards = [
        {
            tenant_id: tenantId,
            account_id: accounts[0].id,
            type: 'virtual',
            status: 'active',
            last_4: '4242',
            exp_month: 12,
            exp_year: 2028,
            brand: 'Visa',
            cardholder_name: 'Haxaco Personal',
            billing_address: {
                line1: '123 Main St',
                city: 'San Francisco',
                state: 'CA',
                postal_code: '94105',
                country: 'US',
            },
            limits: {
                daily: 1000,
                monthly: 5000,
            },
            currency: 'USDC',
        },
        {
            tenant_id: tenantId,
            account_id: accounts[1].id,
            type: 'physical',
            status: 'active',
            last_4: '8888',
            exp_month: 11,
            exp_year: 2027,
            brand: 'Mastercard',
            cardholder_name: 'Haxaco Business',
            billing_address: {
                line1: '456 Market St',
                city: 'San Francisco',
                state: 'CA',
                postal_code: '94103',
                country: 'US',
            },
            limits: {
                daily: 5000,
                monthly: 20000,
            },
            currency: 'USDC',
        },
        {
            tenant_id: tenantId,
            account_id: accounts[0].id,
            type: 'virtual',
            status: 'frozen',
            last_4: '1234',
            exp_month: 1,
            exp_year: 2026,
            brand: 'Visa',
            cardholder_name: 'Haxaco Subscription',
            billing_address: {
                line1: '123 Main St',
                city: 'San Francisco',
                state: 'CA',
                postal_code: '94105',
                country: 'US',
            },
            limits: {
                daily: 100,
                monthly: 300,
            },
            currency: 'USDC',
        },
    ];

    for (const card of cards) {
        const { error } = await supabase.from('cards').insert(card);
        if (!error) summary.cards++;
    }

    console.log(`  ✅ Created ${summary.cards} cards\n`);
}
