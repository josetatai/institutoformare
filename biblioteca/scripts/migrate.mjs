import fs from 'node:fs';
import { connect } from './_env.mjs';
const db = await connect();
await db.query(fs.readFileSync(new URL('../db/schema.sql', import.meta.url), 'utf8'));
console.log('Tabelas criadas/atualizadas.');
await db.end();
