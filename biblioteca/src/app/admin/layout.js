import { requireAdmin } from '@/lib/admin';

export const metadata = { title: 'Painel · Biblioteca Formare' };
export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }) {
  await requireAdmin();
  return (
    <>
      <header className="top">
        <div className="wrap bar">
          <a href="/admin/titulos"><img className="logo" src="/logo-formare-branco.webp" alt="Instituto Formare" /></a>
          <nav className="adm-nav" style={{ display: 'flex' }}>
            <a href="/admin/titulos">Títulos</a>
            <a href="/admin/produtos">Produtos Kiwify</a>
            <a href="/admin/clientes">Clientes</a>
            <a href="/admin/avisos">Avisos da Kiwify</a>
          </nav>
          <div className="sp" />
          <a className="btn sec" href="/">Ver biblioteca</a>
        </div>
      </header>
      <main className="wrap adm">{children}</main>
    </>
  );
}
