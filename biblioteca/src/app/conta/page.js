import { requireUser } from '@/lib/auth';
import { catalogFor } from '@/lib/access';
import { br } from '@/lib/dates';
import { ChangePasswordForm } from '@/components/Forms';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Minha conta · Biblioteca Formare' };

const LABEL = { ok: 'Liberado', wait: 'Liberação programada', expired: 'Vencido' };

export default async function Conta() {
  const user = await requireUser();
  const mine = (await catalogFor(user.id)).filter((t) => t.status !== 'lock');
  return (
    <>
      <header className="top"><div className="wrap bar"><a href="/"><img className="logo" src="/logo-formare-branco.webp" alt="Instituto Formare" /></a><div className="sp" /><a className="btn sec" href="/">Voltar à biblioteca</a></div></header>
      <main className="wrap acct">
        <h1>Minha conta</h1>
        <p style={{ color: 'var(--muted)', marginTop: -10 }}>{user.email}</p>
        <h2 style={{ fontFamily: 'var(--display)', fontSize: 19 }}>Meus títulos</h2>
        {mine.length ? (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead><tr><th>Título</th><th>Situação</th><th>Acesso até</th></tr></thead>
              <tbody>{mine.map((t) => (
                <tr key={t.id}><td>{t.vol}: {t.name}</td><td>{LABEL[t.status]}{t.status === 'wait' ? ` (${br(t.releaseAt)})` : ''}</td><td>{br(t.expiresAt || t.expiredAt)}</td></tr>
              ))}</tbody>
            </table>
          </div>
        ) : <p className="empty">Nenhum título na sua conta ainda.</p>}
        <p className="adm-help">Os livros e os PDFs desta biblioteca são marcados com o seu e-mail e um código de licença, para proteger o conteúdo contra cópia e compartilhamento.</p>
        <h2 style={{ fontFamily: 'var(--display)', fontSize: 19 }}>Trocar senha</h2>
        <div className="box"><ChangePasswordForm /></div>
      </main>
    </>
  );
}
