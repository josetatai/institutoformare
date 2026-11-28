import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { one } from '@/lib/db';
import Reader from '@/components/Reader';
import { licenseCode } from '@/lib/license';

export const dynamic = 'force-dynamic';

// Folhear as primeiras páginas de um título ainda não adquirido (qualquer leitor logado).
export default async function Amostra({ params }) {
  const { slug } = await params;
  const user = await requireUser();
  const t = await one(
    `SELECT t.id, t.slug, t.vol_label, t.name, t.page_count, t.sample_pages, p.checkout_url
       FROM titles t LEFT JOIN products p ON p.id = t.buy_product_id
      WHERE t.slug = ? AND t.published = 1 AND t.coming_soon = 0`, [slug]);
  const n = t ? Math.min(Number(t.sample_pages), Number(t.page_count)) : 0;
  if (!t || n < 1) notFound();
  return <Reader sample buyUrl={t.checkout_url || null} slug={t.slug} title={`Amostra · ${t.vol_label}: ${t.name}`} pageCount={n} startPage={1} email={user.email} code={licenseCode(user.id, t.id)} />;
}
