import fs from 'node:fs/promises';
import path from 'node:path';
import { currentUser } from '@/lib/auth';
import { one } from '@/lib/db';
import { storageDir } from '@/lib/storage';

export const dynamic = 'force-dynamic';

// Serve só as primeiras `sample_pages` páginas, para qualquer leitor logado.
export async function GET(_req, { params }) {
  const { slug, n } = await params;
  if (!(await currentUser())) return new Response('Faça login', { status: 401 });
  const t = await one('SELECT slug, page_count, sample_pages FROM titles WHERE slug = ? AND published = 1 AND coming_soon = 0', [slug]);
  const page = Number(n);
  const max = t ? Math.min(Number(t.sample_pages), Number(t.page_count)) : 0;
  if (!t || !Number.isInteger(page) || page < 1 || page > max) return new Response('Página não encontrada', { status: 404 });
  try {
    const buf = await fs.readFile(path.join(storageDir(), 'livros', t.slug, `${String(page).padStart(3, '0')}.webp`));
    return new Response(buf, { headers: { 'Content-Type': 'image/webp', 'Cache-Control': 'private, max-age=600', 'X-Robots-Tag': 'noindex' } });
  } catch { return new Response('Página não encontrada', { status: 404 }); }
}
