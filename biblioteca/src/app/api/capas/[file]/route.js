import fs from 'node:fs/promises';
import path from 'node:path';
import { storageDir } from '@/lib/storage';

// Capas ficam em STORAGE_DIR/capas e são públicas (aparecem também nos títulos bloqueados).
export async function GET(_req, { params }) {
  const { file } = await params;
  if (!/^[a-z0-9-]+\.(webp|jpg|jpeg|png)$/i.test(file)) return new Response('Não encontrada', { status: 404 });
  try {
    const buf = await fs.readFile(path.join(storageDir(), 'capas', file));
    const type = file.endsWith('.png') ? 'image/png' : /\.jpe?g$/i.test(file) ? 'image/jpeg' : 'image/webp';
    return new Response(buf, { headers: { 'Content-Type': type, 'Cache-Control': 'public, max-age=86400' } });
  } catch {
    return new Response('Não encontrada', { status: 404 });
  }
}
