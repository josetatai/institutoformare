import { q } from '@/lib/db';
import { verifySignature, normalize } from '@/lib/kiwify';
import { applyEvent } from '@/lib/grants';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  const raw = await req.text();
  const signature = new URL(req.url).searchParams.get('signature');
  const sigOk = verifySignature(raw, signature);

  let payload;
  try { payload = JSON.parse(raw); } catch { return Response.json({ error: 'corpo inválido' }, { status: 400 }); }
  const ev = normalize(payload);

  // guarda tudo antes de qualquer decisão: nenhuma venda se perde
  const ins = await q(
    'INSERT INTO webhook_events (event_kind, event_raw_type, order_id, signature_ok, payload) VALUES (?, ?, ?, ?, ?)',
    [ev.kind, ev.rawType, ev.orderId, sigOk ? 1 : 0, raw]
  );
  const eventId = ins.insertId;

  if (!sigOk) {
    await q('UPDATE webhook_events SET error = ? WHERE id = ?', ['assinatura não confere', eventId]);
    return Response.json({ error: 'assinatura inválida' }, { status: 401 });
  }

  try {
    const r = await applyEvent(ev);
    await q('UPDATE webhook_events SET processed_at = IF(?, UTC_TIMESTAMP(), NULL), error = ? WHERE id = ?', [r.ok ? 1 : 0, r.ok ? null : r.note, eventId]);
    // 200 mesmo quando falta ligar o produto: o aviso está guardado e é reprocessado depois
    return Response.json({ ok: true });
  } catch (e) {
    await q('UPDATE webhook_events SET error = ? WHERE id = ?', [String(e.message).slice(0, 500), eventId]);
    return Response.json({ error: 'falha ao processar' }, { status: 500 });
  }
}
