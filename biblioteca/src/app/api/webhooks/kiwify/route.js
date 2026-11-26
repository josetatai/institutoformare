import { q } from '@/lib/db';
import { verifySignature, normalize, redact } from '@/lib/kiwify';
import { applyEvent } from '@/lib/grants';
import { getSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  const raw = await req.text();
  const signature = new URL(req.url).searchParams.get('signature');
  const sigOk = verifySignature(raw, signature, (await getSettings()).kiwify_token);

  let payload;
  try { payload = JSON.parse(raw); } catch { return Response.json({ error: 'corpo inválido' }, { status: 400 }); }
  const ev = normalize(payload);

  // guarda tudo antes de qualquer decisão: nenhuma venda se perde
  let ins;
  try {
    ins = await q(
      'INSERT INTO webhook_events (event_kind, event_raw_type, order_id, signature_ok, payload, raw_body, sig_received) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [ev.kind, ev.rawType, ev.orderId, sigOk ? 1 : 0, JSON.stringify(redact(payload)), sigOk ? null : raw, signature ? String(signature).slice(0, 100) : null]
    );
  } catch {
    // banco ainda sem as colunas novas: grava o essencial
    ins = await q(
      'INSERT INTO webhook_events (event_kind, event_raw_type, order_id, signature_ok, payload) VALUES (?, ?, ?, ?, ?)',
      [ev.kind, ev.rawType, ev.orderId, sigOk ? 1 : 0, JSON.stringify(redact(payload))]
    );
  }
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
