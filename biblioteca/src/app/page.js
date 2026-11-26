import { requireUser, firstName } from '@/lib/auth';
import { catalogFor, toClient } from '@/lib/access';
import Library from '@/components/Library';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const user = await requireUser();
  const items = toClient(await catalogFor(user.id));
  return <Library items={items} firstName={firstName(user)} />;
}
