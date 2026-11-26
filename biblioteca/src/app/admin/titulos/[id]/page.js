import { notFound } from 'next/navigation';
import { q, one } from '@/lib/db';
import { ActionForm, CoverUpload, PdfUpload, AttachmentUpload } from '@/components/admin/AdminClient';
import { saveTitle, updateAttachment, deleteAttachment } from '../../actions';

const arr = (v) => (v == null ? [] : typeof v === 'string' ? JSON.parse(v) : v);
const size = (b) => (b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB');

export default async function EditTitle({ params }) {
  const { id } = await params;
  const t = await one('SELECT * FROM titles WHERE id = ?', [Number(id)]);
  if (!t) notFound();
  const cols = await q('SELECT id, name FROM collections ORDER BY sort');
  const prods = await q('SELECT id, name FROM products ORDER BY name');
  const atts = await q('SELECT * FROM attachments WHERE title_id = ? ORDER BY sort, id', [t.id]);
  const sold = await q('SELECT p.name, pt.release_days FROM product_titles pt JOIN products p ON p.id = pt.product_id WHERE pt.title_id = ?', [t.id]);
  return (
    <>
      <p><a href="/admin/titulos" className="adm-back">← Todos os títulos</a></p>
      <h1>{t.vol_label}: {t.name}</h1>

      <div className="adm-two">
        <section className="adm-box">
          <h2>Capa</h2>
          <CoverUpload titleId={t.id} cover={t.cover_path} />
        </section>
        <section className="adm-box">
          <h2>Livro (flipbook)</h2>
          <p>{t.page_count ? <>{t.page_count} páginas publicadas. <a href={`/ler/${t.slug}`} target="_blank">Abrir no leitor</a></> : 'Nenhum PDF enviado ainda.'}</p>
          <PdfUpload titleId={t.id} pageCount={t.page_count} hasCover={!!t.cover_path} />
          <h2 style={{ marginTop: 24 }}>Vendido em</h2>
          {sold.length ? <ul className="adm-list">{sold.map((s, i) => <li key={i}>{s.name}{s.release_days ? ` · libera ${s.release_days} dia(s) após a compra` : ''}</li>)}</ul>
            : <p className="adm-warn">Nenhum produto da Kiwify libera este título. Ligue em “Produtos Kiwify”.</p>}
        </section>
      </div>

      <section className="adm-box">
        <h2>Textos e configuração</h2>
        <ActionForm action={saveTitle}>
          <input type="hidden" name="id" value={t.id} />
          <div className="adm-grid3">
            <div className="fld"><label htmlFor="vol">Rótulo</label><input id="vol" name="vol_label" defaultValue={t.vol_label} /></div>
            <div className="fld"><label htmlFor="name">Nome</label><input id="name" name="name" defaultValue={t.name} /></div>
            <div className="fld"><label htmlFor="col">Coleção</label><select id="col" name="collection_id" defaultValue={t.collection_id}>{cols.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          </div>
          <div className="fld"><label htmlFor="desc">Descrição (aparece no destaque e na página do título)</label><textarea id="desc" name="description" rows={3} defaultValue={t.description || ''} /></div>
          <div className="adm-grid2">
            <div className="fld"><label htmlFor="inc">O que vem no produto (um item por linha)</label><textarea id="inc" name="includes" rows={6} defaultValue={arr(t.includes_json).join('\n')} /></div>
            <div className="fld"><label htmlFor="toc">Sumário (um capítulo por linha)</label><textarea id="toc" name="toc" rows={6} defaultValue={arr(t.toc_json).join('\n')} /></div>
          </div>
          <div className="adm-grid3">
            <div className="fld"><label htmlFor="buy">Botão “Adquirir” abre o checkout de</label><select id="buy" name="buy_product_id" defaultValue={t.buy_product_id || ''}><option value="">— nenhum —</option>{prods.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
            <div className="fld"><label htmlFor="sort">Ordem na fileira</label><input id="sort" name="sort" type="number" defaultValue={t.sort} /></div>
            <div className="fld"><label className="adm-check"><input type="checkbox" name="published" defaultChecked={!!t.published} /> Publicado (aparece na biblioteca)</label></div>
          </div>
        </ActionForm>
      </section>

      <section className="adm-box">
        <h2>Anexos para download</h2>
        {atts.length > 0 && (
          <div className="adm-table"><table>
            <thead><tr><th>Arquivo</th><th>Nome que o leitor vê</th><th>Libera em (dias)</th><th>Ordem</th><th></th></tr></thead>
            <tbody>{atts.map((a) => (
              <tr key={a.id}>
                <td>{a.file_name}<br /><small>{size(a.size_bytes)}</small></td>
                <td colSpan={3}>
                  <form action={updateAttachment} className="adm-inline">
                    <input type="hidden" name="id" value={a.id} /><input type="hidden" name="title_id" value={t.id} />
                    <input name="name" defaultValue={a.name} aria-label="Nome" style={{ flex: 3 }} />
                    <input name="release_days" type="number" min="0" defaultValue={a.release_days} aria-label="Dias" style={{ width: 80 }} />
                    <input name="sort" type="number" defaultValue={a.sort} aria-label="Ordem" style={{ width: 70 }} />
                    <button className="btn sec" type="submit">Salvar</button>
                  </form>
                </td>
                <td><form action={deleteAttachment}><input type="hidden" name="id" value={a.id} /><button className="btn sec adm-del" type="submit">Excluir</button></form></td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
        <AttachmentUpload titleId={t.id} />
      </section>
    </>
  );
}
