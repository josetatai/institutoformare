// Cadastra coleções, títulos e produtos da Kiwify com o que cada um libera.
// Pode rodar de novo: atualiza nomes e regras sem duplicar e sem apagar capas,
// descrições e anexos editados pelo painel.
// Conferido na Kiwify em 26/11/2026 (turmas, ofertas e prazos de liberação de cada produto).
import fs from 'node:fs';
import path from 'node:path';
import { connect } from './_env.mjs';

const STORAGE = process.env.STORAGE_DIR || 'storage';

const COLLECTIONS = [
  { slug: 'contratacao-publica', name: 'Biblioteca da Contratação Pública', sort: 1, colors: ['#11705a', '#06261f', '#f2c94c'] },
  { slug: 'servidor-4-0', name: 'Servidor 4.0: IA na Prática da Prefeitura', sort: 2, colors: ['#1f5fd6', '#0a1c45', '#4fd1e8'] },
  { slug: 'gestao-publica-era-ia', name: 'Gestão Pública na Era da IA', sort: 3, is_new: 1, colors: ['#ef6a1f', '#1a0c05', '#ffb36b'] },
];

const C = '/api/capas/'; // capas provisórias; troque pelo painel
const L = 'Livro digital completo em flipbook';
const TITLES = [
  // Contratação Pública: cartilhas ilustradas
  { slug: 'contratacao-vol1-fase-preparatoria', col: 'contratacao-publica', vol: 'Cartilha Vol. 1', name: 'Fase Preparatória na Lei 14.133', cover: C + 'contratacao-vol1-fase-preparatoria.webp', sort: 1,
    desc: 'Guia prático sobre a fase preparatória nas contratações públicas conforme a Lei 14.133/2021: Documento de Formalização de Demanda (DFD), Estudo Técnico Preliminar (ETP), Análise de Riscos e Termo de Referência (TR).',
    inc: ['Cartilha ilustrada em flipbook'] },
  { slug: 'contratacao-vol2-contratacao-direta', col: 'contratacao-publica', vol: 'Cartilha Vol. 2', name: 'Contratação Direta na Lei 14.133', cover: C + 'contratacao-vol2-contratacao-direta.webp', sort: 2,
    desc: 'Guia prático sobre contratações diretas conforme a Lei 14.133/2021: Dispensa de Licitação, Inexigibilidade e Credenciamento.',
    inc: ['Cartilha ilustrada em flipbook'] },
  { slug: 'contratacao-vol3-adesao-ata', col: 'contratacao-publica', vol: 'Cartilha Vol. 3', name: 'Adesão a Ata de Registro de Preços na Lei 14.133', cover: C + 'contratacao-vol3-adesao-ata.webp', sort: 3,
    desc: 'Guia prático sobre adesão a Ata de Registro de Preços ("carona") conforme a Lei 14.133/2021 e o Decreto 11.462/2023: requisitos, limites, processo completo de adesão e checklist.',
    inc: ['Cartilha ilustrada em flipbook'] },
  { slug: 'contratacao-vol4-pregao-ia', col: 'contratacao-publica', vol: 'Cartilha Vol. 4', name: 'Pregão com Inteligência Artificial na Lei 14.133', cover: C + 'contratacao-vol4-pregao-ia.webp', sort: 4,
    desc: 'Guia prático sobre como usar Inteligência Artificial no Pregão Eletrônico conforme a Lei 14.133/2021 e a LGPD: prompts prontos, protocolo de verificação e checklist.',
    inc: ['Cartilha ilustrada em flipbook'] },
  // Contratação Pública: livro completo (4 volumes) e bônus
  { slug: 'contratacao-livro-vol1-fase-preparatoria', col: 'contratacao-publica', vol: 'Livro Vol. 1', name: 'Manual da Fase Interna da Contratação Pública', cover: C + 'contratacao-livro-vol1-fase-preparatoria.webp', sort: 11,
    desc: 'DFD, ETP, Análise de Riscos e Termo de Referência na Lei 14.133/2021, com exemplos de redação, checklists e modelos editáveis.',
    inc: [L, 'Modelos editáveis: DFD, ETP, Mapa de Riscos e 3 modelos de TR'] },
  { slug: 'contratacao-livro-vol2-contratacao-direta', col: 'contratacao-publica', vol: 'Livro Vol. 2', name: 'Contratação Direta na Lei 14.133', cover: C + 'contratacao-livro-vol2-contratacao-direta.webp', sort: 12,
    desc: 'Dispensa, Inexigibilidade e Credenciamento na Lei 14.133/2021, com exemplos de redação, checklists e modelos editáveis.',
    inc: [L, 'Modelos editáveis'] },
  { slug: 'contratacao-livro-vol3-adesao-ata', col: 'contratacao-publica', vol: 'Livro Vol. 3', name: 'Adesão a Ata de Registro de Preços na Lei 14.133', cover: C + 'contratacao-livro-vol3-adesao-ata.webp', sort: 13,
    desc: 'Regras, passo a passo, limites e modelos para a adesão a Ata de Registro de Preços na Lei 14.133/2021.',
    inc: [L, 'Modelos editáveis'] },
  { slug: 'contratacao-livro-vol4-pregao-ia', col: 'contratacao-publica', vol: 'Livro Vol. 4', name: 'Pregão com Inteligência Artificial', cover: C + 'contratacao-livro-vol4-pregao-ia.webp', sort: 14,
    desc: 'Do rascunho ao documento oficial: ETP, Termo de Referência e Análise de Riscos com IA, com prompts prontos, método de verificação e modelos editáveis.',
    inc: [L, 'Modelos editáveis'] },
  { slug: 'contratacao-bonus-100-prompts', col: 'contratacao-publica', vol: 'Bônus 1', name: '100 Prompts para a Contratação Pública', cover: C + 'contratacao-bonus-100-prompts.webp', sort: 21,
    desc: 'Guia prático com 100 prompts para Fase Interna, Contratação Direta, Ata de Registro de Preços e Pregão com Inteligência Artificial, prontos para copiar, colar e adaptar ao seu processo.',
    inc: ['Guia ilustrado em flipbook', 'Guia de Prompts em Word editável e PDF, para copiar os prompts'] },
  { slug: 'contratacao-bonus-50-modelos-tr', col: 'contratacao-publica', vol: 'Bônus 2', name: '50 Modelos de Termo de Referência', cover: C + 'contratacao-bonus-50-modelos-tr.webp', sort: 22,
    desc: '50 modelos de Termo de Referência por objeto, em Word editável, com a estrutura completa do art. 6º, XXIII, pontos de atenção e riscos típicos de cada objeto.',
    inc: ['50 modelos de TR em Word editável', 'Índice e instruções de uso'] },
  // Servidor 4.0: livro (4 volumes), bônus e apostilas
  { slug: 'servidor40-livro-vol1', col: 'servidor-4-0', vol: 'Livro Vol. 1', name: 'Comece com segurança', sort: 1, inc: [L, 'Kit com modelos, checklists e planilha'] },
  { slug: 'servidor40-livro-vol2', col: 'servidor-4-0', vol: 'Livro Vol. 2', name: 'A máquina administrativa', sort: 2, inc: [L, 'Kit com modelos, checklists e planilha'] },
  { slug: 'servidor40-livro-vol3', col: 'servidor-4-0', vol: 'Livro Vol. 3', name: 'Saúde, educação e assistência', sort: 3, inc: [L, 'Kit com modelos, checklists e planilha'] },
  { slug: 'servidor40-livro-vol4', col: 'servidor-4-0', vol: 'Livro Vol. 4', name: 'A cidade e a região', sort: 4, inc: [L, 'Kit com modelos, checklists e planilha'] },
  { slug: 'servidor40-bonus1-modelos', col: 'servidor-4-0', vol: 'Bônus 1', name: 'Pacote de modelos prontos', sort: 11, inc: ['Modelos em Word editável'] },
  { slug: 'servidor40-bonus2-mapa-ia', col: 'servidor-4-0', vol: 'Bônus 2', name: 'Mapa: Qual IA para qual tarefa', sort: 12, inc: ['Mapa em flipbook e PDF'] },
  { slug: 'servidor40-bonus3-minuta-decreto', col: 'servidor-4-0', vol: 'Bônus 3', name: 'Minuta de decreto de uso de IA na prefeitura', sort: 13, inc: ['Minuta em Word editável'] },
  { slug: 'servidor40-apostila-vol1', col: 'servidor-4-0', vol: 'Apostila Vol. 1', name: 'Comece com segurança', sort: 21, inc: ['Apostila ilustrada em flipbook'] },
  { slug: 'servidor40-apostila-vol2', col: 'servidor-4-0', vol: 'Apostila Vol. 2', name: 'A máquina administrativa', sort: 22, inc: ['Apostila ilustrada em flipbook'] },
  { slug: 'servidor40-apostila-vol3', col: 'servidor-4-0', vol: 'Apostila Vol. 3', name: 'Saúde, educação e assistência', sort: 23, inc: ['Apostila ilustrada em flipbook'] },
  { slug: 'servidor40-apostila-vol4', col: 'servidor-4-0', vol: 'Apostila Vol. 4', name: 'A cidade e a região', sort: 24, inc: ['Apostila ilustrada em flipbook'] },
  // Gestão Pública na Era da IA (produtos ainda não criados na Kiwify)
  { slug: 'gestao-ia-vol1-dp-publico', col: 'gestao-publica-era-ia', vol: 'Volume 1', name: 'DP Público: do Ingresso ao Desligamento', cover: '/capas/gestao-ia-vol1.webp', sort: 1 },
  { slug: 'gestao-ia-vol2-contabilidade', col: 'gestao-publica-era-ia', vol: 'Volume 2', name: 'Contabilidade e Patrimônio Público', cover: '/capas/gestao-ia-vol2.webp', sort: 2 },
  { slug: 'gestao-ia-vol3-controle-interno', col: 'gestao-publica-era-ia', vol: 'Volume 3', name: 'Controle Interno, Convênios e Emendas', cover: '/capas/gestao-ia-vol3.webp', sort: 3 },
];

const CART = ['contratacao-vol1-fase-preparatoria', 'contratacao-vol2-contratacao-direta', 'contratacao-vol3-adesao-ata', 'contratacao-vol4-pregao-ia'];
const LIVRO_CT = [
  ['contratacao-livro-vol1-fase-preparatoria', 0], ['contratacao-livro-vol2-contratacao-direta', 0],
  ['contratacao-livro-vol3-adesao-ata', 7], ['contratacao-livro-vol4-pregao-ia', 7],
  ['contratacao-bonus-100-prompts', 7], ['contratacao-bonus-50-modelos-tr', 7],
];
const LIVRO_S4 = [
  ['servidor40-livro-vol1', 0], ['servidor40-livro-vol2', 0], ['servidor40-livro-vol3', 8], ['servidor40-livro-vol4', 8],
  ['servidor40-bonus1-modelos', 8], ['servidor40-bonus2-mapa-ia', 8], ['servidor40-bonus3-minuta-decreto', 8],
];
const APOST_S4 = [['servidor40-apostila-vol1', 0], ['servidor40-apostila-vol2', 0], ['servidor40-apostila-vol3', 0], ['servidor40-apostila-vol4', 0]];
const now = (slugs) => slugs.map((s) => [s, 0]);

// produto (e oferta, quando ela entrega algo diferente) -> títulos [slug, dias após a compra]
const PRODUCTS = [
  { kid: 'a3b42eb0-cf1a-11f1-99bb-8d94649e99fb', name: 'Cartilha Vol. 1: Fase Preparatória na Lei 14.133', checkout: 'https://pay.kiwify.com.br/DEL1CYy', titles: now([CART[0]]) },
  { kid: '05621030-cf1d-11f1-8d7f-1b267b2cef8d', name: 'Cartilha Vol. 2: Contratação Direta na Lei 14.133', checkout: 'https://pay.kiwify.com.br/yo4gule', titles: now([CART[1]]) },
  { kid: '3583b020-cf1d-11f1-99bb-8d94649e99fb', name: 'Cartilha Vol. 3: Adesão a Ata de Registro de Preços na Lei 14.133', checkout: 'https://pay.kiwify.com.br/6qT8Y91', titles: now([CART[2]]) },
  { kid: '6a65be50-cf1d-11f1-8d7f-1b267b2cef8d', name: 'Cartilha Vol. 4: Pregão com Inteligência Artificial na Lei 14.133', checkout: 'https://pay.kiwify.com.br/H8YzYuE', titles: now([CART[3]]) },
  { kid: '5d647e90-cf26-11f1-99bb-8d94649e99fb', name: 'Combo Cartilhas Vol. 2, 3 e 4', checkout: 'https://pay.kiwify.com.br/KklV59t', titles: now(CART.slice(1)) },
  // checkout ativo usado no botão "Adquirir" das cartilhas (os avulsos estão desativados na Kiwify)
  { kid: '541c7d20-d2db-11f1-b738-7f08e3de31c4', name: 'Combo das 4 Cartilhas', checkout: 'https://pay.kiwify.com.br/NFUlsAy', titles: now(CART), buyFor: CART },
  { kid: '90c2e510-db7e-11f1-bce4-add2aefaed80', name: 'Combo das 4 Cartilhas - Entrada', checkout: 'https://pay.kiwify.com.br/N4G8Ugc', titles: now(CART) },
  // vale para as duas ofertas (padrão R$ 97 e order bump R$ 87)
  { kid: 'f119b9a0-d01d-11f1-aba0-ffc08ad334e7', name: 'Livro Digital Completo Biblioteca da Contratação Pública + Bônus', checkout: 'https://pay.kiwify.com.br/uSmfO5o', titles: LIVRO_CT, buyFor: LIVRO_CT.map((x) => x[0]) },
  { kid: 'ade05fe0-d7ed-11f1-94de-a55929c22af7', name: 'Servidor 4.0: Livro Digital Completo + Bônus', checkout: 'https://pay.kiwify.com.br/CUbSxgL', titles: LIVRO_S4, buyFor: LIVRO_S4.map((x) => x[0]) },
  { kid: 'ade05fe0-d7ed-11f1-94de-a55929c22af7', offer: 'c26eba88-8376-4199-8e43-2bf0d8bea393', price: 6700, name: 'Servidor 4.0: Upsell Coleção + 4 Apostilas', checkout: 'https://pay.kiwify.com.br/lgJhFhm', titles: [...LIVRO_S4, ...APOST_S4] },
  { kid: '060f1d20-d7f1-11f1-826a-61d1ef573c05', name: 'Servidor 4.0: Combo das 4 Apostilas', checkout: 'https://pay.kiwify.com.br/J2gxk8h', titles: APOST_S4, buyFor: APOST_S4.map((x) => x[0]) },
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
  // texto e capa só entram se ainda estiverem vazios (o painel manda)
  await db.execute(
    `INSERT INTO titles (slug, collection_id, vol_label, name, description, includes_json, cover_path, sort) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE collection_id=VALUES(collection_id), vol_label=VALUES(vol_label), name=VALUES(name), sort=VALUES(sort),
       description=COALESCE(description, VALUES(description)), includes_json=COALESCE(includes_json, VALUES(includes_json)), cover_path=COALESCE(cover_path, VALUES(cover_path))`,
    [t.slug, colId, t.vol, t.name, t.desc || null, t.inc ? JSON.stringify(t.inc) : null, t.cover || null, t.sort]
  );
  const dir = path.join(STORAGE, 'livros', t.slug);
  if (fs.existsSync(dir)) {
    const n = fs.readdirSync(dir).filter((f) => /^\d{3}\.webp$/.test(f)).length;
    await db.execute('UPDATE titles SET page_count = ? WHERE slug = ?', [n, t.slug]);
  }
}
await db.execute("DELETE FROM titles WHERE slug IN ('contratacao-livro-completo', 'servidor40-livro-completo', 'servidor40-apostilas')");

for (const p of PRODUCTS) {
  const offer = p.offer || '';
  await db.execute(
    `INSERT INTO products (kiwify_product_id, kiwify_offer_id, name, checkout_url, kiwify_price_cents) VALUES (?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE name=VALUES(name), checkout_url=COALESCE(checkout_url, VALUES(checkout_url)), kiwify_price_cents=COALESCE(kiwify_price_cents, VALUES(kiwify_price_cents))`,
    [p.kid, offer, p.name, p.checkout, p.price || null]
  );
  const pid = await id('SELECT id FROM products WHERE kiwify_product_id = ? AND kiwify_offer_id = ?', [p.kid, offer]);
  for (const [slug, days] of p.titles) {
    const tid = await id('SELECT id FROM titles WHERE slug = ?', [slug]);
    await db.execute(
      `INSERT INTO product_titles (product_id, title_id, release_days) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE release_days=VALUES(release_days)`,
      [pid, tid, days]
    );
  }
  for (const slug of p.buyFor || []) await db.execute('UPDATE titles SET buy_product_id = ? WHERE slug = ? AND buy_product_id IS NULL', [pid, slug]);
}
console.log(`Catálogo: ${COLLECTIONS.length} coleções, ${TITLES.length} títulos, ${PRODUCTS.length} regras de produto.`);
await db.end();
