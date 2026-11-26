import { q, one } from '@/lib/db';
import { br } from '@/lib/dates';
import { titleStatus } from '@/lib/access';
import { ActionForm } from '@/components/admin/AdminClient';
import { grantManual, resendAccess, revokeGrant, extendGrant } from '../actions';

const ST = { ok: 'Liberado', wait: 'Programado', expired: 'Vencido', lock: '—' };

export default async function Clientes({ searchParams }) {
  const { email = '' } = await searchParams;
  const prods = await q('SELECT id, name FROM products ORDER BY name');
  const total = await one('SELECT COUNT(*) AS n FROM users WHERE is_admin = 0');
  const found = email ? await q('SELECT * FROM users WHERE email LIKE ? ORDER BY email LIMIT 20', [`%${String(email).trim().toLowerCase()}%`]) : [];
  const grants = found.length ? await q(`SELECT g.*, t.vol_label, t.name, p.name AS pname FROM grants g JOIN titles t ON t.id = g.title_id LEFT JOIN products p ON p.id = g.product_id WHERE g.user_id IN (${found.map(() => '?').join(',')}) ORDER BY g.starts_at DESC`, found.map((u) => u.id)) : [];
  return (
    <>
      <h1>Clientes</h1>
      <p className="adm-help">{total.n} cliente(s) cadastrados.</p>
      <form className="adm-box adm-inline" method="get">
        <input name="email" defaultValue={email} placeholder="Buscar por e-mail" aria-label="Buscar por e-mail" style={{ flex: 1 }} />
        <button className="btn sec" type="submit">Buscar</button>
      </form>
      {found.map((u) => (
        <section key={u.id} className="adm-box">
          <h2>{u.email}{u.name ? ` · ${u.name}` : ''}</h2>
          <p className="adm-help">Conta criada em {br(u.created_at)} · último acesso: {u.last_login_at ? br(u.last_login_at) : 'nunca'}{u.must_change_password ? ' · ainda com senha provisória' : ''}</p>
          <form action={resendAccess} style={{ marginBottom: 14 }}><input type="hidden" name="user_id" value={u.id} /><button className="btn sec" type="submit">Reenviar acesso (nova senha provisória por e-mail)</button></form>
          <div className="adm-table"><table>
            <thead><tr><th>Título</th><th>Produto / pedido</th><th>Compra</th><th>Libera</th><th>Vence</th><th>Situação</th><th></th></tr></thead>
            <tbody>{grants.filter((g) => g.user_id === u.id).map((g) => (
              <tr key={g.id}>
                <td>{g.vol_label}: {g.name}</td><td>{g.pname}<br /><small className="adm-help">{g.order_id}</small></td>
                <td>{br(g.starts_at)}</td><td>{br(g.release_at)}</td><td>{br(g.expires_at)}</td>
                <td>{g.revoked_at ? <span className="adm-warn">Bloqueado ({g.revoke_reason})</span> : ST[titleStatus([g]).status]}</td>
                <td><div className="adm-inline">
                  <form action={extendGrant}><input type="hidden" name="id" value={g.id} /><input type="hidden" name="days" value="30" /><button className="btn sec" type="submit">+30 dias</button></form>
                  {!g.revoked_at && <form action={revokeGrant}><input type="hidden" name="id" value={g.id} /><button className="btn sec adm-del" type="submit">Bloquear</button></form>}
                </div></td>
              </tr>
            ))}</tbody>
          </table></div>
        </section>
      ))}
      {email && !found.length && <p className="empty">Nenhum cliente com esse e-mail.</p>}
      <h2>Liberar produto manualmente</h2>
      <p className="adm-help">Para clientes antigos, cortesias ou correções. Usa as mesmas regras do produto (títulos, liberação programada e dias de acesso).</p>
      <ActionForm action={grantManual} className="adm-box" submit="Liberar">
        <div className="adm-grid3">
          <div className="fld"><label htmlFor="gm-email">E-mail</label><input id="gm-email" name="email" type="email" required /></div>
          <div className="fld"><label htmlFor="gm-name">Nome (se for cliente novo)</label><input id="gm-name" name="name" /></div>
          <div className="fld"><label htmlFor="gm-prod">Produto</label><select id="gm-prod" name="product_id">{prods.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
          <div className="fld"><label htmlFor="gm-start">Data da compra (vazio = hoje)</label><input id="gm-start" name="start" type="date" /></div>
          <div className="fld"><label className="adm-check"><input type="checkbox" name="send_email" defaultChecked /> Enviar e-mail de acesso se a conta for nova</label></div>
        </div>
      </ActionForm>
    </>
  );
}
