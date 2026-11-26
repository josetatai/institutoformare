import { q } from './db';
import { normalize } from './kiwify';
import { applyEvent } from './grants';

/** Reprocessa avisos da Kiwify pendentes (assinatura válida e ainda não processados). */
export async function reprocessPending({ sendEmail = true } = {}) {
  const rows = await q('SELECT id, payload FROM webhook_events WHERE processed_at IS NULL AND signature_ok = 1 ORDER BY id');
  const out = [];
  for (const r of rows) {
    const ev = normalize(typeof r.payload === 'string' ? JSON.parse(r.payload) : r.payload);
    try {
      const res = await applyEvent(ev, { sendEmail });
      await q('UPDATE webhook_events SET processed_at = IF(?, UTC_TIMESTAMP(), NULL), error = ? WHERE id = ?', [res.ok ? 1 : 0, res.ok ? null : res.note, r.id]);
      out.push({ id: r.id, pedido: ev.orderId, resultado: res.note });
    } catch (e) {
      out.push({ id: r.id, pedido: ev.orderId, resultado: 'erro: ' + e.message });
    }
  }
  return out;
}
