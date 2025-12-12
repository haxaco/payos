import { Hono } from 'hono';

const accounts = new Hono();

// Placeholder - Will be implemented in Tier 2
accounts.get('/', (c) => c.json({ message: 'Accounts API - Coming in Tier 2' }));
accounts.post('/', (c) => c.json({ message: 'Accounts API - Coming in Tier 2' }));
accounts.get('/:id', (c) => c.json({ message: 'Accounts API - Coming in Tier 2' }));
accounts.patch('/:id', (c) => c.json({ message: 'Accounts API - Coming in Tier 2' }));
accounts.get('/:id/balances', (c) => c.json({ message: 'Accounts API - Coming in Tier 2' }));
accounts.get('/:id/agents', (c) => c.json({ message: 'Accounts API - Coming in Tier 2' }));
accounts.get('/:id/streams', (c) => c.json({ message: 'Accounts API - Coming in Tier 2' }));

export default accounts;

