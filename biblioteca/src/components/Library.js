'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { br, brShort } from '@/lib/dates';
import { I } from './icons';

const until = (t) => (t.expiresAt ? `Acesso até ${br(t.expiresAt)}` : 'Acesso de administrador');

export function Cover({ t }) {
  if (t.cover) return <img src={t.cover} alt={`Capa: ${t.name}`} loading="lazy" />;
  const [c1, c2, c3] = t.collection.colors;
  return (
    <div className="cv" style={{ '--c1': c1 || '#1f5fd6', '--c2': c2 || '#0a1c45', '--c3': c3 || '#4fd1e8' }}>
      <div className="k">{t.collection.name}</div>
      <div className="v">{t.vol}</div>
      <div className="ti">{t.name}</div>
      <div className="sp" />
      <div className="ed">Edição <b>INSTITUTO FORMARE</b></div>
    </div>
  );
}

function Card({ t, onOpen, onBuy }) {
  const cls = { lock: 'locked', wait: 'wait', expired: 'expired' }[t.status] || '';
  const pct = t.pageCount ? Math.round((t.progressPage / t.pageCount) * 100) : 0;
  return (
    <div className={`card ${cls}`}>
      <div className="thumb" role="button" tabIndex={0} aria-label={`${t.vol}: ${t.name}`}
        onClick={() => onOpen(t)} onKeyDown={(e) => e.key === 'Enter' && onOpen(t)}>
        <Cover t={t} />
        {t.status === 'lock' && <span className="badge lock" title="Não adquirido">{I.lock}</span>}
        {t.status === 'wait' && <><span className="pill wait">Libera em {brShort(t.releaseAt)}</span><span className="badge wait" title="Liberação programada">{I.clock}</span></>}
        {t.status === 'expired' && <><span className="pill exp">Acesso vencido</span><span className="badge lock">{I.lock}</span></>}
      </div>
      <div className="t">{t.vol}: {t.name}</div>
      {t.status === 'ok' && <>{pct > 0 && <div className="prog"><i style={{ width: pct + '%' }} /></div>}<div className="s">{pct > 0 ? `${pct}% lido · ` : ''}{until(t)}</div></>}
      {t.status === 'wait' && <div className="s wait">Liberação programada: {br(t.releaseAt)}</div>}
      {(t.status === 'lock' || t.status === 'expired') && (
        <div className="acts">
          <button className="info" onClick={() => onOpen(t)}>Ver o que contém</button>
          <button className="get" onClick={() => onBuy(t)}>{t.status === 'expired' ? 'Renovar' : 'Adquirir'}</button>
        </div>
      )}
    </div>
  );
}

function Shelf({ title, extra, items, onOpen, onBuy }) {
  if (!items.length) return null;
  return (
    <section className="shelf">
      <h2>{title}{extra}</h2>
      <div className="track">{items.map((t) => <Card key={t.id} t={t} onOpen={onOpen} onBuy={onBuy} />)}</div>
    </section>
  );
}

function Detail({ t, onClose, onBuy }) {
  const owned = t.status === 'ok' || t.status === 'wait';
  const kitOnly = !t.pageCount && t.anexos.length > 0;
  const [tab, setTab] = useState(owned && kitOnly ? 'anexos' : 'sobre');
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const k = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', k); };
  }, [onClose]);
  const st = {
    ok: [I.check, `Liberado · ${until(t).toLowerCase()}`, 'ok'],
    wait: [I.clock, `Liberação programada para ${br(t.releaseAt)}`, 'wait'],
    expired: [I.lock, `Seu acesso venceu em ${br(t.expiredAt)}`, 'exp'],
    lock: [I.lock, 'Você ainda não tem este título', 'lock'],
  }[t.status];
  const fmtName = { docx: 'Word editável', doc: 'Word editável', xlsx: 'Excel editável', xls: 'Excel editável', pptx: 'PowerPoint editável', pdf: 'PDF' };
  const size = (b) => (b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB');
  return (
    <div className="scrim" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={t.name}>
        <button className="x" aria-label="Fechar" onClick={onClose}>{I.x}</button>
        <div className="head">
          <div className="thumb"><Cover t={t} /></div>
          <div>
            <div className="eyebrow">{t.collection.name} · {t.vol}</div>
            <h3>{t.name}</h3>
            <div className={`status ${st[2]}`}>{st[0]} {st[1]}</div>
            {t.description && <p className="desc">{t.description}</p>}
            <div className="btns">
              {t.status === 'ok' && t.pageCount > 0 && <a className="btn pri" href={`/ler/${t.slug}`}>{I.play} {t.progressPage ? 'Continuar lendo' : 'Começar a ler'}</a>}
              {t.status === 'ok' && kitOnly && <button className="btn pri" onClick={() => setTab('anexos')}>{I.dl} Baixar arquivos</button>}
              {t.status === 'ok' && !t.pageCount && !kitOnly && <span className="btn sec" style={{ cursor: 'default' }}>Conteúdo em preparação</span>}
              {t.status === 'wait' && <span className="btn sec" style={{ cursor: 'default', opacity: 0.85 }}>{I.clock} Disponível em {br(t.releaseAt)}</span>}
              {(t.status === 'lock' || t.status === 'expired') && <button className="btn buy" onClick={() => onBuy(t)}>{I.cart} {t.status === 'expired' ? 'Renovar acesso' : 'Adquirir'}</button>}
            </div>
          </div>
        </div>
        <div className="tabs" role="tablist">
          <button role="tab" aria-selected={tab === 'sobre'} onClick={() => setTab('sobre')}>O que contém</button>
          {owned && t.anexos.length > 0 && <button role="tab" aria-selected={tab === 'anexos'} onClick={() => setTab('anexos')}>Anexos</button>}
        </div>
        <div className="panel">
          {tab === 'sobre' && <>
            {t.includes.length > 0 && <><h4>O que vem no produto</h4><ul className="inc">{t.includes.map((x, i) => <li key={i}>{/livro|flipbook|apostila|cartilha/i.test(x) ? I.book : /bônus/i.test(x) ? I.gift : I.file}<span>{x}</span></li>)}</ul></>}
            {t.toc.length > 0 && <><h4>Sumário</h4><ol className="toc">{t.toc.map((x, i) => <li key={i}>{x}</li>)}</ol></>}
            {!t.includes.length && !t.toc.length && <p className="note">Descrição completa em breve.</p>}
          </>}
          {tab === 'anexos' && <>
            <h4>Arquivos para baixar e editar</h4>
            <div className="files">
              {t.anexos.map((a) => (
                <div key={a.id} className={`file ${a.available ? '' : 'wait'}`}>
                  <div className={`fmt ${a.ext}`}>{a.ext.toUpperCase()}</div>
                  <div style={{ minWidth: 0 }}><div className="n">{a.name}</div><div className="d">{fmtName[a.ext] || a.ext.toUpperCase()} · {size(a.size)}</div></div>
                  {a.available
                    ? <a className="dl" href={`/api/anexos/${a.id}`}>{I.dl} Baixar</a>
                    : <span className="dl">{I.clock} Libera em {brShort(a.availableAt)}</span>}
                </div>
              ))}
            </div>
            <p className="note">Os anexos podem ser baixados durante o período de acesso. Cada download fica registrado na sua conta.</p>
          </>}
        </div>
      </div>
    </div>
  );
}

export default function Library({ items, firstName, isAdmin }) {
  const [open, setOpen] = useState(null);
  const [toast, setToast] = useState('');
  const [menu, setMenu] = useState(false);

  const buy = (t) => {
    if (t.checkoutUrl) window.open(t.checkoutUrl, '_blank', 'noopener');
    else { setToast('O link de compra deste título ainda não foi configurado.'); setTimeout(() => setToast(''), 2800); }
  };

  const { hero, reading, mine, collections } = useMemo(() => {
    const reading = items.filter((t) => t.status === 'ok' && t.progressPage > 0)
      .sort((a, b) => new Date(b.progressAt) - new Date(a.progressAt));
    const mine = items.filter((t) => t.status === 'ok' || t.status === 'wait');
    const cols = [];
    for (const t of items) {
      let c = cols.find((x) => x.slug === t.collection.slug);
      if (!c) cols.push((c = { ...t.collection, items: [] }));
      c.items.push(t);
    }
    const hero = reading[0] || items.find((t) => t.status === 'ok' && t.pageCount > 0) || items.find((t) => t.collection.isNew) || items[0];
    return { hero, reading, mine, collections: cols };
  }, [items]);

  const heroPct = hero && hero.pageCount ? Math.round((hero.progressPage / hero.pageCount) * 100) : 0;

  return (
    <>
      <header className="top">
        <div className="wrap bar">
          <img className="logo" src="/logo-formare-branco.webp" alt="Instituto Formare" />
          <nav><b>Início</b><a href="#minha" style={{ color: 'inherit', textDecoration: 'none' }}>Minha biblioteca</a></nav>
          <div className="sp" />
          <div className="menu">
            <button className="avatar" aria-label="Minha conta" aria-expanded={menu} onClick={() => setMenu(!menu)}>
              <span className="nm">Olá, {firstName}</span><span className="ini">{firstName[0]?.toUpperCase()}</span>
            </button>
            {menu && <div className="dd">{isAdmin && <a href="/admin">Painel administrativo</a>}<a href="/conta">Minha conta</a><a href="/sair">Sair</a></div>}
          </div>
        </div>
      </header>

      {hero && (
        <section className="hero">
          <div className="glow" />
          <div className="wrap in">
            <div>
              <div className="eyebrow">{hero.status === 'ok' ? (hero.progressPage ? 'Continue de onde parou' : 'Na sua biblioteca') : hero.collection.isNew ? 'Nova coleção' : 'Destaque'}</div>
              <h1>{hero.vol}: {hero.name}</h1>
              {hero.description && <p>{hero.description}</p>}
              {hero.status === 'ok' && <>
                {heroPct > 0 && <div className="prog"><i style={{ width: heroPct + '%' }} /></div>}
                <div className="meta">{hero.progressPage ? `Página ${hero.progressPage} de ${hero.pageCount} · ${heroPct}% lido · ` : ''}{until(hero).toLowerCase()}</div>
              </>}
              <div className="btns">
                {hero.status === 'ok'
                  ? <a className="btn pri" href={`/ler/${hero.slug}`}>{I.play} {hero.progressPage ? 'Continuar lendo' : 'Começar a ler'}</a>
                  : <button className="btn buy" onClick={() => buy(hero)}>{I.cart} Adquirir</button>}
                <button className="btn sec" onClick={() => setOpen(hero)}>{I.info} {hero.status === 'ok' ? 'Detalhes e anexos' : 'Ver o que contém'}</button>
              </div>
            </div>
            <div className="art"><Cover t={hero} /></div>
          </div>
        </section>
      )}

      <main className="wrap">
        <Shelf title="Continue lendo" items={reading} onOpen={setOpen} onBuy={buy} />
        <div id="minha" />
        <Shelf title="Minha biblioteca" items={mine} onOpen={setOpen} onBuy={buy} extra={<small>{mine.length} {mine.length === 1 ? 'título' : 'títulos'}</small>} />
        {!mine.length && <p className="empty">Você ainda não tem títulos liberados. Quando uma compra for aprovada, ela aparece aqui.</p>}
        {collections.map((c) => (
          <Shelf key={c.slug} title={c.name} items={c.items} onOpen={setOpen} onBuy={buy} extra={c.isNew ? <> <span className="tag">Nova coleção</span></> : null} />
        ))}
        <p className="adm-help" style={{ marginTop: 48, textAlign: 'center' }}>Precisa de ajuda? Escreva para suporte@institutoformare.com.br</p>
      </main>

      {open && <Detail t={open} onClose={() => setOpen(null)} onBuy={buy} />}
      <div className={`toast ${toast ? 'on' : ''}`} role="status" aria-live="polite">{toast}</div>
    </>
  );
}
