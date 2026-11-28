import { q } from '@/lib/db';
import { ActionForm } from '@/components/admin/AdminClient';
import { createTitle } from '../actions';

export default async function Titulos() {
  const rows = await q(`SELECT t.*, c.name AS col, (SELECT COUNT(*) FROM attachments a WHERE a.title_id = t.id) AS n_anexos, (SELECT COUNT(*) FROM interests i WHERE i.title_id = t.id) AS n_int
                          FROM titles t JOIN collections c ON c.id = t.collection_id ORDER BY c.sort, t.sort, t.id`);
  const cols = await q('SELECT id, name FROM collections ORDER BY sort');
  return (
    <>
      <h1>Títulos</h1>
      <p className="adm-help">Cada título é um livro, cartilha ou apostila que aparece na biblioteca. Clique para editar textos, capa, PDF e anexos.</p>
      <div className="adm-table">
        <table>
          <thead><tr><th>Capa</th><th>Título</th><th>Coleção</th><th>Páginas</th><th>Anexos</th><th>Interessados</th><th>Situação</th></tr></thead>
          <tbody>
            {rows.map((t) => (
              <tr key={t.id}>
                <td><a href={`/admin/titulos/${t.id}`}>{t.cover_path ? <img className="adm-thumb" src={t.cover_path} alt="" /> : <span className="adm-thumb empty">sem capa</span>}</a></td>
                <td><a href={`/admin/titulos/${t.id}`}><b>{t.vol_label}</b><br />{t.name}</a></td>
                <td>{t.col}</td>
                <td>{t.page_count || <span className="adm-warn">sem PDF</span>}</td>
                <td>{t.n_anexos}</td>
                <td>{t.n_int || '—'}</td>
                <td>{!t.published ? <span className="adm-warn">Oculto</span> : t.coming_soon ? 'Em breve' : 'Publicado'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h2>Novo título</h2>
      <ActionForm action={createTitle} className="adm-box adm-grid3" submit="Criar título">
        <div className="fld"><label htmlFor="nt-vol">Rótulo</label><input id="nt-vol" name="vol_label" placeholder="Ex.: Volume 4" required /></div>
        <div className="fld"><label htmlFor="nt-name">Nome</label><input id="nt-name" name="name" required /></div>
        <div className="fld"><label htmlFor="nt-col">Coleção</label><select id="nt-col" name="collection_id">{cols.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
      </ActionForm>
    </>
  );
}
