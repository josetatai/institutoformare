import fs from 'node:fs/promises';
import path from 'node:path';
import { adminOrNull } from '@/lib/admin';
import { one, q } from '@/lib/db';
import { storageDir } from '@/lib/storage';

// Recebe o PDF original em partes (form-data: titleId, i, n, file). Na última parte, monta o arquivo na pasta privada.
export async function POST(req) {
  if (!(await adminOrNull())) return Response.json({ error: 'só administrador' }, { status: 403 });
  const form = await req.formData();
  const t = await one('SELECT id, slug FROM titles WHERE id = ?', [Number(form.get('titleId'))]);
  const i = Number(form.get('i')), n = Number(form.get('n'));
  const part = form.get('file');
  if (!t || !Number.isInteger(i) || !Number.isInteger(n) || i < 0 || n < 1 || i >= n || n > 200 || !part || typeof part === 'string') return Response.json({ error: 'dados inválidos' }, { status: 400 });
  const dir = path.join(storageDir(), 'pdfs');
  const parts = path.join(dir, `${t.slug}.parts`);
  if (i === 0) await fs.rm(parts, { recursive: true, force: true });
  await fs.mkdir(parts, { recursive: true });
  await fs.writeFile(path.join(parts, String(i).padStart(4, '0')), Buffer.from(await part.arrayBuffer()));
  if (i < n - 1) return Response.json({ ok: true, done: false });

  const names = (await fs.readdir(parts)).sort();
  if (names.length !== n) return Response.json({ error: `chegaram ${names.length} de ${n} partes; envie de novo` }, { status: 400 });
  const tmp = path.join(dir, `${t.slug}.pdf.novo`);
  const fh = await fs.open(tmp, 'w');
  try { for (const nm of names) await fh.write(await fs.readFile(path.join(parts, nm))); } finally { await fh.close(); }
  const head = (await fs.readFile(tmp)).subarray(0, 5).toString('latin1');
  if (head !== '%PDF-') { await fs.rm(tmp, { force: true }); await fs.rm(parts, { recursive: true, force: true }); return Response.json({ error: 'o arquivo enviado não é um PDF' }, { status: 400 }); }
  await fs.rename(tmp, path.join(dir, `${t.slug}.pdf`));
  await fs.rm(parts, { recursive: true, force: true });
  await q('UPDATE titles SET pdf_file = ? WHERE id = ?', [`${t.slug}.pdf`, t.id]);
  return Response.json({ ok: true, done: true });
}
