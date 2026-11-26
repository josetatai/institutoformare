import fs from 'node:fs/promises';
import path from 'node:path';
import { adminOrNull } from '@/lib/admin';
import { one } from '@/lib/db';
import { storageDir } from '@/lib/storage';

// Recebe uma página já convertida no navegador do administrador.
// POST form-data: titleId, n (1..), file (image/webp). Grava numa pasta temporária;
// /api/admin/finalizar-pdf troca a pasta do livro de uma vez só no fim.
export async function POST(req) {
  if (!(await adminOrNull())) return Response.json({ error: 'só administrador' }, { status: 403 });
  const form = await req.formData();
  const t = await one('SELECT slug FROM titles WHERE id = ?', [Number(form.get('titleId'))]);
  const n = Number(form.get('n'));
  const file = form.get('file');
  if (!t || !Number.isInteger(n) || n < 1 || n > 2000 || !file || typeof file === 'string') return Response.json({ error: 'dados inválidos' }, { status: 400 });
  const dir = path.join(storageDir(), 'livros', `${t.slug}.novo`);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, `${String(n).padStart(3, '0')}.webp`), Buffer.from(await file.arrayBuffer()));
  return Response.json({ ok: true });
}
