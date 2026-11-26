import { q } from '@/lib/db';
export const dynamic = 'force-dynamic';
export async function GET() {
  try { await q('SELECT 1'); return Response.json({ ok: true, banco: 'ok' }); }
  catch { return Response.json({ ok: false, banco: 'sem conexão' }, { status: 503 }); }
}
