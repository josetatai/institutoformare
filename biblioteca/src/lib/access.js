import { q } from './db';
import { addDays } from './dates';

const parse = (v) => (v == null ? [] : typeof v === 'string' ? JSON.parse(v) : v);

/**
 * Situação de um título para o usuário, a partir das liberações (grants).
 * ok: pode ler · wait: liberação programada · expired: acesso venceu · lock: não comprou
 */
export function titleStatus(grants, now = new Date()) {
  const active = grants.filter((g) => !g.revoked_at && new Date(g.expires_at) > now);
  const released = active.filter((g) => new Date(g.release_at) <= now);
  if (released.length) {
    return { status: 'ok', expiresAt: max(active.map((g) => g.expires_at)), grants: released };
  }
  if (active.length) {
    return { status: 'wait', releaseAt: min(active.map((g) => g.release_at)), expiresAt: max(active.map((g) => g.expires_at)), grants: active };
  }
  if (grants.some((g) => !g.revoked_at)) return { status: 'expired', expiredAt: max(grants.filter((g) => !g.revoked_at).map((g) => g.expires_at)) };
  return { status: 'lock' };
}

const max = (a) => new Date(Math.max(...a.map((d) => +new Date(d))));
const min = (a) => new Date(Math.min(...a.map((d) => +new Date(d))));

/** Catálogo completo com a situação de cada título para o usuário. */
export async function catalogFor(userId) {
  const now = new Date();
  const titles = await q(
    `SELECT t.*, c.slug AS col_slug, c.name AS col_name, c.sort AS col_sort, c.is_new AS col_new,
            c.color1, c.color2, c.color3, p.checkout_url
       FROM titles t
       JOIN collections c ON c.id = t.collection_id
       LEFT JOIN products p ON p.id = t.buy_product_id
      WHERE t.published = 1
      ORDER BY c.sort, t.sort, t.id`
  );
  const grants = await q('SELECT * FROM grants WHERE user_id = ?', [userId]);
  const progress = await q('SELECT title_id, page, updated_at FROM reading_progress WHERE user_id = ?', [userId]);
  const atts = await q('SELECT * FROM attachments ORDER BY sort, id');

  return titles.map((t) => {
    const st = titleStatus(grants.filter((g) => g.title_id === t.id), now);
    const pr = progress.find((p) => p.title_id === t.id);
    const anexos = atts
      .filter((a) => a.title_id === t.id)
      .map((a) => {
        let availableAt = null;
        if (st.status === 'ok' || st.status === 'wait') {
          // libera quando o título libera e os dias do anexo passam, pela compra mais favorável
          availableAt = min(st.grants.map((g) => Math.max(+new Date(g.release_at), +addDays(g.starts_at, a.release_days))));
        }
        return {
          id: a.id, name: a.name, mime: a.mime, size: a.size_bytes,
          ext: (a.file_name.split('.').pop() || '').toLowerCase(),
          availableAt, available: !!availableAt && availableAt <= now && st.status === 'ok',
        };
      });
    return {
      id: t.id, slug: t.slug, vol: t.vol_label, name: t.name, description: t.description,
      includes: parse(t.includes_json), toc: parse(t.toc_json),
      cover: t.cover_path, pageCount: t.page_count,
      collection: { slug: t.col_slug, name: t.col_name, isNew: !!t.col_new, colors: [t.color1, t.color2, t.color3] },
      checkoutUrl: t.checkout_url,
      status: st.status, expiresAt: st.expiresAt || null, releaseAt: st.releaseAt || null, expiredAt: st.expiredAt || null,
      progressPage: pr?.page || 0, progressAt: pr?.updated_at || null,
      anexos,
    };
  });
}

/** Acesso de leitura a um título (para servir páginas e anexos). */
export async function canRead(userId, titleId) {
  const grants = await q('SELECT * FROM grants WHERE user_id = ? AND title_id = ?', [userId, titleId]);
  return titleStatus(grants).status === 'ok';
}

/** Serializa datas para passar a componentes de cliente. */
export const toClient = (items) => JSON.parse(JSON.stringify(items));
