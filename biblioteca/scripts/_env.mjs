// Carrega .env (Node 20.12+) e abre conexão para os scripts
import fs from 'node:fs';
import mysql from 'mysql2/promise';
if (fs.existsSync('.env')) process.loadEnvFile('.env');
export async function connect() {
  return mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1', port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME,
    timezone: 'Z', multipleStatements: true, charset: 'utf8mb4',
  });
}
