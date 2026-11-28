import { currentUser } from '@/lib/auth';
import { one, q } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Texto que o leitor aceita ao pedir o aviso. Fica gravado junto com o pedido.
export const CONSENT = 'Autorizo o Instituto Formare a me avisar por e-mail quando este título for lançado. Posso cancelar a qualquer momento.';

export async function POST(req) {
  const user = await currentUser();
  if (!user) return Response.json({ error: 'login' }, { status: 401 });
  const { slug, on } = await req.json().catch(() => ({}));
  const t = await one('SELECT id FROM titles WHERE slug = ? AND published = 1 AND coming_soon = 1', [String(slug || '')]);
  if (!t) return Response.json({ error: 'título não encontrado' }, { status: 404 });
  if (on) {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null;
    await q('INSERT IGNORE INTO interests (user_id, title_id, consent_text, ip) VALUES (?, ?, ?, ?)', [user.id, t.id, CONSENT, ip]);
  } else {
    await q('DELETE FROM interests WHERE user_id = ? AND title_id = ?', [user.id, t.id]);
  }
  return Response.json({ ok: true, on: !!on });
}
