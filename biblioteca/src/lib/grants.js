import { q, one, tx } from './db';
import { addDays } from './dates';
import { tempPassword } from './crypto';
import { hashPassword } from './auth';
import { parseKiwifyDate } from './kiwify';
import { sendWelcome, sendNewTitle } from './mail';

/**
 * Aplica um aviso normalizado da Kiwify.
 * Devolve { ok, note } — note explica o que foi feito ou por que não foi.
 */
export async function applyEvent(ev, { sendEmail = true } = {}) {
  if (ev.kind === 'ignored') return { ok: true, note: `evento ignorado (${ev.rawType})` };
  if (!ev.orderId) return { ok: false, note: 'aviso sem número do pedido' };

  if (ev.kind === 'revoked') {
    const r = await q(
      `UPDATE grants SET revoked_at = UTC_TIMESTAMP(), revoke_reason = ? WHERE order_id = ? AND revoked_at IS NULL`,
      [ev.rawType || 'reembolso', ev.orderId]
    );
    return { ok: true, note: `acesso bloqueado (${r.affectedRows} título(s))` };
  }

  // compra aprovada
  if (!ev.email) return { ok: false, note: 'aviso sem e-mail do cliente' };
  // regra mais específica primeiro: oferta, depois valor pago (a Kiwify não manda a oferta), depois o padrão do produto
  const product =
    (ev.offerId && (await one("SELECT * FROM products WHERE kiwify_product_id = ? AND kiwify_offer_id = ?", [ev.productId, ev.offerId]))) ||
    (ev.priceCents && (await one("SELECT * FROM products WHERE kiwify_product_id = ? AND kiwify_price_cents = ?", [ev.productId, ev.priceCents]))) ||
    (await one("SELECT * FROM products WHERE kiwify_product_id = ? AND kiwify_offer_id = '' AND kiwify_price_cents IS NULL", [ev.productId]));
  if (!product) return { ok: false, note: `produto Kiwify ${ev.productId} ainda não ligado a títulos` };
  // migração aos poucos: só vira acesso na biblioteca o produto com a liberação automática ligada
  if (!product.auto_release) return { ok: false, note: `liberação automática desligada para ${product.name} (ligue em Produtos Kiwify quando for migrar)` };
  const items = await q('SELECT title_id, release_days FROM product_titles WHERE product_id = ?', [product.id]);
  if (!items.length) return { ok: false, note: `produto ${product.name} sem títulos ligados` };

  const startsAt = parseKiwifyDate(ev.approvedAt);
  const expiresAt = addDays(startsAt, product.access_days);

  const result = await tx(async (c) => {
    let user = (await c.q('SELECT id, name FROM users WHERE email = ? FOR UPDATE', [ev.email]))[0];
    let temp = null;
    if (!user) {
      temp = tempPassword();
      const r = await c.q('INSERT INTO users (email, name, password_hash, must_change_password) VALUES (?, ?, ?, 1)', [ev.email, ev.name, await hashPassword(temp)]);
      user = { id: r.insertId, name: ev.name };
    } else if (!user.name && ev.name) {
      await c.q('UPDATE users SET name = ? WHERE id = ?', [ev.name, user.id]);
    }
    let created = 0;
    for (const it of items) {
      const r = await c.q(
        `INSERT IGNORE INTO grants (user_id, title_id, product_id, order_id, starts_at, release_at, expires_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [user.id, it.title_id, product.id, ev.orderId, startsAt, addDays(startsAt, it.release_days), expiresAt]
      );
      created += r.affectedRows;
    }
    return { user, temp, created };
  });

  if (result.created === 0) return { ok: true, note: 'pedido já processado antes' };

  const note = `${result.created} título(s) liberado(s)${result.temp ? ', conta nova' : ''}`;
  if (sendEmail) {
    try {
      if (result.temp) await sendWelcome({ to: ev.email, name: ev.name, tempPassword: result.temp, productName: product.name });
      else await sendNewTitle({ to: ev.email, name: result.user.name, productName: product.name });
    } catch (e) {
      // o acesso já foi liberado; o cliente pode entrar por "Esqueci minha senha"
      return { ok: true, note: `${note}; e-mail NÃO enviado: ${e.message}` };
    }
  }
  return { ok: true, note };
}
