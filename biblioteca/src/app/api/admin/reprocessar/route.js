import { adminOrNull } from '@/lib/admin';
import { reprocessPending } from '@/lib/reprocess';

export const dynamic = 'force-dynamic';

// POST /api/admin/reprocessar   ?sem_email=1 para não enviar e-mails
export async function POST(req) {
  if (!(await adminOrNull())) return Response.json({ error: 'só administrador' }, { status: 403 });
  const sendEmail = new URL(req.url).searchParams.get('sem_email') !== '1';
  return Response.json({ resultados: await reprocessPending({ sendEmail }) });
}
