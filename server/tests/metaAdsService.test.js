import { describe, it, expect } from 'vitest';
import { parseAdDetails } from '../src/services/metaAdsService.js';

describe('parseAdDetails', () => {
  it('extrai campanha, conjunto e criativo da resposta da Graph API', () => {
    const raw = {
      campaign: { id: '111', name: 'Campanha X' },
      adset: { id: '222', name: 'Conjunto Y' },
      creative: { id: '333', name: 'Criativo Z' },
    };

    expect(parseAdDetails(raw)).toEqual({
      campaignId: '111',
      campaignName: 'Campanha X',
      adsetId: '222',
      adsetName: 'Conjunto Y',
      creativeId: '333',
      creativeName: 'Criativo Z',
    });
  });

  it('retorna nulls quando campos estão ausentes', () => {
    expect(parseAdDetails({})).toEqual({
      campaignId: null,
      campaignName: null,
      adsetId: null,
      adsetName: null,
      creativeId: null,
      creativeName: null,
    });
  });

  it('lida com resposta nula/indefinida sem lançar erro', () => {
    expect(parseAdDetails(null)).toEqual({
      campaignId: null,
      campaignName: null,
      adsetId: null,
      adsetName: null,
      creativeId: null,
      creativeName: null,
    });
  });
});
