import { q } from '@/lib/db';
import { br } from '@/lib/dates';
import { ActionForm } from '@/components/admin/AdminClient';
import { reprocessAction } from '../actions';
import { getSettings } from '@/lib/settings';
import { signatureReport } from '@/lib/kiwify';

const pretty = (raw) => { try { return JSON.stringify(JSON.parse(raw), null, 2).slice(0, 8000); } catch { return String(raw).slice(0, 8000); } };
const KIND = { approved: 'Compra aprovada', revoked: 'Reembolso / chargeback', ignored: 'Outro evento' };

export default async function Avisos() {
  let rows;
  try { rows = await q('SELECT id, received_at, event_kind, event_raw_type, order_id, signature_ok, processed_at, error, raw_body, sig_received, JSON_UNQUOTE(JSON_EXTRACT(payload, "$.Customer.email")) AS email FROM webhook_events ORDER BY id DESC LIMIT 200'); }
  catch { rows = await q('SELECT id, received_at, event_kind, event_raw_type, order_id, signature_ok, processed_at, error, JSON_UNQUOTE(JSON_EXTRACT(payload, "$.Customer.email")) AS email FROM webhook_events ORDER BY id DESC LIMIT 200'); }
  const token = (await getSettings()).kiwify_token;
  const pending = rows.filter((r) => !r.processed_at && r.signature_ok).length;
  return (
    <>
      <h1>Avisos da Kiwify</h1>
      <p className="adm-help">Toda venda, reembolso e chargeback que a Kiwify avisa fica registrado aqui. Avisos pendentes (por exemplo, de um produto que ainda não libera títulos) podem ser reprocessados depois de corrigir o cadastro.</p>
      <ActionForm action={reprocessAction} className="adm-box" submit={`Reprocessar pendentes (${pending})`}>
        <label className="adm-check"><input type="checkbox" name="sem_email" /> Não enviar e-mails nesta vez</label>
      </ActionForm>
      <div className="adm-table"><table>
        <thead><tr><th>#</th><th>Recebido</th><th>Evento</th><th>Pedido</th><th>Cliente</th><th>Situação</th></tr></thead>
        <tbody>{rows.map((r) => (
          <tr key={r.id}>
            <td>{r.id}</td><td>{br(r.received_at)}</td><td>{KIND[r.event_kind] || r.event_kind}<br /><small className="adm-help">{r.event_raw_type}</small></td>
            <td>{r.order_id}</td><td>{r.email}</td>
            <td>
              {r.raw_body && <details className="adm-help"><summary style={{ cursor: 'pointer' }}>ver dados</summary><pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', maxHeight: 360, overflow: 'auto', fontSize: 12 }}>{pretty(r.raw_body)}</pre></details>}
              {!r.signature_ok ? <><span className="adm-warn">Assinatura inválida</span>{r.raw_body && <><br /><small className="adm-help">{signatureReport(r.raw_body, r.sig_received, token)}</small></>}</> : r.processed_at ? 'Processado' : <span className="adm-warn">Pendente: {r.error}</span>}</td>
          </tr>
        ))}</tbody>
      </table></div>
      {!rows.length && <p className="empty">Nenhum aviso recebido ainda.</p>}
    </>
  );
}
