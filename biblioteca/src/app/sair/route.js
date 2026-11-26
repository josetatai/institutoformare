import { destroySession } from '@/lib/auth';
export async function GET(req) {
  await destroySession();
  return Response.redirect(new URL('/entrar', req.url), 303);
}
