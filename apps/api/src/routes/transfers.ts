import { Hono } from 'hono';

const transfers = new Hono();

// Placeholder - Will be implemented in Tier 3
transfers.get('/', (c) => c.json({ message: 'Transfers API - Coming in Tier 3' }));
transfers.post('/', (c) => c.json({ message: 'Transfers API - Coming in Tier 3' }));
transfers.get('/:id', (c) => c.json({ message: 'Transfers API - Coming in Tier 3' }));

export default transfers;


