import mysql from 'mysql2/promise';

let pool = globalThis.__bfPool;
if (!pool) {
  pool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectionLimit: 5,
    charset: 'utf8mb4',
    timezone: 'Z',
    dateStrings: false,
  });
  globalThis.__bfPool = pool;
}

/** Executa SQL com parâmetros e devolve as linhas. */
export async function q(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

export async function one(sql, params = []) {
  const rows = await q(sql, params);
  return rows[0] || null;
}

/** Roda fn(conn) numa transação. */
export async function tx(fn) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const out = await fn({
      q: async (sql, p = []) => (await conn.execute(sql, p))[0],
    });
    await conn.commit();
    return out;
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

export { pool };
