import fs from 'node:fs/promises';
import path from 'node:path';
import { adminOrNull } from '@/lib/admin';
import { one, q } from '@/lib/db';
import { storageDir } from '@/lib/storage';

// POST json: { titleId, pages, coverFromFirst }
export async function POST(req) {
  if (!(await adminOrNull())) return Response.json({ error: 'só administrador' }, { status: 403 });
  const { titleId, pages, coverFromFirst } = await req.json().catch(() => ({}));
  const t = await one('SELECT id, slug, cover_path FROM titles WHERE id = ?', [Number(titleId)]);
  if (!t) return Response.json({ error: 'título não encontrado' }, { status: 404 });
  const base = path.join(storageDir(), 'livros');
  const tmp = path.join(base, `${t.slug}.novo`);
  const files = (await fs.readdir(tmp).catch(() => [])).filter((f) => /^\d{3}\.webp$/.test(f));
  if (files.length !== Number(pages)) return Response.json({ error: `chegaram ${files.length} de ${pages} páginas; envie de novo` }, { status: 400 });
  const final = path.join(base, t.slug);
  const old = path.join(base, `${t.slug}.antigo`);
  await fs.rm(old, { recursive: true, force: true });
  await fs.rename(final, old).catch(() => {});
  await fs.rename(tmp, final);
  await fs.rm(old, { recursive: true, force: true });
  await q('UPDATE titles SET page_count = ? WHERE id = ?', [files.length, t.id]);
  if (coverFromFirst && !t.cover_path) {
    const capas = path.join(storageDir(), 'capas');
    await fs.mkdir(capas, { recursive: true });
    const name = `${t.slug}-${Date.now()}.webp`;
    await fs.copyFile(path.join(final, '001.webp'), path.join(capas, name));
    await q('UPDATE titles SET cover_path = ? WHERE id = ?', [`/api/capas/${name}`, t.id]);
  }
  return Response.json({ ok: true, pages: files.length });
}
