import { currentUser } from '@/lib/auth';
import { canRead } from '@/lib/access';
import { one, q } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  const user = await currentUser();
  if (!user) return Response.json({ error: 'login' }, { status: 401 });
  const { slug, page } = await req.json().catch(() => ({}));
  const t = await one('SELECT id, page_count FROM titles WHERE slug = ?', [String(slug || '')]);
  const p = Number(page);
  if (!t || !Number.isInteger(p) || p < 1 || p > t.page_count) return Response.json({ error: 'dados inválidos' }, { status: 400 });
  if (!(await canRead(user.id, t.id))) return Response.json({ error: 'sem acesso' }, { status: 403 });
  await q('INSERT INTO reading_progress (user_id, title_id, page) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE page = VALUES(page)', [user.id, t.id, p]);
  return Response.json({ ok: true });
}
