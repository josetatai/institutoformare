const fmt = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric' });
export const br = (d) => (d ? fmt.format(new Date(d)) : '');
export const brShort = (d) => br(d).slice(0, 5);
export const addDays = (d, n) => new Date(new Date(d).getTime() + n * 864e5);
