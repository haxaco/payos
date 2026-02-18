import type { DemandBrief } from '@sly/types';
import * as queries from '../db/queries.js';

export async function getDemandBrief(
  category?: string,
  region?: string,
): Promise<DemandBrief> {
  const dataPoints = await queries.getDemandIntelligence({
    category,
    region,
    limit: 20,
  });

  const keyStats = dataPoints.slice(0, 5).map(d => ({
    metric: d.metric,
    value: `${d.value}${d.unit ? ` ${d.unit}` : ''}`,
    source: d.source,
  }));

  // Build narrative from data points
  const categoryLabel = category || 'all categories';
  const regionLabel = region || 'globally';

  let narrative = `## Agentic Commerce Demand Brief: ${categoryLabel} (${regionLabel})\n\n`;

  if (dataPoints.length === 0) {
    narrative += 'No demand intelligence data available for these filters. Use `get_demand_stats` to see all available data, or run `scan_merchant` to build the dataset.';
    return {
      category,
      region,
      narrative,
      key_stats: [],
      opportunities: ['No data available — consider seeding demand intelligence data'],
      generated_at: new Date().toISOString(),
    };
  }

  narrative += '### Key Statistics\n\n';
  for (const stat of keyStats) {
    narrative += `- **${stat.metric}**: ${stat.value} (Source: ${stat.source})\n`;
  }

  // Identify opportunities
  const opportunities: string[] = [];

  const aiTrafficData = dataPoints.find(d => d.metric.includes('traffic') || d.metric.includes('visits'));
  if (aiTrafficData) {
    opportunities.push(`AI agent traffic is measurable at ${aiTrafficData.value}${aiTrafficData.unit || ''} — merchants not capturing this demand are losing revenue`);
  }

  const adoptionData = dataPoints.find(d => d.metric.includes('adoption') || d.metric.includes('protocol'));
  if (adoptionData) {
    opportunities.push(`Protocol adoption at ${adoptionData.value}${adoptionData.unit || ''} indicates early-mover advantage for merchants who adopt now`);
  }

  const revenueData = dataPoints.find(d => d.metric.includes('revenue') || d.metric.includes('spend'));
  if (revenueData) {
    opportunities.push(`${revenueData.description || `Revenue opportunity of ${revenueData.value}${revenueData.unit || ''}`}`);
  }

  if (opportunities.length === 0) {
    opportunities.push('Early adoption of agentic commerce protocols positions merchants ahead of competitors');
  }

  narrative += '\n### Opportunities\n\n';
  for (const opp of opportunities) {
    narrative += `- ${opp}\n`;
  }

  return {
    category,
    region,
    narrative,
    key_stats: keyStats,
    opportunities,
    generated_at: new Date().toISOString(),
  };
}

export async function getDemandStats(filters: {
  source?: string;
  metric?: string;
  category?: string;
  region?: string;
  limit?: number;
} = {}): Promise<Array<{
  source: string;
  metric: string;
  value: number;
  unit?: string;
  category?: string;
  region?: string;
  description?: string;
  confidence: string;
}>> {
  return queries.getDemandIntelligence(filters);
}
