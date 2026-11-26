import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import os from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import mysql from 'mysql2/promise';
import { storageDir } from '@/lib/storage';
import { hashPassword } from '@/lib/auth';
import { tempPassword } from '@/lib/crypto';
import { sendWelcome } from '@/lib/mail';

export const dynamic = 'force-dynamic';

/*
 * Instalação no servidor (uma vez): cria as tabelas, carrega o catálogo de
 * STORAGE_DIR/instalacao/catalogo.sql (se o banco ainda estiver vazio) e cria o administrador.
 * POST /api/instalar  com cabeçalho x-setup-token = SETUP_TOKEN e corpo { "adminEmail": "...", "adminName": "..." }
 * Sem SETUP_TOKEN no ambiente, a rota fica desligada.
 */
export async function POST(req) {
  const token = process.env.SETUP_TOKEN;
  const got = req.headers.get('x-setup-token') || '';
  if (!token || got.length !== token.length || !crypto.timingSafeEqual(Buffer.from(got), Buffer.from(token))) {
    return Response.json({ error: 'não autorizado' }, { status: 403 });
  }
  const { adminEmail, adminName, extract } = await req.json().catch(() => ({}));
  const log = [];
  // Arquivos (livros, capas, anexos) enviados como .tar.gz para public_html: extrai para STORAGE_DIR e apaga o pacote.
  if (extract) {
    if (!/^[\w.-]+\.tar\.gz$/.test(extract)) return Response.json({ error: 'nome de pacote inválido' }, { status: 400 });
    const host = new URL(process.env.APP_URL || 'https://biblioteca.institutoformare.com.br').hostname;
    const src = path.join(process.env.PUBLIC_HTML_DIR || path.join(os.homedir(), 'domains', host, 'public_html'), extract);
    try {
      await fs.mkdir(storageDir(), { recursive: true });
      await promisify(execFile)('tar', ['-xzf', src, '-C', storageDir()], { maxBuffer: 1 << 20 });
      await fs.rm(src, { force: true });
      log.push(`pacote ${extract} extraído em ${storageDir()}`);
    } catch (e) {
      return Response.json({ ok: false, log, error: `falha ao extrair: ${e.message}`, home: os.homedir() }, { status: 500 });
    }
  }
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1', port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME,
    multipleStatements: true, charset: 'utf8mb4', timezone: 'Z',
  });
  try {
    await db.query(await fs.readFile(path.join(process.cwd(), 'db', 'schema.sql'), 'utf8'));
    log.push('tabelas ok');
    const [[{ n }]] = await db.query('SELECT COUNT(*) AS n FROM titles');
    if (n === 0) {
      const sql = await fs.readFile(path.join(storageDir(), 'instalacao', 'catalogo.sql'), 'utf8').catch(() => null);
      if (sql) { await db.query(sql); log.push('catálogo carregado'); } else log.push('catalogo.sql não encontrado');
    } else log.push(`catálogo já existia (${n} títulos)`);
    if (adminEmail) {
      const email = String(adminEmail).trim().toLowerCase();
      const pw = tempPassword(10);
      await db.execute(
        `INSERT INTO users (email, name, password_hash, must_change_password, is_admin) VALUES (?, ?, ?, 1, 1)
         ON DUPLICATE KEY UPDATE is_admin = 1, password_hash = VALUES(password_hash), must_change_password = 1`,
        [email, adminName || null, await hashPassword(pw)]
      );
      try {
        await sendWelcome({ to: email, name: adminName, tempPassword: pw, productName: 'o painel administrativo da Biblioteca Formare' });
        log.push(`administrador ${email} criado; senha provisória enviada por e-mail`);
      } catch (e) {
        log.push(`administrador ${email} criado; e-mail não enviado (${e.message})`);
        // sem e-mail configurado ainda: devolve a senha provisória (troca obrigatória no primeiro acesso)
        log.push({ senhaProvisoria: pw });
      }
    }
    const [[c]] = await db.query('SELECT (SELECT COUNT(*) FROM titles) t, (SELECT COUNT(*) FROM products) p, (SELECT COUNT(*) FROM attachments) a');
    log.push(`títulos ${c.t}, regras de produto ${c.p}, anexos ${c.a}`);
    const ls = async (d) => (await fs.readdir(path.join(storageDir(), d)).catch(() => [])).length;
    log.push(`armazenamento ${storageDir()}: livros ${await ls('livros')}, capas ${await ls('capas')}, anexos ${await ls('anexos')}`);
    return Response.json({ ok: true, log });
  } catch (e) {
    return Response.json({ ok: false, log, error: e.message }, { status: 500 });
  } finally {
    await db.end();
  }
}
