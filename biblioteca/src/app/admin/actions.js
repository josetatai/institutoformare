'use server';
import fs from 'node:fs/promises';
import path from 'node:path';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdmin, slugify } from '@/lib/admin';
import { q, one, tx } from '@/lib/db';
import { storageDir } from '@/lib/storage';
import { addDays } from '@/lib/dates';
import { tempPassword } from '@/lib/crypto';
import { hashPassword } from '@/lib/auth';
import { sendWelcome } from '@/lib/mail';
import { reprocessPending } from '@/lib/reprocess';

const lines = (s) => String(s || '').split('\n').map((x) => x.trim()).filter(Boolean);
const int = (v, d = 0) => (Number.isFinite(parseInt(v, 10)) ? parseInt(v, 10) : d);

// Títulos ----------------------------------------------------------------------

export async function saveTitle(_prev, form) {
  await requireAdmin();
  const id = int(form.get('id'));
  const data = [
    String(form.get('vol_label') || '').trim(),
    String(form.get('name') || '').trim(),
    String(form.get('description') || '').trim() || null,
    JSON.stringify(lines(form.get('includes'))),
    JSON.stringify(lines(form.get('toc'))),
    int(form.get('collection_id')),
    form.get('buy_product_id') ? int(form.get('buy_product_id')) : null,
    int(form.get('sort')),
    form.get('published') ? 1 : 0,
  ];
  if (!data[0] || !data[1]) return { error: 'Preencha o rótulo (ex.: Cartilha Vol. 1) e o nome.' };
  await q(`UPDATE titles SET vol_label=?, name=?, description=?, includes_json=?, toc_json=?, collection_id=?, buy_product_id=?, sort=?, published=? WHERE id=?`, [...data, id]);
  revalidatePath('/admin/titulos');
  return { ok: 'Título salvo.' };
}

export async function createTitle(_prev, form) {
  await requireAdmin();
  const name = String(form.get('name') || '').trim();
  const vol = String(form.get('vol_label') || '').trim();
  const col = int(form.get('collection_id'));
  if (!name || !vol || !col) return { error: 'Preencha rótulo, nome e coleção.' };
  const c = await one('SELECT slug FROM collections WHERE id = ?', [col]);
  let slug = slugify(`${c.slug}-${vol}-${name}`);
  if (await one('SELECT id FROM titles WHERE slug = ?', [slug])) slug = `${slug}-${Date.now().toString(36)}`;
  const r = await q('INSERT INTO titles (slug, collection_id, vol_label, name, published) VALUES (?, ?, ?, ?, 0)', [slug, col, vol, name]);
  redirect(`/admin/titulos/${r.insertId}`);
}

export async function updateAttachment(form) {
  await requireAdmin();
  await q('UPDATE attachments SET name = ?, release_days = ?, sort = ? WHERE id = ?',
    [String(form.get('name') || '').trim(), Math.max(0, int(form.get('release_days'))), int(form.get('sort')), int(form.get('id'))]);
  revalidatePath(`/admin/titulos/${int(form.get('title_id'))}`);
}

export async function deleteAttachment(form) {
  await requireAdmin();
  const a = await one('SELECT a.file_name, t.slug, t.id AS tid FROM attachments a JOIN titles t ON t.id = a.title_id WHERE a.id = ?', [int(form.get('id'))]);
  if (a) {
    await q('DELETE FROM attachments WHERE id = ?', [int(form.get('id'))]);
    await fs.rm(path.join(storageDir(), 'anexos', a.slug, a.file_name), { force: true });
    revalidatePath(`/admin/titulos/${a.tid}`);
  }
}

// Produtos Kiwify -------------------------------------------------------------

export async function saveProduct(_prev, form) {
  await requireAdmin();
  const id = int(form.get('id'));
  await tx(async (c) => {
    await c.q('UPDATE products SET name = ?, checkout_url = ?, access_days = ? WHERE id = ?',
      [String(form.get('name') || '').trim(), String(form.get('checkout_url') || '').trim() || null, Math.max(1, int(form.get('access_days'), 365)), id]);
    await c.q('DELETE FROM product_titles WHERE product_id = ?', [id]);
    for (const tid of form.getAll('title')) {
      await c.q('INSERT INTO product_titles (product_id, title_id, release_days) VALUES (?, ?, ?)', [id, int(tid), Math.max(0, int(form.get(`days_${tid}`)))]);
    }
  });
  revalidatePath('/admin/produtos');
  return { ok: 'Produto salvo. Vale para as próximas compras; quem já comprou mantém as datas que recebeu.' };
}

export async function createProduct(_prev, form) {
  await requireAdmin();
  const kid = String(form.get('kiwify_product_id') || '').trim();
  const offer = String(form.get('kiwify_offer_id') || '').trim();
  const name = String(form.get('name') || '').trim();
  if (!kid || !name) return { error: 'Informe o ID do produto na Kiwify e o nome.' };
  if (await one('SELECT id FROM products WHERE kiwify_product_id = ? AND kiwify_offer_id = ?', [kid, offer])) return { error: 'Este produto (e oferta) já está cadastrado.' };
  await q('INSERT INTO products (kiwify_product_id, kiwify_offer_id, name) VALUES (?, ?, ?)', [kid, offer, name]);
  revalidatePath('/admin/produtos');
  return { ok: 'Produto criado. Agora marque os títulos que ele libera.' };
}

// Avisos ----------------------------------------------------------------------

export async function reprocessAction(_prev, form) {
  await requireAdmin();
  const res = await reprocessPending({ sendEmail: !form.get('sem_email') });
  revalidatePath('/admin/avisos');
  return { ok: res.length ? res.map((r) => `#${r.id} pedido ${r.pedido}: ${r.resultado}`).join('\n') : 'Nenhum aviso pendente.' };
}

// Clientes --------------------------------------------------------------------

/** Libera um produto manualmente (ex.: cliente antigo, cortesia). */
export async function grantManual(_prev, form) {
  await requireAdmin();
  const email = String(form.get('email') || '').trim().toLowerCase();
  const product = await one('SELECT * FROM products WHERE id = ?', [int(form.get('product_id'))]);
  if (!email || !product) return { error: 'Informe o e-mail e escolha o produto.' };
  const start = form.get('start') ? new Date(String(form.get('start')) + 'T12:00:00-03:00') : new Date();
  const items = await q('SELECT title_id, release_days FROM product_titles WHERE product_id = ?', [product.id]);
  if (!items.length) return { error: 'Este produto ainda não libera nenhum título.' };
  const orderId = `manual-${Date.now()}`;
  const r = await tx(async (c) => {
    let u = (await c.q('SELECT id FROM users WHERE email = ?', [email]))[0];
    let temp = null;
    if (!u) {
      temp = tempPassword();
      const ins = await c.q('INSERT INTO users (email, name, password_hash, must_change_password) VALUES (?, ?, ?, 1)', [email, String(form.get('name') || '').trim() || null, await hashPassword(temp)]);
      u = { id: ins.insertId };
    }
    for (const it of items) {
      await c.q('INSERT IGNORE INTO grants (user_id, title_id, product_id, order_id, starts_at, release_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [u.id, it.title_id, product.id, orderId, start, addDays(start, it.release_days), addDays(start, product.access_days)]);
    }
    return { temp };
  });
  let msg = `${product.name} liberado para ${email}.`;
  if (r.temp && form.get('send_email')) {
    try { await sendWelcome({ to: email, name: form.get('name') || null, tempPassword: r.temp, productName: product.name }); msg += ' E-mail de acesso enviado.'; }
    catch (e) { msg += ` E-mail NÃO enviado (${e.message}). Use "Reenviar acesso".`; }
  } else if (r.temp) msg += ' Conta nova criada; use "Reenviar acesso" para mandar a senha.';
  revalidatePath('/admin/clientes');
  return { ok: msg };
}

/** Gera nova senha provisória e envia por e-mail. */
export async function resendAccess(form) {
  await requireAdmin();
  const u = await one('SELECT id, email, name FROM users WHERE id = ?', [int(form.get('user_id'))]);
  if (!u) return;
  const temp = tempPassword();
  await q('UPDATE users SET password_hash = ?, must_change_password = 1 WHERE id = ?', [await hashPassword(temp), u.id]);
  await q('DELETE FROM sessions WHERE user_id = ?', [u.id]);
  await sendWelcome({ to: u.email, name: u.name, tempPassword: temp, productName: 'seus títulos da Biblioteca Formare' });
  revalidatePath('/admin/clientes');
}

export async function revokeGrant(form) {
  await requireAdmin();
  await q("UPDATE grants SET revoked_at = UTC_TIMESTAMP(), revoke_reason = 'manual' WHERE id = ?", [int(form.get('id'))]);
  revalidatePath('/admin/clientes');
}

export async function extendGrant(form) {
  await requireAdmin();
  await q('UPDATE grants SET expires_at = DATE_ADD(expires_at, INTERVAL ? DAY), revoked_at = NULL WHERE id = ?', [Math.max(1, int(form.get('days'), 30)), int(form.get('id'))]);
  revalidatePath('/admin/clientes');
}
