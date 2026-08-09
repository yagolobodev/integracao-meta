import { describe, it, expect } from 'vitest';
import { parseDateRange } from '../src/lib/dateRange.js';

describe('parseDateRange', () => {
  it('retorna null quando from e to estão ausentes', () => {
    expect(parseDateRange({})).toBeNull();
    expect(parseDateRange()).toBeNull();
  });

  it('inclui o dia inteiro quando `to` é uma data pura YYYY-MM-DD (regressão do bug de meia-noite)', () => {
    const range = parseDateRange({ to: '2026-08-09' });
    const eventLateInDay = new Date('2026-08-09T23:50:00');

    expect(range.lte.getTime()).toBeGreaterThan(eventLateInDay.getTime());
  });

  it('inicia `from` à meia-noite do dia informado quando é uma data pura', () => {
    const range = parseDateRange({ from: '2026-08-01' });
    expect(range.gte.getHours()).toBe(0);
    expect(range.gte.getMinutes()).toBe(0);
  });

  it('passa datas ISO completas direto, sem ajustar horário', () => {
    const iso = '2026-08-09T15:30:00.000Z';
    const range = parseDateRange({ from: iso });
    expect(range.gte.toISOString()).toBe(iso);
  });

  it('aceita apenas from ou apenas to', () => {
    expect(parseDateRange({ from: '2026-08-01' })).toEqual({ gte: expect.any(Date) });
    expect(parseDateRange({ to: '2026-08-09' })).toEqual({ lte: expect.any(Date) });
  });
});
