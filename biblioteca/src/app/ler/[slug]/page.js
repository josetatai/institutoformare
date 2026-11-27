import { notFound, redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { canRead } from '@/lib/access';
import { one } from '@/lib/db';
import Reader from '@/components/Reader';
import { licenseCode } from '@/lib/license';

export const dynamic = 'force-dynamic';

export default async function Ler({ params }) {
  const { slug } = await params;
  const user = await requireUser();
  const t = await one('SELECT id, slug, vol_label, name, page_count FROM titles WHERE slug = ? AND published = 1', [slug]);
  if (!t) notFound();
  if (!(await canRead(user.id, t.id))) redirect('/');
  const pr = await one('SELECT page FROM reading_progress WHERE user_id = ? AND title_id = ?', [user.id, t.id]);
  return <Reader slug={t.slug} title={`${t.vol_label}: ${t.name}`} pageCount={t.page_count} startPage={pr?.page || 1} email={user.email} code={licenseCode(user.id, t.id)} />;
}
