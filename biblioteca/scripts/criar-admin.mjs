// Cria (ou promove) um administrador e mostra uma senha provisória.
// Uso: npm run admin:criar -- email@dominio.com "Nome"
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { connect } from './_env.mjs';
const [email, name] = process.argv.slice(2);
if (!email) { console.log('Uso: npm run admin:criar -- email@dominio.com "Nome"'); process.exit(1); }
const A = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
const pw = Array.from({ length: 10 }, () => A[crypto.randomInt(A.length)]).join('');
const db = await connect();
await db.execute(
  `INSERT INTO users (email, name, password_hash, must_change_password, is_admin) VALUES (?, ?, ?, 1, 1)
   ON DUPLICATE KEY UPDATE is_admin = 1, password_hash = VALUES(password_hash), must_change_password = 1`,
  [email.toLowerCase(), name || null, await bcrypt.hash(pw, 10)]
);
console.log(`Administrador: ${email.toLowerCase()}\nSenha provisória: ${pw}\n(troque no primeiro acesso)`);
await db.end();
