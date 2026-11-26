import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { q, one } from './db';
import { sha256, randomToken } from './crypto';

const COOKIE = 'bf_sessao';
const SESSION_DAYS = 30;

export const hashPassword = (pw) => bcrypt.hash(pw, 10);
export const checkPassword = (pw, hash) => bcrypt.compare(pw, hash);

export async function createSession(userId) {
  const token = randomToken();
  const expires = new Date(Date.now() + SESSION_DAYS * 864e5);
  await q('INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)', [sha256(token), userId, expires]);
  await q('UPDATE users SET last_login_at = UTC_TIMESTAMP() WHERE id = ?', [userId]);
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await q('DELETE FROM sessions WHERE id = ?', [sha256(token)]);
  jar.delete(COOKIE);
}

export async function currentUser() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  return one(
    `SELECT u.id, u.email, u.name, u.must_change_password, u.is_admin
       FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.id = ? AND s.expires_at > UTC_TIMESTAMP()`,
    [sha256(token)]
  );
}

/** Para páginas: exige login e, se a senha for provisória, manda trocar. */
export async function requireUser({ allowTempPassword = false } = {}) {
  const user = await currentUser();
  if (!user) redirect('/entrar');
  if (user.must_change_password && !allowTempPassword) redirect('/primeiro-acesso');
  return user;
}

export function firstName(user) {
  const n = (user?.name || '').trim().split(/\s+/)[0];
  return n || (user?.email || '').split('@')[0];
}
