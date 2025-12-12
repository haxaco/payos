export type AIResponseType = 'text' | 'list' | 'action';

export interface AITextResponse {
  type: 'text';
  title?: string;
  text: string;
  actions?: string[];
}

export interface AIListResponse {
  type: 'list';
  title: string;
  summary: string;
  alert?: string;
  stats?: Record<string, string | number>;
  items: Array<{
    id?: string;
    desc?: string;
    currency?: string;
    amount?: string;
    risk?: 'high' | 'medium' | 'low';
    status?: string;
  }>;
  recommendation?: string;
  actions?: string[];
}

export interface AIActionResponse {
  type: 'action';
  title: string;
  summary: string;
  items: Array<{ id: string; desc: string }>;
  warning?: string;
  actions: [string, string]; // [primary, secondary]
}

export type AIResponse = AITextResponse | AIListResponse | AIActionResponse;
