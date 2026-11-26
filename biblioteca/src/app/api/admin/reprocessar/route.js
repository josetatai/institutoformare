import { currentUser } from '@/lib/auth';
import { q } from '@/lib/db';
import { normalize } from '@/lib/kiwify';
import { applyEvent } from '@/lib/grants';

export const dynamic = 'force-dynamic';

// Reprocessa avisos da Kiwify pendentes (ex.: produto que ainda não estava ligado a títulos).
// POST /api/admin/reprocessar   ?sem_email=1 para não enviar e-mails
export async function POST(req) {
  const user = await currentUser();
  if (!user?.is_admin) return Response.json({ error: 'só administrador' }, { status: 403 });
  const sendEmail = new URL(req.url).searchParams.get('sem_email') !== '1';
  const rows = await q('SELECT id, payload FROM webhook_events WHERE processed_at IS NULL AND signature_ok = 1 ORDER BY id');
  const out = [];
  for (const r of rows) {
    const ev = normalize(typeof r.payload === 'string' ? JSON.parse(r.payload) : r.payload);
    try {
      const res = await applyEvent(ev, { sendEmail });
      await q('UPDATE webhook_events SET processed_at = IF(?, UTC_TIMESTAMP(), NULL), error = ? WHERE id = ?', [res.ok ? 1 : 0, res.ok ? null : res.note, r.id]);
      out.push({ evento: r.id, pedido: ev.orderId, resultado: res.note });
    } catch (e) {
      out.push({ evento: r.id, pedido: ev.orderId, erro: e.message });
    }
  }
  return Response.json({ pendentes: rows.length, resultados: out });
}
