/**
 * Traduz uma entrada de timeline (type/status/description) num ícone e rótulo
 * em linguagem simples. Existe porque `type`+`status` sozinhos escondem
 * diferenças importantes — ex.: capi_event+skipped acontece por dois motivos
 * bem diferentes (etapa sem mapeamento configurado vs. lead sem ctwa_clid),
 * hoje indistinguíveis visualmente sem ler a descrição em texto livre.
 */
export function getEventPresentation(event) {
  const { type, status, description } = event;

  if (type === 'contact_in' && status === 'success') {
    return { icon: 'MessageCircleHeart', tone: 'success', label: 'Contato via anúncio' };
  }
  if (type === 'contact_in' && status === 'skipped') {
    return { icon: 'MessageCircleOff', tone: 'skipped', label: 'Contato orgânico (sem anúncio)' };
  }
  if (type === 'stage_change') {
    return { icon: 'GitBranch', tone: 'info', label: 'Mudança de etapa' };
  }
  if (type === 'capi_event' && status === 'skipped' && description?.startsWith('skipped: sem ctwa_clid')) {
    return { icon: 'LinkOff', tone: 'skipped', label: 'Não enviado — lead sem ctwa_clid' };
  }
  if (type === 'capi_event' && status === 'skipped') {
    return { icon: 'MapOff', tone: 'skipped', label: 'Não enviado — etapa sem mapeamento' };
  }
  if (type === 'capi_event' && status === 'success') {
    return { icon: 'CheckCircle2', tone: 'success', label: 'Evento enviado à Meta' };
  }
  // Checar `retry` antes de `capi_event`+failure: eventos de retry também têm
  // status="failure" no banco (ainda tentando), mas devem parecer bem
  // diferentes de uma falha definitiva (já desistiu).
  if (type === 'retry') {
    return { icon: 'RefreshCw', tone: 'warning', label: 'Tentando novamente' };
  }
  if (type === 'capi_event' && status === 'failure') {
    return { icon: 'XCircle', tone: 'failure', label: 'Falhou definitivamente' };
  }
  if (type === 'info' && status === 'success') {
    return { icon: 'Sparkles', tone: 'success', label: 'Dados enriquecidos / sincronizados' };
  }
  if (type === 'info' && status === 'failure') {
    return { icon: 'AlertTriangle', tone: 'failure', label: 'Falha ao enriquecer/sincronizar' };
  }

  return { icon: 'Info', tone: 'info', label: 'Info' };
}
