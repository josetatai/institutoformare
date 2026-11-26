import { q } from '@/lib/db';
import { ActionForm } from '@/components/admin/AdminClient';
import { saveProduct, createProduct } from '../actions';

export default async function Produtos() {
  const prods = await q('SELECT * FROM products ORDER BY name');
  const titles = await q('SELECT t.id, t.vol_label, t.name, c.name AS col FROM titles t JOIN collections c ON c.id = t.collection_id ORDER BY c.sort, t.sort');
  const links = await q('SELECT * FROM product_titles');
  return (
    <>
      <h1>Produtos Kiwify</h1>
      <p className="adm-help">Cada produto vendido na Kiwify libera um ou mais títulos. Marque os títulos e, se quiser liberação programada, informe em quantos dias após a compra cada um libera (0 = na hora). Mudanças valem para as próximas compras.</p>
      {prods.map((p) => {
        const mine = links.filter((l) => l.product_id === p.id);
        return (
          <details key={p.id} className="adm-box adm-prod">
            <summary><b>{p.name}</b> <span className="adm-help">· libera {mine.length} título(s) · acesso de {p.access_days} dias{p.checkout_url ? '' : ' · sem link de checkout'}</span></summary>
            <ActionForm action={saveProduct}>
              <input type="hidden" name="id" value={p.id} />
              <div className="adm-grid3">
                <div className="fld"><label htmlFor={`n${p.id}`}>Nome</label><input id={`n${p.id}`} name="name" defaultValue={p.name} /></div>
                <div className="fld"><label htmlFor={`c${p.id}`}>Link do checkout (botão Adquirir)</label><input id={`c${p.id}`} name="checkout_url" defaultValue={p.checkout_url || ''} placeholder="https://pay.kiwify.com.br/..." /></div>
                <div className="fld"><label htmlFor={`a${p.id}`}>Dias de acesso</label><input id={`a${p.id}`} name="access_days" type="number" min="1" defaultValue={p.access_days} /></div>
              </div>
              <p className="adm-help">ID na Kiwify: {p.kiwify_product_id}{p.kiwify_offer_id ? ` · só a oferta ${p.kiwify_offer_id}` : ' · todas as ofertas'}</p>
              <div className="adm-table"><table>
                <thead><tr><th>Libera</th><th>Título</th><th>Libera em (dias após a compra)</th></tr></thead>
                <tbody>{titles.map((t) => {
                  const l = mine.find((x) => x.title_id === t.id);
                  return (
                    <tr key={t.id}>
                      <td><input type="checkbox" name="title" value={t.id} defaultChecked={!!l} aria-label={`Libera ${t.name}`} /></td>
                      <td>{t.vol_label}: {t.name} <small className="adm-help">({t.col})</small></td>
                      <td><input type="number" min="0" name={`days_${t.id}`} defaultValue={l?.release_days ?? 0} style={{ width: 90 }} aria-label="Dias" /></td>
                    </tr>
                  );
                })}</tbody>
              </table></div>
            </ActionForm>
          </details>
        );
      })}
      <h2>Cadastrar produto novo da Kiwify</h2>
      <ActionForm action={createProduct} className="adm-box adm-grid3" submit="Cadastrar">
        <div className="fld"><label htmlFor="np-id">ID do produto na Kiwify</label><input id="np-id" name="kiwify_product_id" required /></div>
        <div className="fld"><label htmlFor="np-offer">ID da oferta (só se ela entrega algo diferente)</label><input id="np-offer" name="kiwify_offer_id" /></div>
        <div className="fld"><label htmlFor="np-name">Nome</label><input id="np-name" name="name" required /></div>
      </ActionForm>
    </>
  );
}
