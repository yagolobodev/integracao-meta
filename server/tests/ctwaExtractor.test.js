import { describe, it, expect } from 'vitest';
import { extractCtwaData } from '../src/services/ctwaExtractor.js';

function buildPayload({ withAd = true, withConversion = true } = {}) {
  return {
    object: 'whatsapp_business_account',
    entry: [
      {
        id: '123',
        changes: [
          {
            value: {
              messaging_product: 'whatsapp',
              contacts: [{ profile: { name: 'Fulano' }, wa_id: '5511999998888' }],
              messages: [
                {
                  from: '5511999998888',
                  id: 'wamid.TEST123',
                  timestamp: '1735900000',
                  type: 'text',
                  text: { body: 'Oi' },
                  context: {
                    ...(withAd
                      ? {
                          ad: {
                            ctwa: { clid: 'AbCdEfGhIjKlMnOp' },
                            source: { id: '1234567890', type: 'ad' },
                          },
                        }
                      : {}),
                    ...(withConversion ? { conversion: { data: 'dedup-token-xyz' } } : {}),
                  },
                },
              ],
            },
            field: 'messages',
          },
        ],
      },
    ],
  };
}

describe('extractCtwaData', () => {
  it('extrai ctwa_clid, ad_source_id, dedup_token e telefone de uma mensagem via anúncio', () => {
    const result = extractCtwaData(buildPayload());

    expect(result).toEqual({
      phone: '5511999998888',
      ctwaClid: 'AbCdEfGhIjKlMnOp',
      adSourceId: '1234567890',
      dedupToken: 'dedup-token-xyz',
      isOrganic: false,
      messageId: 'wamid.TEST123',
      timestamp: '1735900000',
    });
  });

  it('marca o contato como orgânico quando context.ad está ausente', () => {
    const result = extractCtwaData(buildPayload({ withAd: false }));

    expect(result.isOrganic).toBe(true);
    expect(result.ctwaClid).toBeNull();
    expect(result.adSourceId).toBeNull();
  });

  it('lida com ctwa como string simples (não objeto)', () => {
    const payload = buildPayload();
    payload.entry[0].changes[0].value.messages[0].context.ad.ctwa = 'PLAIN_CLID';

    const result = extractCtwaData(payload);
    expect(result.ctwaClid).toBe('PLAIN_CLID');
  });

  it('retorna dedupToken null quando conversion está ausente', () => {
    const result = extractCtwaData(buildPayload({ withConversion: false }));
    expect(result.dedupToken).toBeNull();
  });

  it('retorna null para webhooks sem mensagem de entrada (ex: status de leitura)', () => {
    const statusPayload = {
      entry: [
        {
          changes: [
            {
              value: {
                messaging_product: 'whatsapp',
                statuses: [{ id: 'wamid.X', status: 'read' }],
              },
              field: 'messages',
            },
          ],
        },
      ],
    };

    expect(extractCtwaData(statusPayload)).toBeNull();
  });

  it('retorna null para payload vazio ou malformado', () => {
    expect(extractCtwaData({})).toBeNull();
    expect(extractCtwaData(null)).toBeNull();
  });
});
