import { q } from './db';

// Valor salvo no painel; se vazio, usa a variável de ambiente.
const ENV = {
  smtp_host: 'SMTP_HOST', smtp_port: 'SMTP_PORT', smtp_user: 'SMTP_USER', smtp_password: 'SMTP_PASSWORD',
  mail_from: 'MAIL_FROM', support_email: 'SUPPORT_EMAIL', kiwify_token: 'KIWIFY_WEBHOOK_TOKEN',
};
const DEFAULTS = {
  smtp_host: 'smtp.hostinger.com', smtp_port: '465', smtp_user: 'controle@institutoformare.com.br',
  mail_from: 'Biblioteca Formare <acesso@institutoformare.com.br>', support_email: 'suporte@institutoformare.com.br',
};
export const SECRET_KEYS = ['smtp_password', 'kiwify_token'];

export async function getSettings() {
  let rows = [];
  try { rows = await q('SELECT k, v FROM settings'); } catch { /* tabela ainda não criada */ }
  const out = {};
  for (const k of Object.keys(ENV)) {
    const r = rows.find((x) => x.k === k);
    out[k] = (r && r.v) || process.env[ENV[k]] || DEFAULTS[k] || '';
  }
  return out;
}

export async function setSetting(k, v) {
  await q('INSERT INTO settings (k, v) VALUES (?, ?) ON DUPLICATE KEY UPDATE v = VALUES(v)', [k, v]);
}
