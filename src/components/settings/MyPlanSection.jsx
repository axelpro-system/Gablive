import { CreditCard } from 'lucide-react';
import { usePlan } from '../../hooks/usePlan';
import { SUBSCRIPTION_STATUS } from '../../lib/seats';
import InlineAlert from '../ui/InlineAlert';

const STATUS_LABEL = {
  [SUBSCRIPTION_STATUS.TRIAL]: { text: 'Em teste', badge: 'badge-primary' },
  [SUBSCRIPTION_STATUS.ACTIVE]: { text: 'Ativo', badge: 'badge-success' },
  [SUBSCRIPTION_STATUS.PAST_DUE]: { text: 'Pagamento pendente', badge: 'badge-warning' },
  [SUBSCRIPTION_STATUS.CANCELED]: { text: 'Cancelado', badge: 'badge-gray' },
};

/**
 * "Meu plano": plano, status, fim do teste e uso de assentos da org atual. Somente leitura.
 * Some por completo enquanto o backend não tiver planos (migrations não aplicadas).
 */
export default function MyPlanSection() {
  const { summary, loading, error, unavailable, refetch } = usePlan();

  if (unavailable) return null;

  const status = summary?.status ? STATUS_LABEL[summary.status] : null;

  return (
    <section className="settings-card my-plan" aria-labelledby="my-plan-title">
      <div className="settings-section">
        <div className="settings-section-header">
          <CreditCard size={20} className="settings-section-icon" aria-hidden="true" />
          <h3 id="my-plan-title">Meu plano</h3>
        </div>

        {loading ? (
          <div className="settings-skeleton">
            <div className="skeleton skeleton-label" />
            <div className="skeleton skeleton-input" />
          </div>
        ) : error ? (
          <>
            <InlineAlert type="error" className="mb-3">
              Não foi possível carregar as informações do seu plano.
            </InlineAlert>
            <button type="button" className="btn btn-secondary btn-sm" onClick={refetch}>
              Tentar de novo
            </button>
          </>
        ) : summary ? (
          <>
            <dl className="my-plan-grid">
              <div>
                <dt>Plano</dt>
                <dd>{summary.planName ?? 'Sem plano definido'}</dd>
              </div>
              <div>
                <dt>Situação</dt>
                <dd>{status ? <span className={`badge ${status.badge}`}>{status.text}</span> : '—'}</dd>
              </div>
              <div>
                <dt>Assentos</dt>
                <dd>
                  {summary.unlimited
                    ? `${summary.used} em uso · sem limite`
                    : `${summary.used} de ${summary.limit} em uso`}
                </dd>
              </div>
              {summary.trialDaysLeft !== null && (
                <div>
                  <dt>Teste termina em</dt>
                  <dd>{summary.trialDaysLeft} dia(s)</dd>
                </div>
              )}
            </dl>

            {summary.trialExpired && (
              <InlineAlert type="error" className="mt-3">
                Seu período de teste terminou. Fale com a equipe Gablive para ativar um plano.
              </InlineAlert>
            )}
            {!summary.canInvite && !summary.trialExpired && (
              <InlineAlert type="error" className="mt-3">
                Todos os assentos do plano estão em uso. Novos convites ficam bloqueados até ampliar o plano.
              </InlineAlert>
            )}

            <p className="input-hint mt-3">
              Para mudar de plano ou ampliar os assentos, fale com a equipe Gablive.
            </p>
          </>
        ) : null}
      </div>
    </section>
  );
}
