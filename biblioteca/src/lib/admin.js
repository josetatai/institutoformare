import { redirect } from 'next/navigation';
import { currentUser } from './auth';

/** Para páginas do painel. */
export async function requireAdmin() {
  const u = await currentUser();
  if (!u) redirect('/entrar');
  if (!u.is_admin) redirect('/');
  return u;
}

/** Para rotas de API do painel: devolve o usuário ou null. */
export async function adminOrNull() {
  const u = await currentUser();
  return u?.is_admin ? u : null;
}

export const slugify = (s) =>
  String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 100);

/** Nome de arquivo seguro, mantendo a extensão. */
export const safeFileName = (s) => {
  const base = String(s).split(/[\\/]/).pop();
  const m = base.match(/^(.*?)(\.[A-Za-z0-9]{1,6})?$/);
  return (slugify(m[1]) || 'arquivo') + (m[2] || '').toLowerCase();
};
