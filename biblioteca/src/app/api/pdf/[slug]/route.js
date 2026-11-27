import fs from 'node:fs/promises';
import path from 'node:path';
import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib';
import { currentUser } from '@/lib/auth';
import { canRead } from '@/lib/access';
import { one, q } from '@/lib/db';
import { storageDir } from '@/lib/storage';
import { licenseCode, watermarkText } from '@/lib/license';

export const dynamic = 'force-dynamic';

// PDF para download, carimbado na hora com a marca d'água do leitor (e-mail + código), na diagonal e bem clara.
export async function GET(req, { params }) {
  const { slug } = await params;
  const user = await currentUser();
  if (!user) return new Response('Faça login', { status: 401 });
  const t = await one('SELECT id, vol_label, name, pdf_file, pdf_enabled FROM titles WHERE slug = ? AND published = 1', [slug]);
  if (!t || !t.pdf_file || !t.pdf_enabled) return new Response('PDF não disponível para este título', { status: 404 });
  if (!(await canRead(user.id, t.id))) return new Response('Sem acesso', { status: 403 });

  let bytes;
  try { bytes = await fs.readFile(path.join(storageDir(), 'pdfs', path.basename(t.pdf_file))); }
  catch { return new Response('Arquivo não encontrado no servidor', { status: 404 }); }

  const code = licenseCode(user.id, t.id);
  const text = watermarkText(user.email, code);
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  const angle = 35 * Math.PI / 180;
  const unit = font.widthOfTextAtSize(text, 1) || 1;
  for (const page of doc.getPages()) {
    const { width, height } = page.getSize();
    const size = Math.max(12, Math.min(46, (Math.min(width, height) * 0.92 / Math.cos(angle)) / unit));
    const w = font.widthOfTextAtSize(text, size), h = size * 0.7;
    for (const cy of [height * 0.3, height * 0.7]) {
      const cx = width / 2;
      page.drawText(text, {
        x: cx - (w / 2) * Math.cos(angle) + (h / 2) * Math.sin(angle),
        y: cy - (w / 2) * Math.sin(angle) - (h / 2) * Math.cos(angle),
        size, font, color: rgb(0.25, 0.25, 0.25), opacity: 0.11, rotate: degrees(35),
      });
    }
  }
  doc.setTitle(`${t.vol_label}: ${t.name}`.replace(/[^\x20-\x7E -ÿ]/g, ''));
  doc.setAuthor('Instituto Formare');
  doc.setSubject(`Licenca ${code}`);
  doc.setKeywords([code]);
  doc.setProducer('Instituto Formare - Biblioteca');
  const out = await doc.save();

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null;
  await q('INSERT INTO pdf_downloads (user_id, title_id, code, ip) VALUES (?, ?, ?, ?)', [user.id, t.id, code, ip]);
  const fname = `${t.vol_label} - ${t.name}`.replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120) + '.pdf';
  return new Response(out, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${fname.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\x20-\x7E]/g, '').replace(/"/g, '')}"; filename*=UTF-8''${encodeURIComponent(fname)}`,
      'Cache-Control': 'private, no-store',
    },
  });
}
