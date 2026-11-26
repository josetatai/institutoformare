import fs from 'node:fs/promises';
import path from 'node:path';
import { currentUser } from '@/lib/auth';
import { catalogFor } from '@/lib/access';
import { one, q } from '@/lib/db';
import { storageDir } from '@/lib/storage';

export const dynamic = 'force-dynamic';

export async function GET(req, { params }) {
  const { id } = await params;
  const user = await currentUser();
  if (!user) return new Response('Faça login', { status: 401 });
  const att = await one('SELECT a.*, t.slug FROM attachments a JOIN titles t ON t.id = a.title_id WHERE a.id = ?', [Number(id)]);
  if (!att) return new Response('Anexo não encontrado', { status: 404 });
  const cat = await catalogFor(user.id);
  const info = cat.find((t) => t.slug === att.slug)?.anexos.find((a) => a.id === att.id);
  if (!info?.available) return new Response('Este anexo ainda não está liberado para você', { status: 403 });
  try {
    const buf = await fs.readFile(path.join(storageDir(), 'anexos', att.slug, att.file_name));
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null;
    await q('INSERT INTO downloads (user_id, attachment_id, ip) VALUES (?, ?, ?)', [user.id, att.id, ip]);
    return new Response(buf, {
      headers: {
        'Content-Type': att.mime,
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(att.file_name)}`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch {
    return new Response('Arquivo não encontrado no servidor', { status: 404 });
  }
}
