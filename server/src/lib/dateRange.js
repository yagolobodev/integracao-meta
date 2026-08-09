const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Constrói uma data em horário LOCAL a partir de uma string 'YYYY-MM-DD'.
 * Não usar `new Date('YYYY-MM-DD')` + `setHours(...)`: strings de data pura
 * são interpretadas como meia-noite UTC pelo motor JS, então `setHours` (que
 * opera em hora local) desloca a data inteira em fusos com offset negativo
 * (ex.: Brasil, UTC-3) — vira o dia anterior local. Construir os componentes
 * ano/mês/dia diretamente no construtor `Date` evita esse round-trip por UTC.
 */
function parseLocalDate(value, endOfDay) {
  const match = DATE_ONLY.exec(value);
  if (match) {
    const [, year, month, day] = match;
    return endOfDay
      ? new Date(Number(year), Number(month) - 1, Number(day), 23, 59, 59, 999)
      : new Date(Number(year), Number(month) - 1, Number(day), 0, 0, 0, 0);
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Interpreta `from`/`to` (strings 'YYYY-MM-DD' vindas de <input type=date>, ou
 * ISO completas) como um intervalo INCLUSIVO em horário local: `from` vira
 * 00:00:00.000 do dia informado, `to` vira 23:59:59.999 do dia informado —
 * corrige o bug onde `to=2026-08-09` excluía o dia inteiro (virava meia-noite,
 * o instante inicial do dia, não o final).
 */
export function parseDateRange({ from, to } = {}) {
  const range = {};

  if (from) {
    const start = parseLocalDate(from, false);
    if (start) range.gte = start;
  }

  if (to) {
    const end = parseLocalDate(to, true);
    if (end) range.lte = end;
  }

  return Object.keys(range).length ? range : null;
}
