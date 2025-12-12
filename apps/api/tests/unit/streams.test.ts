import { describe, it, expect } from 'vitest';
import {
  calculateStreamedAmount,
  calculateRunway,
  calculateStreamState,
  calculateBuffer,
  calculateMinimumFunding,
  calculateHealth,
  formatRunway,
} from '../../src/services/streams.js';

describe('Stream Service', () => {
  describe('calculateStreamedAmount', () => {
    it('returns stored value for cancelled streams', () => {
      const result = calculateStreamedAmount({
        status: 'cancelled',
        startedAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        totalStreamed: 100,
        totalPausedSeconds: 0,
        flowRatePerSecond: 0.01,
        fundedAmount: 1000,
      });
      expect(result).toBe(100);
    });

    it('returns stored value for paused streams', () => {
      const result = calculateStreamedAmount({
        status: 'paused',
        startedAt: new Date(Date.now() - 3600000).toISOString(),
        totalStreamed: 50,
        totalPausedSeconds: 0,
        flowRatePerSecond: 0.01,
        fundedAmount: 1000,
      });
      expect(result).toBe(50);
    });

    it('calculates streamed amount for active streams', () => {
      const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
      const flowRatePerSecond = 0.01; // $0.01/second = $36/hour
      
      const result = calculateStreamedAmount({
        status: 'active',
        startedAt: oneHourAgo,
        totalStreamed: 0,
        totalPausedSeconds: 0,
        flowRatePerSecond,
        fundedAmount: 1000,
      });
      
      // Should be approximately 36 (3600 seconds * 0.01)
      expect(result).toBeGreaterThan(35);
      expect(result).toBeLessThan(37);
    });

    it('caps streamed amount at funded amount', () => {
      const result = calculateStreamedAmount({
        status: 'active',
        startedAt: new Date(Date.now() - 86400000 * 30).toISOString(), // 30 days ago
        totalStreamed: 0,
        totalPausedSeconds: 0,
        flowRatePerSecond: 0.01,
        fundedAmount: 100,
      });
      expect(result).toBe(100);
    });

    it('subtracts paused time from calculation', () => {
      const twoHoursAgo = new Date(Date.now() - 7200000).toISOString();
      const flowRatePerSecond = 0.01;
      
      const result = calculateStreamedAmount({
        status: 'active',
        startedAt: twoHoursAgo,
        totalStreamed: 0,
        totalPausedSeconds: 3600, // 1 hour paused
        flowRatePerSecond,
        fundedAmount: 1000,
      });
      
      // Should be approximately 36 (1 hour of actual streaming)
      expect(result).toBeGreaterThan(35);
      expect(result).toBeLessThan(37);
    });
  });

  describe('calculateHealth', () => {
    it('returns healthy for > 7 days runway', () => {
      const eightDays = 8 * 24 * 60 * 60;
      expect(calculateHealth(eightDays)).toBe('healthy');
    });

    it('returns warning for 1-7 days runway', () => {
      const threeDays = 3 * 24 * 60 * 60;
      expect(calculateHealth(threeDays)).toBe('warning');
    });

    it('returns critical for < 1 day runway', () => {
      const twelveHours = 12 * 60 * 60;
      expect(calculateHealth(twelveHours)).toBe('critical');
    });

    it('returns critical for zero runway', () => {
      expect(calculateHealth(0)).toBe('critical');
    });
  });

  describe('formatRunway', () => {
    it('returns "Depleted" for zero or negative', () => {
      expect(formatRunway(0)).toBe('Depleted');
      expect(formatRunway(-100)).toBe('Depleted');
    });

    it('formats days correctly', () => {
      expect(formatRunway(86400)).toBe('1 day');
      expect(formatRunway(86400 * 5)).toBe('5 days');
    });

    it('formats hours correctly', () => {
      expect(formatRunway(3600)).toBe('1 hour');
      expect(formatRunway(3600 * 5)).toBe('5 hours');
    });

    it('formats minutes correctly', () => {
      expect(formatRunway(60)).toBe('1 minute');
      expect(formatRunway(60 * 30)).toBe('30 minutes');
    });
  });

  describe('calculateBuffer', () => {
    it('calculates 4 hours of buffer', () => {
      const flowRatePerSecond = 1; // $1/second
      const buffer = calculateBuffer(flowRatePerSecond);
      
      // 4 hours = 4 * 60 * 60 = 14400 seconds
      expect(buffer).toBe(14400);
    });

    it('handles small flow rates', () => {
      const flowRatePerSecond = 0.001; // $0.001/second
      const buffer = calculateBuffer(flowRatePerSecond);
      expect(buffer).toBeCloseTo(14.4, 1);
    });
  });

  describe('calculateMinimumFunding', () => {
    it('calculates buffer + 7 days runway', () => {
      const flowRatePerSecond = 1; // $1/second
      const minFunding = calculateMinimumFunding(flowRatePerSecond);
      
      // Buffer: 4 * 60 * 60 = 14400
      // 7 days: 7 * 24 * 60 * 60 = 604800
      // Total: 619200
      expect(minFunding).toBe(619200);
    });
  });

  describe('calculateRunway', () => {
    it('calculates runway seconds correctly', () => {
      const result = calculateRunway(1000, 100, 0.1);
      // (1000 - 100) / 0.1 = 9000 seconds = 2.5 hours
      expect(result.seconds).toBe(9000);
      expect(result.health).toBe('critical'); // 2.5 hours < 1 day
    });

    it('handles zero flow rate', () => {
      const result = calculateRunway(1000, 100, 0);
      expect(result.seconds).toBe(0);
    });

    it('includes formatted display', () => {
      const result = calculateRunway(1000, 0, 0.001);
      expect(result.display).toMatch(/days?|hours?|minutes?/);
    });
  });

  describe('calculateStreamState', () => {
    it('returns complete stream calculation', () => {
      const stream = {
        status: 'active',
        startedAt: new Date().toISOString(),
        totalStreamed: 0,
        totalWithdrawn: 0,
        totalPausedSeconds: 0,
        flowRatePerSecond: 0.001,
        fundedAmount: 1000,
        bufferAmount: 100,
      };

      const result = calculateStreamState(stream);

      expect(result).toHaveProperty('balance');
      expect(result).toHaveProperty('runway');
      expect(result).toHaveProperty('fundingRemaining');
      expect(result.balance.available).toBeGreaterThanOrEqual(0);
      expect(result.runway.seconds).toBeGreaterThan(0);
    });

    it('calculates available balance correctly', () => {
      const stream = {
        status: 'paused',
        startedAt: new Date().toISOString(),
        totalStreamed: 500,
        totalWithdrawn: 200,
        totalPausedSeconds: 0,
        flowRatePerSecond: 0.001,
        fundedAmount: 1000,
        bufferAmount: 100,
      };

      const result = calculateStreamState(stream);
      
      expect(result.balance.total).toBe(500);
      expect(result.balance.withdrawn).toBe(200);
      expect(result.balance.available).toBe(300);
    });
  });
});

