import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bot,
  Brain,
  CheckCircle,
  FileText,
  Loader2,
  MessageSquare,
  Plug,
  RefreshCw,
  Sparkles,
  Wand2,
} from 'lucide-react';
import { useOrg } from '../../contexts/OrgContext';
import { AI_AGENT_LABELS, AI_AGENT_TYPES } from '../../lib/aiAgents';
import {
  agentOutputRecommendations,
  agentOutputSummary,
  fetchAiAgentRuns,
  runAiAgent,
} from '../../lib/aiAgentApi';
import { fetchIntegrations, fetchOrgWebinars } from '../../lib/salesIntegrationApi';
import './AIAgentsPage.css';

const AGENTS = [
  {
    type: AI_AGENT_TYPES.WEBINAR_BUILDER,
    icon: Wand2,
    title: AI_AGENT_LABELS[AI_AGENT_TYPES.WEBINAR_BUILDER],
    description: 'Gera estrutura de webinar, roteiro, CTAs, enquetes e timeline inicial.',
    action: 'Gerar estrutura',
    targetType: 'draft',
  },
  {
    type: AI_AGENT_TYPES.CONVERSION_ANALYST,
    icon: Brain,
    title: AI_AGENT_LABELS[AI_AGENT_TYPES.CONVERSION_ANALYST],
    description: 'Analisa dados do webinar e recomenda ajustes de conversão.',
    action: 'Analisar webinar',
    targetType: 'webinar',
  },
  {
    type: AI_AGENT_TYPES.INTEGRATION_DEBUGGER,
    icon: Plug,
    title: AI_AGENT_LABELS[AI_AGENT_TYPES.INTEGRATION_DEBUGGER],
    description: 'Diagnostica Hotmart/Selflux, webhook, eventos e mapeamentos.',
    action: 'Diagnosticar',
    targetType: 'integration',
  },
  {
    type: AI_AGENT_TYPES.FOLLOW_UP,
    icon: MessageSquare,
    title: AI_AGENT_LABELS[AI_AGENT_TYPES.FOLLOW_UP],
    description: 'Segmenta leads e sugere mensagens de WhatsApp/e-mail.',
    action: 'Criar follow-up',
    targetType: 'webinar',
  },
];

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AIAgentsPage() {
  const { orgId } = useOrg();
  const [runs, setRuns] = useState([]);
  const [webinars, setWebinars] = useState([]);
  const [integrations, setIntegrations] = useState([]);
  const [selectedWebinarId, setSelectedWebinarId] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('hotmart');
  const [brief, setBrief] = useState('');
  const [loading, setLoading] = useState(true);
  const [runningType, setRunningType] = useState(null);
  const [message, setMessage] = useState(null);

  const latestRun = runs[0] || null;

  const loadAll = useCallback(async () => {
    if (!orgId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [nextRuns, nextWebinars, nextIntegrations] = await Promise.all([
        fetchAiAgentRuns(orgId, 20),
        fetchOrgWebinars(orgId),
        fetchIntegrations(orgId),
      ]);
      setRuns(nextRuns);
      setWebinars(nextWebinars);
      setIntegrations(nextIntegrations);
      if (!selectedWebinarId && nextWebinars[0]) setSelectedWebinarId(nextWebinars[0].id);
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Falha ao carregar agentes.' });
    } finally {
      setLoading(false);
    }
  }, [orgId, selectedWebinarId]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const providerOptions = useMemo(() => {
    const providers = integrations.map((integration) => integration.provider);
    return providers.length ? providers : ['hotmart', 'selflux'];
  }, [integrations]);

  const executeAgent = async (agent) => {
    if (!orgId) return;

    const needsWebinar = agent.targetType === 'webinar';
    if (needsWebinar && !selectedWebinarId) {
      setMessage({ type: 'error', text: 'Selecione um webinar para executar este agente.' });
      return;
    }

    setRunningType(agent.type);
    setMessage(null);
    try {
      await runAiAgent({
        orgId,
        agentType: agent.type,
        targetType: agent.targetType,
        targetId:
          agent.targetType === 'webinar'
            ? selectedWebinarId
            : agent.targetType === 'integration'
              ? selectedProvider
              : null,
        input: {
          brief,
          provider: selectedProvider,
        },
      });
      setMessage({ type: 'success', text: 'Agente executado com sucesso.' });
      await loadAll();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Falha ao executar agente.' });
    } finally {
      setRunningType(null);
    }
  };

  return (
    <div className="ai-page">
      <header className="ai-header">
        <div>
          <p className="ai-kicker">
            <Sparkles size={16} />
            Agentes de IA
          </p>
          <h1>Diagnóstico, criação e otimização de webinars</h1>
          <p>
            Execute agentes com contexto da sua organização. As respostas ficam
            registradas no histórico e não sobrescrevem configurações sem aprovação.
          </p>
        </div>
        <button type="button" className="btn btn-ghost btn-sm" onClick={loadAll}>
          <RefreshCw size={16} />
          Atualizar
        </button>
      </header>

      {message && (
        <div className={`ai-alert ai-alert--${message.type}`}>
          {message.type === 'success' ? <CheckCircle size={16} /> : <Bot size={16} />}
          {message.text}
        </div>
      )}

      <section className="ai-controls">
        <div className="form-group">
          <label htmlFor="ai-webinar">Webinar para análise/follow-up</label>
          <select
            id="ai-webinar"
            className="input"
            value={selectedWebinarId}
            onChange={(event) => setSelectedWebinarId(event.target.value)}
          >
            <option value="">Selecione...</option>
            {webinars.map((webinar) => (
              <option key={webinar.id} value={webinar.id}>
                {webinar.title} ({webinar.status})
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="ai-provider">Provider para diagnóstico</label>
          <select
            id="ai-provider"
            className="input"
            value={selectedProvider}
            onChange={(event) => setSelectedProvider(event.target.value)}
          >
            {providerOptions.map((provider) => (
              <option key={provider} value={provider}>
                {provider}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group ai-brief">
          <label htmlFor="ai-brief">Brief opcional</label>
          <textarea
            id="ai-brief"
            className="input"
            rows="3"
            value={brief}
            onChange={(event) => setBrief(event.target.value)}
            placeholder="Ex: produto de ticket alto, público frio, foco em venda pelo WhatsApp..."
          />
        </div>
      </section>

      <section className="ai-grid">
        {AGENTS.map((agent) => {
          const Icon = agent.icon;
          const isRunning = runningType === agent.type;
          return (
            <article className="ai-agent-card" key={agent.type}>
              <div className="ai-agent-icon">
                <Icon size={22} />
              </div>
              <h2>{agent.title}</h2>
              <p>{agent.description}</p>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => executeAgent(agent)}
                disabled={isRunning || loading}
              >
                {isRunning ? <Loader2 size={16} className="spin" /> : <Sparkles size={16} />}
                {agent.action}
              </button>
            </article>
          );
        })}
      </section>

      <section className="ai-results">
        <div className="ai-results-main">
          <div className="ai-section-title">
            <FileText size={18} />
            Último resultado
          </div>
          {latestRun ? (
            <article className="ai-run-detail">
              <div className="ai-run-meta">
                <span>{AI_AGENT_LABELS[latestRun.agent_type] || latestRun.agent_type}</span>
                <span className={`ai-status ai-status--${latestRun.status}`}>{latestRun.status}</span>
                <span>{formatDate(latestRun.created_at)}</span>
              </div>
              <h3>{agentOutputSummary(latestRun.output) || latestRun.error_message || 'Sem resumo.'}</h3>
              <ul>
                {agentOutputRecommendations(latestRun.output).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          ) : (
            <p className="ai-empty">Nenhum agente executado ainda.</p>
          )}
        </div>

        <aside className="ai-history">
          <div className="ai-section-title">
            <Bot size={18} />
            Histórico
          </div>
          {runs.length === 0 ? (
            <p className="ai-empty">Sem execuções.</p>
          ) : (
            runs.map((run) => (
              <div className="ai-history-item" key={run.id}>
                <strong>{AI_AGENT_LABELS[run.agent_type] || run.agent_type}</strong>
                <span>{formatDate(run.created_at)} · {run.status}</span>
              </div>
            ))
          )}
        </aside>
      </section>
    </div>
  );
}
