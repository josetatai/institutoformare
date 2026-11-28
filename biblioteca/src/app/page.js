import { requireUser, firstName } from '@/lib/auth';
import { catalogFor, toClient } from '@/lib/access';
import Library from '@/components/Library';

export const dynamic = 'force-dynamic';

export default async function Home({ searchParams }) {
  const user = await requireUser();
  const sp = await searchParams;
  const asCustomer = !!user.is_admin && sp?.cliente === '1'; // o administrador confere como o cliente enxerga
  const items = toClient(await catalogFor(user.id, { asCustomer }));
  return <Library items={items} firstName={firstName(user)} isAdmin={!!user.is_admin} asCustomer={asCustomer} />;
}
