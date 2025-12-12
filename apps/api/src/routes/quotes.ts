import { Hono } from 'hono';

const quotes = new Hono();

// Placeholder - Will be implemented in Tier 3
quotes.post('/', (c) => c.json({ message: 'Quotes API - Coming in Tier 3' }));

export default quotes;

