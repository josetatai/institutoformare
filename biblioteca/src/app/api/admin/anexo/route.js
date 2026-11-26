import fs from 'node:fs/promises';
import path from 'node:path';
import { adminOrNull, safeFileName } from '@/lib/admin';
import { one, q } from '@/lib/db';
import { storageDir } from '@/lib/storage';

// POST form-data: titleId, name, releaseDays, file
export async function POST(req) {
  if (!(await adminOrNull())) return Response.json({ error: 'só administrador' }, { status: 403 });
  const form = await req.formData();
  const t = await one('SELECT id, slug FROM titles WHERE id = ?', [Number(form.get('titleId'))]);
  const file = form.get('file');
  if (!t || !file || typeof file === 'string') return Response.json({ error: 'Escolha um arquivo.' }, { status: 400 });
  if (file.size > 50 * 1048576) return Response.json({ error: 'Arquivo acima de 50 MB.' }, { status: 400 });
  const dir = path.join(storageDir(), 'anexos', t.slug);
  await fs.mkdir(dir, { recursive: true });
  let fname = safeFileName(file.name);
  try { await fs.access(path.join(dir, fname)); fname = fname.replace(/(\.[a-z0-9]+)?$/, `-${Date.now()}$1`); } catch {}
  await fs.writeFile(path.join(dir, fname), Buffer.from(await file.arrayBuffer()));
  const name = String(form.get('name') || '').trim() || file.name;
  const days = Math.max(0, parseInt(form.get('releaseDays') || '0', 10) || 0);
  await q('INSERT INTO attachments (title_id, name, file_name, mime, size_bytes, release_days) VALUES (?, ?, ?, ?, ?, ?)',
    [t.id, name, fname, file.type || 'application/octet-stream', file.size, days]);
  return Response.json({ ok: true });
}
