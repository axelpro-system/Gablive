import { supabase } from './supabase.js';

export async function runAiAgent({
  orgId,
  agentType,
  targetType = null,
  targetId = null,
  input = {},
}) {
  const { data, error } = await supabase.functions.invoke('ai-agent-run', {
    body: {
      org_id: orgId,
      agent_type: agentType,
      target_type: targetType,
      target_id: targetId,
      input,
    },
  });

  if (error) throw new Error(error.message || 'Falha ao executar agente.');
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function fetchAiAgentRuns(orgId, limit = 20) {
  const { data, error } = await supabase
    .from('ai_agent_runs')
    .select('id, agent_type, target_type, target_id, status, output, error_message, created_at, completed_at')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

export function agentOutputSummary(output) {
  if (!output) return '';
  if (typeof output === 'string') return output;
  return output.summary || output.message || output.text || '';
}

export function agentOutputRecommendations(output) {
  if (!output || typeof output !== 'object') return [];
  return Array.isArray(output.recommendations) ? output.recommendations : [];
}
