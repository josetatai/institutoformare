import crypto from 'node:crypto';

/*
 * Leitura dos avisos (webhooks) da Kiwify.
 * O formato abaixo segue o que conheço do webhook da Kiwify e PRECISA ser conferido
 * com um aviso real (o botão de teste do painel). Todo aviso fica guardado em
 * webhook_events, então um ajuste aqui permite reprocessar o que já chegou.
 */

/*
 * Assinatura: HMAC do corpo com o token, enviada em ?signature=. Conferimos o corpo exatamente como
 * chegou e também o JSON recompactado (é como a documentação da Kiwify gera a assinatura), em SHA-1 e SHA-256.
 */
function candidates(rawBody) {
  const out = [['corpo bruto', rawBody]];
  try { out.push(['JSON recompactado', JSON.stringify(JSON.parse(rawBody))]); } catch { /* corpo não é JSON */ }
  return out;
}
const hmac = (algo, token, data) => crypto.createHmac(algo, token).update(data).digest('hex');
const same = (a, b) => { const x = Buffer.from(a), y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); };

export function verifySignature(rawBody, signature, token) {
  if (!token || !signature) return false;
  return candidates(rawBody).some(([, data]) => ['sha1', 'sha256'].some((algo) => same(hmac(algo, token, data), signature)));
}

/** Para o painel: diz qual combinação bateu (ou que nenhuma bateu). */
export function signatureReport(rawBody, signature, token) {
  if (!signature) return 'o aviso veio sem assinatura';
  if (!token) return 'token do webhook não salvo em Configurações';
  const hit = [];
  for (const [label, data] of candidates(rawBody)) for (const algo of ['sha1', 'sha256']) if (same(hmac(algo, token, data), signature)) hit.push(`${algo.toUpperCase()} do ${label}`);
  return hit.length ? `confere (${hit.join(', ')})` : 'nenhuma combinação confere: o token salvo provavelmente não é o mesmo do webhook';
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
    offerId: String(pick(product.product_offer_id, product.offer_id, p.offer_id, p.Offer?.offer_id, p.Offer?.id, '') || '') || null,
    email: String(pick(customer.email, p.customer_email, '') || '').trim().toLowerCase() || null,
    name: pick(customer.full_name, customer.name, p.customer_name, null),
    priceCents: Number(pick(p.Commissions?.product_base_price, p.Commissions?.charge_amount, 0)) || null,
    approvedAt: pick(p.approved_date, p.paid_at, p.updated_at, p.created_at, null),
  };
}

/** A Kiwify manda as datas em UTC ("2026-11-26 23:46"). Nunca no futuro: no máximo agora. */
export function parseKiwifyDate(v) {
  const now = new Date();
  if (!v) return now;
  const str = String(v).trim();
  let d;
  if (/[zZ]|[+-]\d{2}:?\d{2}$/.test(str)) d = new Date(str);
  else d = new Date(str.replace(' ', 'T') + (str.length <= 16 ? ':00' : '') + 'Z');
  if (isNaN(d)) return now;
  return d > now ? now : d;
}

const HIDDEN = '[oculto]';
const CUSTOMER_PRIVATE = ['CPF', 'cnpj', 'mobile', 'ip', 'instagram', 'street', 'number', 'complement', 'neighborhood', 'city', 'state', 'zipcode', 'custom_fields'];
const ORDER_PRIVATE = ['card_last4digits', 'boleto_barcode', 'boleto_URL', 'pix_code'];

/** Cópia do aviso sem dados pessoais desnecessários (CPF, telefone, endereço, cartão, pix, boleto). */
export function redact(payload) {
  const c = JSON.parse(JSON.stringify(payload ?? {}));
  const o = c.order && typeof c.order === 'object' ? c.order : c;
  for (const k of ORDER_PRIVATE) if (o[k]) o[k] = HIDDEN;
  const cust = o.Customer || o.customer;
  if (cust) for (const k of CUSTOMER_PRIVATE) if (cust[k] !== undefined && cust[k] !== null && cust[k] !== '') cust[k] = HIDDEN;
  if (o.Commissions?.commissioned_stores) o.Commissions.commissioned_stores = HIDDEN;
  return c;
}
