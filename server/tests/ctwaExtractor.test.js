import { describe, it, expect } from 'vitest';
import { extractCtwaData } from '../src/services/ctwaExtractor.js';

function buildPayload({ withReferral = true } = {}) {
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
                  ...(withReferral
                    ? {
                        referral: {
                          source_url: 'https://fb.me/ad',
                          source_id: '1234567890',
                          source_type: 'ad',
                          headline: 'Título do anúncio',
                          body: 'Descrição do anúncio',
                          media_type: 'image',
                          ctwa_clid: 'AbCdEfGhIjKlMnOp',
                        },
                      }
                    : {}),
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
  it('extrai ctwa_clid, ad_source_id e telefone de uma mensagem via anúncio', () => {
    const result = extractCtwaData(buildPayload());

    expect(result).toEqual({
      phone: '5511999998888',
      ctwaClid: 'AbCdEfGhIjKlMnOp',
      adSourceId: '1234567890',
      dedupToken: null,
      isOrganic: false,
      messageId: 'wamid.TEST123',
      timestamp: '1735900000',
      text: 'Oi',
    });
  });

  it('marca o contato como orgânico quando referral está ausente', () => {
    const result = extractCtwaData(buildPayload({ withReferral: false }));

    expect(result.isOrganic).toBe(true);
    expect(result.ctwaClid).toBeNull();
    expect(result.adSourceId).toBeNull();
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
