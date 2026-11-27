import crypto from 'node:crypto';

const A = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // sem caracteres ambíguos

/** Código curto da licença de um leitor para um título (estável). Vai na marca d'água junto com o e-mail. */
export function licenseCode(userId, titleId) {
  const secret = process.env.LICENSE_SECRET || process.env.SETUP_TOKEN || process.env.DB_PASSWORD || 'formare';
  const h = crypto.createHmac('sha256', secret).update(`${userId}:${titleId}`).digest();
  let s = '';
  for (let i = 0; i < 5; i++) s += A[h[i] % A.length];
  return `L-${s}`;
}

/** Texto da marca d'água, só com caracteres que a fonte padrão do PDF aceita. */
export const watermarkText = (email, code) => `${email} · ${code}`.replace(/[^\x20-\x7E -ÿ]/g, '');
