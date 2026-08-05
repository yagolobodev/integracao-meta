import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../src/config/env.js', () => ({
  env: {
    meta: {
      pageId: 'PAGE_123',
      testEventCode: '',
      graphApiVersion: 'v21.0',
    },
  },
}));

const { buildEventPayload, buildEventId } = await import('../src/services/metaCapiService.js');

const lead = { id: 'lead_1', ctwaClid: 'CLID_ABC', dedupToken: null };

describe('buildEventPayload', () => {
  it('monta o payload exato exigido pela Meta CAPI para CTWA', () => {
    const mapping = { metaEvent: 'Lead', value: null, currency: 'BRL' };
    const payload = buildEventPayload(lead, mapping, { eventTime: 1735900000 });

    expect(payload).toEqual({
      data: [
        {
          event_name: 'Lead',
          event_time: 1735900000,
          action_source: 'business_messaging',
          messaging_channel: 'whatsapp',
          event_id: 'lead_1_lead',
          user_data: {
            page_id: 'PAGE_123',
            ctwa_clid: 'CLID_ABC',
          },
        },
      ],
      partner_agent: 'kommo-ctwa-middleware',
    });
  });

  it('inclui action_source=business_messaging e messaging_channel=whatsapp sempre', () => {
    const mapping = { metaEvent: 'Purchase', value: 199.9, currency: 'BRL' };
    const payload = buildEventPayload(lead, mapping);

    expect(payload.data[0].action_source).toBe('business_messaging');
    expect(payload.data[0].messaging_channel).toBe('whatsapp');
  });

  it('inclui custom_data com value/currency quando a etapa tiver valor monetário', () => {
    const mapping = { metaEvent: 'Purchase', value: 199.9, currency: 'BRL' };
    const payload = buildEventPayload(lead, mapping);

    expect(payload.data[0].custom_data).toEqual({ currency: 'BRL', value: 199.9 });
  });

  it('omite custom_data quando não houver valor configurado', () => {
    const mapping = { metaEvent: 'Lead', value: null, currency: 'BRL' };
    const payload = buildEventPayload(lead, mapping);

    expect(payload.data[0].custom_data).toBeUndefined();
  });

  it('inclui test_event_code quando fornecido nas opções', () => {
    const mapping = { metaEvent: 'Lead', value: null };
    const payload = buildEventPayload(lead, mapping, { testEventCode: 'TEST12345' });

    expect(payload.test_event_code).toBe('TEST12345');
  });
});

describe('buildEventId', () => {
  it('é determinístico a partir do id do lead + nome da etapa', () => {
    const mapping = { metaEvent: 'Schedule' };
    expect(buildEventId(lead, mapping)).toBe('lead_1_schedule');
    expect(buildEventId(lead, mapping)).toBe(buildEventId(lead, mapping));
  });

  it('inclui o dedup_token quando disponível, para evitar contagem dupla', () => {
    const leadWithToken = { ...lead, dedupToken: 'tok-999' };
    const mapping = { metaEvent: 'Lead' };
    expect(buildEventId(leadWithToken, mapping)).toBe('lead_1_lead_tok-999');
  });

  it('normaliza acentos e espaços do nome do evento no event_id', () => {
    const mapping = { metaEvent: 'Reunião Agendada' };
    expect(buildEventId(lead, mapping)).toBe('lead_1_reuniao_agendada');
  });
});
