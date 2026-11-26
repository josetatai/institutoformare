// Cadastra coleções, títulos e produtos da Kiwify com o que cada um libera.
// Pode rodar de novo: atualiza sem duplicar.
// IDs dos produtos conferidos na Kiwify em 26/11/2026.
// Prazos de liberação programada (release_days) e textos de descrição: PENDENTES de José.
import fs from 'node:fs';
import path from 'node:path';
import { connect } from './_env.mjs';
const STORAGE = process.env.STORAGE_DIR || 'storage';

const COLLECTIONS = [
  { slug: 'contratacao-publica', name: 'Biblioteca da Contratação Pública', sort: 1, colors: ['#11705a', '#06261f', '#f2c94c'] },
  { slug: 'gestao-publica-era-ia', name: 'Gestão Pública na Era da IA', sort: 2, is_new: 1, colors: ['#ef6a1f', '#1a0c05', '#ffb36b'] },
  { slug: 'servidor-4-0', name: 'Servidor 4.0', sort: 3, colors: ['#1f5fd6', '#0a1c45', '#4fd1e8'] },
];

const C = '/api/capas/'; // capas provisórias (1ª página do PDF); troque pelo painel
const TITLES = [
  { slug: 'contratacao-vol1-fase-preparatoria', col: 'contratacao-publica', vol: 'Cartilha Vol. 1', name: 'Fase Preparatória na Lei 14.133', cover: C + 'contratacao-vol1-fase-preparatoria.webp', sort: 1 },
  { slug: 'contratacao-vol2-contratacao-direta', col: 'contratacao-publica', vol: 'Cartilha Vol. 2', name: 'Contratação Direta na Lei 14.133', cover: C + 'contratacao-vol2-contratacao-direta.webp', sort: 2 },
  { slug: 'contratacao-vol3-adesao-ata', col: 'contratacao-publica', vol: 'Cartilha Vol. 3', name: 'Adesão a Ata de Registro de Preços na Lei 14.133', cover: C + 'contratacao-vol3-adesao-ata.webp', sort: 3 },
  { slug: 'contratacao-vol4-pregao-ia', col: 'contratacao-publica', vol: 'Cartilha Vol. 4', name: 'Pregão com Inteligência Artificial na Lei 14.133', cover: C + 'contratacao-vol4-pregao-ia.webp', sort: 4 },
  { slug: 'contratacao-livro-vol1-fase-preparatoria', col: 'contratacao-publica', vol: 'Livro Vol. 1', name: 'Manual da Fase Interna da Contratação Pública', cover: C + 'contratacao-livro-vol1-fase-preparatoria.webp', sort: 11 },
  { slug: 'contratacao-livro-vol2-contratacao-direta', col: 'contratacao-publica', vol: 'Livro Vol. 2', name: 'Contratação Direta na Lei 14.133', cover: C + 'contratacao-livro-vol2-contratacao-direta.webp', sort: 12 },
  { slug: 'contratacao-livro-vol3-adesao-ata', col: 'contratacao-publica', vol: 'Livro Vol. 3', name: 'Adesão a Ata de Registro de Preços na Lei 14.133', cover: C + 'contratacao-livro-vol3-adesao-ata.webp', sort: 13 },
  { slug: 'contratacao-livro-vol4-pregao-ia', col: 'contratacao-publica', vol: 'Livro Vol. 4', name: 'Pregão com Inteligência Artificial', cover: C + 'contratacao-livro-vol4-pregao-ia.webp', sort: 14 },
  { slug: 'gestao-ia-vol1-dp-publico', col: 'gestao-publica-era-ia', vol: 'Volume 1', name: 'DP Público: do Ingresso ao Desligamento', cover: '/capas/gestao-ia-vol1.webp', sort: 1 },
  { slug: 'gestao-ia-vol2-contabilidade', col: 'gestao-publica-era-ia', vol: 'Volume 2', name: 'Contabilidade e Patrimônio Público', cover: '/capas/gestao-ia-vol2.webp', sort: 2 },
  { slug: 'gestao-ia-vol3-controle-interno', col: 'gestao-publica-era-ia', vol: 'Volume 3', name: 'Controle Interno, Convênios e Emendas', cover: '/capas/gestao-ia-vol3.webp', sort: 3 },
  { slug: 'servidor40-livro-completo', col: 'servidor-4-0', vol: 'Livro Completo', name: 'Servidor 4.0: Inteligência Artificial na Prática da Prefeitura', sort: 1 },
  { slug: 'servidor40-apostilas', col: 'servidor-4-0', vol: 'Combo', name: 'Servidor 4.0: as 4 Apostilas', sort: 2 },
];

// produto Kiwify -> títulos que libera [slug, dias após a compra]
const PRODUCTS = [
  { kid: 'a3b42eb0-cf1a-11f1-99bb-8d94649e99fb', name: 'Cartilha Vol. 1: Fase Preparatória na Lei 14.133', titles: [['contratacao-vol1-fase-preparatoria', 0]], buyFor: ['contratacao-vol1-fase-preparatoria'] },
  { kid: '05621030-cf1d-11f1-8d7f-1b267b2cef8d', name: 'Cartilha Vol. 2: Contratação Direta na Lei 14.133', titles: [['contratacao-vol2-contratacao-direta', 0]], buyFor: ['contratacao-vol2-contratacao-direta'] },
  { kid: '3583b020-cf1d-11f1-99bb-8d94649e99fb', name: 'Cartilha Vol. 3: Adesão a Ata de Registro de Preços na Lei 14.133', titles: [['contratacao-vol3-adesao-ata', 0]], buyFor: ['contratacao-vol3-adesao-ata'] },
  { kid: '6a65be50-cf1d-11f1-8d7f-1b267b2cef8d', name: 'Cartilha Vol. 4: Pregão com Inteligência Artificial na Lei 14.133', titles: [['contratacao-vol4-pregao-ia', 0]], buyFor: ['contratacao-vol4-pregao-ia'] },
  { kid: '5d647e90-cf26-11f1-99bb-8d94649e99fb', name: 'Combo Cartilhas Vol. 2, 3 e 4: Biblioteca da Contratação Pública', titles: [['contratacao-vol2-contratacao-direta', 0], ['contratacao-vol3-adesao-ata', 0], ['contratacao-vol4-pregao-ia', 0]] },
  { kid: '541c7d20-d2db-11f1-b738-7f08e3de31c4', name: 'Combo das 4 Cartilhas | Biblioteca da Contratação Pública', titles: [['contratacao-vol1-fase-preparatoria', 0], ['contratacao-vol2-contratacao-direta', 0], ['contratacao-vol3-adesao-ata', 0], ['contratacao-vol4-pregao-ia', 0]] },
  { kid: '90c2e510-db7e-11f1-bce4-add2aefaed80', name: 'Combo das 4 Cartilhas - Entrada | Biblioteca da Contratação Pública', titles: [['contratacao-vol1-fase-preparatoria', 0], ['contratacao-vol2-contratacao-direta', 0], ['contratacao-vol3-adesao-ata', 0], ['contratacao-vol4-pregao-ia', 0]] },
  { kid: 'f119b9a0-d01d-11f1-aba0-ffc08ad334e7', name: 'Livro Digital Completo Biblioteca da Contratação Pública + Bônus', titles: [['contratacao-livro-vol1-fase-preparatoria', 0], ['contratacao-livro-vol2-contratacao-direta', 0], ['contratacao-livro-vol3-adesao-ata', 0], ['contratacao-livro-vol4-pregao-ia', 0]], buyFor: ['contratacao-livro-vol1-fase-preparatoria', 'contratacao-livro-vol2-contratacao-direta', 'contratacao-livro-vol3-adesao-ata', 'contratacao-livro-vol4-pregao-ia'] },
  { kid: 'ade05fe0-d7ed-11f1-94de-a55929c22af7', name: 'Servidor 4.0: Inteligência Artificial na Prática da Prefeitura | Livro Digital Completo + Bônus', titles: [['servidor40-livro-completo', 0]], buyFor: ['servidor40-livro-completo'] },
  { kid: '060f1d20-d7f1-11f1-826a-61d1ef573c05', name: 'Servidor 4.0: Combo das 4 Apostilas | IA na Prática da Prefeitura', titles: [['servidor40-apostilas', 0]], buyFor: ['servidor40-apostilas'] },
  // Gestão Pública na Era da IA: produtos ainda não criados na Kiwify
];

const db = await connect();
const id = async (sql, p) => (await db.execute(sql, p))[0][0]?.id;

for (const c of COLLECTIONS) {
  await db.execute(
    `INSERT INTO collections (slug, name, sort, is_new, color1, color2, color3) VALUES (?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE name=VALUES(name), sort=VALUES(sort), is_new=VALUES(is_new), color1=VALUES(color1), color2=VALUES(color2), color3=VALUES(color3)`,
    [c.slug, c.name, c.sort, c.is_new || 0, ...c.colors]
  );
}
for (const t of TITLES) {
  const colId = await id('SELECT id FROM collections WHERE slug = ?', [t.col]);
  await db.execute(
    `INSERT INTO titles (slug, collection_id, vol_label, name, cover_path, sort) VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE collection_id=VALUES(collection_id), vol_label=VALUES(vol_label), name=VALUES(name), cover_path=COALESCE(cover_path, VALUES(cover_path)), sort=VALUES(sort)`,
    [t.slug, colId, t.vol, t.name, t.cover || null, t.sort]
  );
}
// páginas já convertidas em storage/livros/<slug>
for (const t of TITLES) {
  const dir = path.join(STORAGE, 'livros', t.slug);
  if (fs.existsSync(dir)) {
    const n = fs.readdirSync(dir).filter((f) => /^\d{3}\.webp$/.test(f)).length;
    await db.execute('UPDATE titles SET page_count = ? WHERE slug = ?', [n, t.slug]);
  }
}
await db.execute("DELETE FROM titles WHERE slug = 'contratacao-livro-completo'");

for (const p of PRODUCTS) {
  await db.execute(
    `INSERT INTO products (kiwify_product_id, name) VALUES (?, ?) ON DUPLICATE KEY UPDATE name=VALUES(name)`,
    [p.kid, p.name]
  );
  const pid = await id('SELECT id FROM products WHERE kiwify_product_id = ?', [p.kid]);
  for (const [slug, days] of p.titles) {
    const tid = await id('SELECT id FROM titles WHERE slug = ?', [slug]);
    await db.execute(
      `INSERT INTO product_titles (product_id, title_id, release_days) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE release_days=VALUES(release_days)`,
      [pid, tid, days]
    );
  }
  for (const slug of p.buyFor || []) await db.execute('UPDATE titles SET buy_product_id = ? WHERE slug = ?', [pid, slug]);
}
console.log(`Catálogo: ${COLLECTIONS.length} coleções, ${TITLES.length} títulos, ${PRODUCTS.length} produtos.`);
await db.end();
