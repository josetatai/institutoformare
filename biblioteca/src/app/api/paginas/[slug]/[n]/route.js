import fs from 'node:fs/promises';
import path from 'node:path';
import { currentUser } from '@/lib/auth';
import { canRead } from '@/lib/access';
import { one } from '@/lib/db';
import { storageDir } from '@/lib/storage';

export const dynamic = 'force-dynamic';

// Serve a imagem de uma página só para quem tem acesso liberado ao título.
export async function GET(_req, { params }) {
  const { slug, n } = await params;
  const user = await currentUser();
  if (!user) return new Response('Faça login', { status: 401 });
  const title = await one('SELECT id, slug, page_count FROM titles WHERE slug = ?', [slug]);
  const page = Number(n);
  if (!title || !Number.isInteger(page) || page < 1 || page > title.page_count) return new Response('Página não encontrada', { status: 404 });
  if (!(await canRead(user.id, title.id))) return new Response('Sem acesso', { status: 403 });
  const file = path.join(storageDir(), 'livros', title.slug, `${String(page).padStart(3, '0')}.webp`);
  try {
    const buf = await fs.readFile(file);
    return new Response(buf, { headers: { 'Content-Type': 'image/webp', 'Cache-Control': 'private, max-age=600', 'X-Robots-Tag': 'noindex' } });
  } catch {
    return new Response('Página não encontrada', { status: 404 });
  }
}
