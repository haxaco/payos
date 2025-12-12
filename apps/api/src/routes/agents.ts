import { Hono } from 'hono';

const agents = new Hono();

// Placeholder - Will be implemented in Tier 4
agents.get('/', (c) => c.json({ message: 'Agents API - Coming in Tier 4' }));
agents.post('/', (c) => c.json({ message: 'Agents API - Coming in Tier 4' }));
agents.get('/:id', (c) => c.json({ message: 'Agents API - Coming in Tier 4' }));
agents.patch('/:id', (c) => c.json({ message: 'Agents API - Coming in Tier 4' }));
agents.get('/:id/streams', (c) => c.json({ message: 'Agents API - Coming in Tier 4' }));
agents.post('/:id/suspend', (c) => c.json({ message: 'Agents API - Coming in Tier 4' }));
agents.post('/:id/activate', (c) => c.json({ message: 'Agents API - Coming in Tier 4' }));

export default agents;

