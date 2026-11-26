import crypto from 'node:crypto';

/*
 * Leitura dos avisos (webhooks) da Kiwify.
 * O formato abaixo segue o que conheço do webhook da Kiwify e PRECISA ser conferido
 * com um aviso real (o botão de teste do painel). Todo aviso fica guardado em
 * webhook_events, então um ajuste aqui permite reprocessar o que já chegou.
 */

/** Confere a assinatura: HMAC-SHA1 do corpo bruto com o token, enviada em ?signature= */
export function verifySignature(rawBody, signature, token = process.env.KIWIFY_WEBHOOK_TOKEN) {
  if (!token || !signature) return false;
  const expected = crypto.createHmac('sha1', token).update(rawBody).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(String(signature));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

const pick = (...vals) => vals.find((v) => v !== undefined && v !== null && v !== '');

const APPROVED = new Set(['order_approved', 'paid', 'approved', 'compra_aprovada']);
const REVOKED = new Set(['order_refunded', 'refunded', 'chargeback', 'chargedback', 'compra_reembolsada']);

/** Converte o aviso num formato único. kind: approved | revoked | ignored */
export function normalize(payload) {
  const p = payload?.order || payload || {};
  const type = String(pick(p.webhook_event_type, p.event, p.trigger, '') || '').toLowerCase();
  const status = String(pick(p.order_status, p.status, '') || '').toLowerCase();
  const product = p.Product || p.product || {};
  const customer = p.Customer || p.customer || {};

  let kind = 'ignored';
  if (REVOKED.has(type) || REVOKED.has(status)) kind = 'revoked';
  else if (APPROVED.has(type) || (status === 'paid' && !type)) kind = 'approved';

  return {
    kind,
    rawType: type || status || null,
    orderId: pick(p.order_id, p.id, p.order_ref) ? String(pick(p.order_id, p.id, p.order_ref)) : null,
    productId: pick(product.product_id, product.id, p.product_id) ? String(pick(product.product_id, product.id, p.product_id)) : null,
    productName: pick(product.product_name, product.name, null),
    email: String(pick(customer.email, p.customer_email, '') || '').trim().toLowerCase() || null,
    name: pick(customer.full_name, customer.name, p.customer_name, null),
    approvedAt: pick(p.approved_date, p.paid_at, p.updated_at, p.created_at, null),
  };
}

/** Datas da Kiwify chegam como "2026-11-26 14:32" no horário de Brasília. */
export function parseKiwifyDate(s) {
  if (!s) return new Date();
  const str = String(s);
  if (/[zZ]|[+-]\d{2}:?\d{2}$/.test(str)) return new Date(str);
  const d = new Date(str.replace(' ', 'T') + '-03:00');
  return isNaN(d) ? new Date() : d;
}
