'use server';
import { redirect } from 'next/navigation';
import { q, one } from '@/lib/db';
import { createSession, destroySession, checkPassword, hashPassword, currentUser } from '@/lib/auth';
import { sha256, randomToken } from '@/lib/crypto';
import { sendPasswordReset } from '@/lib/mail';

const MIN = 8;

export async function loginAction(_prev, form) {
  const email = String(form.get('email') || '').trim().toLowerCase();
  const password = String(form.get('password') || '');
  const user = email && (await one('SELECT id, password_hash, must_change_password FROM users WHERE email = ?', [email]));
  if (!user || !(await checkPassword(password, user.password_hash))) {
    return { email, error: 'E-mail ou senha não conferem. Confira a senha do e-mail de boas-vindas ou use "Esqueci minha senha".' };
  }
  await createSession(user.id);
  redirect(user.must_change_password ? '/primeiro-acesso' : '/');
}

export async function setPasswordAction(_prev, form) {
  const user = await currentUser();
  if (!user) redirect('/entrar');
  const a = String(form.get('password') || ''), b = String(form.get('password2') || '');
  if (a.length < MIN) return { error: `A senha precisa ter pelo menos ${MIN} caracteres.` };
  if (a !== b) return { error: 'As duas senhas não são iguais.' };
  await q('UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = ?', [await hashPassword(a), user.id]);
  redirect('/');
}

export async function changePasswordAction(_prev, form) {
  const user = await currentUser();
  if (!user) redirect('/entrar');
  const row = await one('SELECT password_hash FROM users WHERE id = ?', [user.id]);
  if (!(await checkPassword(String(form.get('current') || ''), row.password_hash))) return { error: 'A senha atual não confere.' };
  const a = String(form.get('password') || ''), b = String(form.get('password2') || '');
  if (a.length < MIN) return { error: `A nova senha precisa ter pelo menos ${MIN} caracteres.` };
  if (a !== b) return { error: 'As duas senhas novas não são iguais.' };
  await q('UPDATE users SET password_hash = ? WHERE id = ?', [await hashPassword(a), user.id]);
  return { ok: 'Senha alterada.' };
}

export async function forgotAction(_prev, form) {
  const email = String(form.get('email') || '').trim().toLowerCase();
  const user = email && (await one('SELECT id FROM users WHERE email = ?', [email]));
  if (user) {
    const token = randomToken();
    await q('INSERT INTO password_resets (token_hash, user_id, expires_at) VALUES (?, ?, DATE_ADD(UTC_TIMESTAMP(), INTERVAL 1 HOUR))', [sha256(token), user.id]);
    try { await sendPasswordReset({ to: email, token }); } catch { return { error: 'Não conseguimos enviar o e-mail agora. Tente de novo em alguns minutos.' }; }
  }
  // mesma resposta exista ou não a conta
  return { ok: 'Se este e-mail tem conta na biblioteca, enviamos um link para criar nova senha. Ele vale por 1 hora.' };
}

export async function resetAction(_prev, form) {
  const token = String(form.get('token') || '');
  const row = await one('SELECT user_id FROM password_resets WHERE token_hash = ? AND used_at IS NULL AND expires_at > UTC_TIMESTAMP()', [sha256(token)]);
  if (!row) return { error: 'Este link expirou ou já foi usado. Peça um novo em "Esqueci minha senha".' };
  const a = String(form.get('password') || ''), b = String(form.get('password2') || '');
  if (a.length < MIN) return { error: `A senha precisa ter pelo menos ${MIN} caracteres.` };
  if (a !== b) return { error: 'As duas senhas não são iguais.' };
  await q('UPDATE users SET password_hash = ?, must_change_password = 0 WHERE id = ?', [await hashPassword(a), row.user_id]);
  await q('UPDATE password_resets SET used_at = UTC_TIMESTAMP() WHERE token_hash = ?', [sha256(token)]);
  await q('DELETE FROM sessions WHERE user_id = ?', [row.user_id]);
  await createSession(row.user_id);
  redirect('/');
}

export async function logoutAction() {
  await destroySession();
  redirect('/entrar');
}
