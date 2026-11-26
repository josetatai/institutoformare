// Importa anexos a partir de uma lista JSON. Pode rodar de novo: troca o arquivo e
// atualiza o nome de quem já existe (mesmo título + mesmo nome de arquivo).
// Uso: npm run anexos:importar -- lista.json
// Formato: [{ "slug": "titulo", "file": "/caminho/arquivo.docx", "name": "Nome que o leitor vê", "days": 0, "sort": 1, "as": "nome-no-servidor.docx" }]
import fs from 'node:fs';
import path from 'node:path';
import { connect } from './_env.mjs';

const MIME = {
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  pdf: 'application/pdf', zip: 'application/zip', md: 'text/markdown',
};
const STORAGE = process.env.STORAGE_DIR || 'storage';
const list = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const db = await connect();
let n = 0;
for (const it of list) {
  const [[t]] = await db.execute('SELECT id FROM titles WHERE slug = ?', [it.slug]);
  if (!t) { console.log(`título não encontrado: ${it.slug}`); continue; }
  const fname = it.as || path.basename(it.file);
  const dir = path.join(STORAGE, 'anexos', it.slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.copyFileSync(it.file, path.join(dir, fname));
  const size = fs.statSync(it.file).size;
  const mime = MIME[fname.split('.').pop().toLowerCase()] || 'application/octet-stream';
  const [[a]] = await db.execute('SELECT id FROM attachments WHERE title_id = ? AND file_name = ?', [t.id, fname]);
  if (a) await db.execute('UPDATE attachments SET name = ?, mime = ?, size_bytes = ?, release_days = ?, sort = ? WHERE id = ?', [it.name, mime, size, it.days || 0, it.sort || 0, a.id]);
  else await db.execute('INSERT INTO attachments (title_id, name, file_name, mime, size_bytes, release_days, sort) VALUES (?, ?, ?, ?, ?, ?, ?)', [t.id, it.name, fname, mime, size, it.days || 0, it.sort || 0]);
  n++;
}
console.log(`${n} anexo(s) importado(s).`);
await db.end();
