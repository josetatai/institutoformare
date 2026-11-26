import fs from 'node:fs/promises';
import path from 'node:path';
import { adminOrNull } from '@/lib/admin';
import { one, q } from '@/lib/db';
import { storageDir } from '@/lib/storage';

const TYPES = { 'image/webp': 'webp', 'image/jpeg': 'jpg', 'image/png': 'png' };

// POST form-data: titleId, file
export async function POST(req) {
  if (!(await adminOrNull())) return Response.json({ error: 'só administrador' }, { status: 403 });
  const form = await req.formData();
  const t = await one('SELECT id, slug FROM titles WHERE id = ?', [Number(form.get('titleId'))]);
  const file = form.get('file');
  if (!t || !file || typeof file === 'string') return Response.json({ error: 'dados inválidos' }, { status: 400 });
  const ext = TYPES[file.type];
  if (!ext) return Response.json({ error: 'Use imagem JPG, PNG ou WebP.' }, { status: 400 });
  if (file.size > 5 * 1048576) return Response.json({ error: 'Imagem acima de 5 MB.' }, { status: 400 });
  const dir = path.join(storageDir(), 'capas');
  await fs.mkdir(dir, { recursive: true });
  const name = `${t.slug}-${Date.now()}.${ext}`;
  await fs.writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
  await q('UPDATE titles SET cover_path = ? WHERE id = ?', [`/api/capas/${name}`, t.id]);
  return Response.json({ ok: true, cover: `/api/capas/${name}` });
}
