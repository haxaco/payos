
async function seedCompliance(supabase: any, tenantId: string, accounts: any[], transfers: any[], now: Date, summary: Summary) {
    console.log('🚩 Creating compliance flags...');

    // We need transfers for some flags. We haven't fetched them in main(), so let's try to pass them or fetch them here.
    // Since passing them from main requires changing main's signature significantly (fetching transfers there), 
    // let's fetch a few transfers here.

    let localTransfers = transfers;
    if (!localTransfers || localTransfers.length === 0) {
        const { data } = await supabase
            .from('transfers')
            .select('id')
            .eq('tenant_id', tenantId)
            .limit(5);
        localTransfers = data || [];
    }

    const flags = [
        {
            tenant_id: tenantId,
            flag_type: 'transaction',
            risk_level: 'high',
            status: 'open',
            transfer_id: localTransfers[0]?.id,
            reason_code: 'velocity_check',
            reasons: [
                'High transaction velocity detected',
                'New account relationship',
                'Amount above typical threshold',
            ],
            description: 'Account showing unusual velocity patterns with multiple new recipients in short timeframe.',
            ai_analysis: {
                risk_score: 78,
                risk_explanation: 'This transaction pattern matches characteristics of both legitimate business scaling and potential structuring. The velocity of new recipient additions warrants manual review.',
                pattern_matches: [
                    { description: 'Legitimate business scaling', percentage: 65 },
                    { description: 'Potential structuring activity', percentage: 15 },
                ],
                suggested_actions: [
                    { action: 'Verify business relationship documentation', completed: false },
                    { action: 'Review account holder communication history', completed: false },
                    { action: 'Check for similar patterns in network', completed: false },
                ],
                confidence_level: 82,
            },
            due_date: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
            tenant_id: tenantId,
            flag_type: 'transaction',
            risk_level: 'medium',
            status: 'pending_review',
            transfer_id: localTransfers[1]?.id,
            reason_code: 'amount_threshold',
            reasons: [
                'Amount just below reporting threshold',
                'First transaction in this corridor',
            ],
            description: 'Transaction amount is just below $2,500 monitoring threshold, which may indicate structuring.',
            ai_analysis: {
                risk_score: 62,
                risk_explanation: 'While amount-based structuring is a concern, this could also be legitimate first-time payment. Customer profile suggests regular contractor payments.',
                pattern_matches: [
                    { description: 'Legitimate contractor payment', percentage: 70 },
                    { description: 'Structuring attempts', percentage: 10 },
                ],
                suggested_actions: [
                    { action: 'Request invoice or contract', completed: true },
                    { action: 'Monitor for repeated similar amounts', completed: false },
                ],
                confidence_level: 75,
            },
            due_date: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
            tenant_id: tenantId,
            flag_type: 'account',
            risk_level: 'medium',
            status: 'under_investigation',
            account_id: accounts[1]?.id,
            reason_code: 'new_account_velocity',
            reasons: [
                'Account created recently with immediate high activity',
                'KYC verification tier below activity level',
            ],
            description: 'New account showing high transaction volume relative to verification tier.',
            ai_analysis: {
                risk_score: 58,
                risk_explanation: 'New business accounts often show rapid activity, but verification tier should match activity level for AML compliance.',
                pattern_matches: [
                    { description: 'Normal business onboarding', percentage: 75 },
                    { description: 'Shell company activity', percentage: 5 },
                ],
                suggested_actions: [
                    { action: 'Request KYB documentation', completed: true },
                    { action: 'Verify business registration', completed: true },
                    { action: 'Upgrade to Tier 2 KYB', completed: false },
                ],
                confidence_level: 88,
            },
            due_date: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
            tenant_id: tenantId,
            flag_type: 'pattern',
            risk_level: 'low',
            status: 'open',
            reason_code: 'new_corridor_monitoring',
            reasons: [
                'First transaction in new geographic corridor',
                'Standard monitoring for new routes',
            ],
            description: 'Monitoring flag for first-time transactions in new geographic corridors.',
            ai_analysis: {
                risk_score: 25,
                risk_explanation: 'Standard compliance monitoring for new corridor. No immediate concerns detected.',
                pattern_matches: [
                    { description: 'Business expansion', percentage: 85 },
                    { description: 'Sanctions risk', percentage: 2 },
                ],
                suggested_actions: [
                    { action: 'Monitor transaction patterns for 30 days', completed: false },
                ],
                confidence_level: 92,
            },
            due_date: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
            tenant_id: tenantId,
            flag_type: 'transaction',
            risk_level: 'critical',
            status: 'escalated',
            transfer_id: localTransfers[2]?.id || localTransfers[0]?.id,
            reason_code: 'sanctions_potential_match',
            reasons: [
                'Name similarity to sanctions list entry',
                'Geographic risk indicators present',
                'Requires senior compliance review',
            ],
            description: 'Potential sanctions match requires immediate senior compliance review and possible account freeze.',
            ai_analysis: {
                risk_score: 92,
                risk_explanation: 'High-confidence potential match to OFAC sanctions list. Immediate review required before processing.',
                pattern_matches: [
                    { description: 'False positive name match', percentage: 45 },
                    { description: 'Sanctions list match', percentage: 40 },
                ],
                suggested_actions: [
                    { action: 'Freeze transaction immediately', completed: true },
                    { action: 'Escalate to senior compliance officer', completed: true },
                    { action: 'Run enhanced due diligence', completed: false },
                    { action: 'File SAR if confirmed', completed: false },
                ],
                confidence_level: 88,
            },
            due_date: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            escalated_at: new Date().toISOString(),
        },
    ];

    for (const flag of flags) {
        const { error } = await supabase.from('compliance_flags').insert(flag);
        if (!error) summary.flags++;
    }

    console.log(`  ✅ Created ${summary.flags} compliance flags\n`);
}
