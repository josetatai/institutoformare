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

function Card({ t, onOpen, onBuy, onInterest }) {
  const cls = { lock: 'locked', wait: 'wait', expired: 'expired', soon: 'soon' }[t.status] || '';
  const pct = t.pageCount ? Math.round((t.progressPage / t.pageCount) * 100) : 0;
  return (
    <div className={`card ${cls}`}>
      <div className="thumb" role="button" tabIndex={0} aria-label={`${t.vol}: ${t.name}`}
        onClick={() => onOpen(t)} onKeyDown={(e) => e.key === 'Enter' && onOpen(t)}>
        <Cover t={t} />
        {t.status === 'lock' && <span className="badge lock" title="Não adquirido">{I.lock}</span>}
        {t.status === 'soon' && <span className="pill soonp">Em breve</span>}
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
      {t.status === 'soon' && (
        <div className="acts">
          <button className="info" onClick={() => onOpen(t)}>Ver detalhes</button>
          <button className={t.interested ? 'get on' : 'get'} onClick={() => onInterest(t)}>{t.interested ? 'Aviso ativado' : 'Avise-me'}</button>
        </div>
      )}
    </div>
  );
}

function Shelf({ title, extra, items, onOpen, onBuy, onInterest }) {
  if (!items.length) return null;
  return (
    <section className="shelf">
      <h2>{title}{extra}</h2>
      <div className="track">{items.map((t) => <Card key={t.id} t={t} onOpen={onOpen} onBuy={onBuy} onInterest={onInterest} />)}</div>
    </section>
  );
}

function Detail({ t, onClose, onBuy, onInterest }) {
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
    soon: [I.clock, 'Em breve', 'wait'],
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
            {t.status === 'soon' && <p className="adm-help" style={{ margin: '0 0 12px' }}>Ao clicar em "Avise-me", você autoriza o Instituto Formare a enviar um e-mail quando este título for lançado. Você pode cancelar aqui mesmo, quando quiser.</p>}
            {t.status === 'ok' && t.pdfAvailable && <p className="adm-help" style={{ margin: '0 0 12px' }}>O PDF sai marcado com o seu e-mail e um código de licença, para proteger o conteúdo.</p>}
            <div className="btns">
              {t.status === 'ok' && t.pageCount > 0 && <a className="btn pri" href={`/ler/${t.slug}`}>{I.play} {t.progressPage ? 'Continuar lendo' : 'Começar a ler'}</a>}
              {t.status === 'ok' && t.pdfAvailable && <a className="btn sec" href={`/api/pdf/${t.slug}`}>{I.dl} Baixar PDF</a>}
              {t.status === 'ok' && kitOnly && <button className="btn pri" onClick={() => setTab('anexos')}>{I.dl} Baixar arquivos</button>}
              {t.status === 'ok' && !t.pageCount && !kitOnly && <span className="btn sec" style={{ cursor: 'default' }}>Conteúdo em preparação</span>}
              {t.status === 'wait' && <span className="btn sec" style={{ cursor: 'default', opacity: 0.85 }}>{I.clock} Disponível em {br(t.releaseAt)}</span>}
              {(t.status === 'lock' || t.status === 'expired') && <button className="btn buy" onClick={() => onBuy(t)}>{I.cart} {t.status === 'expired' ? 'Renovar acesso' : 'Adquirir'}</button>}
              {(t.status === 'lock' || t.status === 'expired') && t.samplePages > 0 && <a className="btn sec" href={`/amostra/${t.slug}`}>{I.book} Folhear amostra</a>}
              {t.status === 'soon' && <button className={t.interested ? 'btn sec' : 'btn buy'} onClick={() => onInterest(t)}>{I.clock} {t.interested ? 'Cancelar aviso' : 'Avise-me no lançamento'}</button>}
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

const norm = (v) => String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export default function Library({ items, firstName, isAdmin, asCustomer }) {
  const [list, setList] = useState(items);
  const [openId, setOpenId] = useState(null);
  const [toast, setToast] = useState('');
  const [menu, setMenu] = useState(false);
  const [tab, setTab] = useState('todos');
  const [query, setQuery] = useState('');
  const timer = useRef(null);
  const open = list.find((t) => t.id === openId) || null;

  const say = (m) => { setToast(m); clearTimeout(timer.current); timer.current = setTimeout(() => setToast(''), 3200); };
  const buy = (t) => {
    if (t.checkoutUrl) window.open(t.checkoutUrl, '_blank', 'noopener');
    else say('O link de compra deste título ainda não foi configurado.');
  };
  const interest = async (t) => {
    const on = !t.interested;
    try {
      const r = await fetch('/api/interesse', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug: t.slug, on }) });
      if (!r.ok) throw new Error();
      setList((l) => l.map((x) => (x.id === t.id ? { ...x, interested: on } : x)));
      say(on ? 'Combinado! Vamos avisar você por e-mail quando for lançado.' : 'Aviso cancelado.');
    } catch { say('Não foi possível registrar agora. Tente de novo.'); }
  };

  const { hero, reading, mine, exploreGroups, soon } = useMemo(() => {
    const real = list.filter((t) => t.status !== 'soon');
    const reading = real.filter((t) => t.status === 'ok' && t.progressPage > 0).sort((a, b) => new Date(b.progressAt) - new Date(a.progressAt));
    const mine = real.filter((t) => t.status === 'ok' || t.status === 'wait');
    const groups = [];
    for (const t of real.filter((x) => x.status === 'lock' || x.status === 'expired')) {
      let c = groups.find((g) => g.slug === t.collection.slug);
      if (!c) groups.push((c = { ...t.collection, items: [] }));
      c.items.push(t);
    }
    const soon = list.filter((t) => t.status === 'soon');
    const hero = reading[0] || real.find((t) => t.status === 'ok' && t.pageCount > 0) || real.find((t) => t.collection.isNew) || real[0] || soon[0];
    return { hero, reading, mine, exploreGroups: groups, soon };
  }, [list]);

  const q = norm(query.trim());
  const results = q ? list.filter((t) => norm(`${t.vol} ${t.name} ${t.collection.name} ${t.description}`).includes(q)) : [];
  const heroPct = hero && hero.pageCount ? Math.round((hero.progressPage / hero.pageCount) * 100) : 0;
  const shelfProps = { onOpen: (t) => setOpenId(t.id), onBuy: buy, onInterest: interest };
  const emptyMine = isAdmin && !asCustomer
    ? 'Nenhum título publicado. Abra o Painel administrativo, entre em Títulos e marque "Publicado" no que quiser mostrar.'
    : 'Você ainda não tem títulos liberados. Quando uma compra for aprovada, ela aparece aqui.';

  return (
    <>
      {asCustomer && <div className="cview">Visão de cliente: é assim que o leitor vê a biblioteca.<a href="/">Voltar à visão de administrador</a></div>}
      <header className="top">
        <div className="wrap bar">
          <img className="logo" src="/logo-formare-branco.webp" alt="Instituto Formare" />
          <nav><b>Início</b></nav>
          <div className="sp" />
          <div className="menu">
            <button className="avatar" aria-label="Minha conta" aria-expanded={menu} onClick={() => setMenu(!menu)}>
              <span className="nm">Olá, {firstName}</span><span className="ini">{firstName[0]?.toUpperCase()}</span>
            </button>
            {menu && <div className="dd">{isAdmin && <a href="/admin">Painel administrativo</a>}{isAdmin && <a href={asCustomer ? '/' : '/?cliente=1'}>{asCustomer ? 'Voltar à visão de administrador' : 'Ver como cliente'}</a>}<a href="/conta">Minha conta</a><a href="/sair">Sair</a></div>}
          </div>
        </div>
      </header>

      {hero && (
        <section className="hero">
          <div className="glow" />
          <div className="wrap in">
            <div>
              <div className="eyebrow">{hero.status === 'ok' ? (hero.progressPage ? 'Continue de onde parou' : 'Na sua biblioteca') : hero.status === 'soon' ? 'Em breve' : hero.collection.isNew ? 'Nova coleção' : 'Destaque'}</div>
              <h1>{hero.vol}: {hero.name}</h1>
              {hero.description && <p>{hero.description}</p>}
              {hero.status === 'ok' && <>
                {heroPct > 0 && <div className="prog"><i style={{ width: heroPct + '%' }} /></div>}
                <div className="meta">{hero.progressPage ? `Página ${hero.progressPage} de ${hero.pageCount} · ${heroPct}% lido · ` : ''}{until(hero).toLowerCase()}</div>
              </>}
              <div className="btns">
                {hero.status === 'ok'
                  ? <a className="btn pri" href={`/ler/${hero.slug}`}>{I.play} {hero.progressPage ? 'Continuar lendo' : 'Começar a ler'}</a>
                  : hero.status === 'soon'
                    ? <button className={hero.interested ? 'btn sec' : 'btn buy'} onClick={() => interest(hero)}>{I.clock} {hero.interested ? 'Aviso ativado' : 'Avise-me no lançamento'}</button>
                    : <button className="btn buy" onClick={() => buy(hero)}>{I.cart} Adquirir</button>}
                <button className="btn sec" onClick={() => setOpenId(hero.id)}>{I.info} {hero.status === 'ok' ? 'Detalhes e anexos' : 'Ver o que contém'}</button>
              </div>
            </div>
            <div className="art"><Cover t={hero} /></div>
          </div>
        </section>
      )}

      <main className="wrap">
        <div className="filters" role="tablist" aria-label="Filtrar a biblioteca">
          {[['todos', 'Todos'], ['meus', 'Meus livros'], ['explorar', 'Explorar']].map(([k, l]) => (
            <button key={k} role="tab" aria-selected={tab === k && !q} onClick={() => { setTab(k); setQuery(''); }}>{l}{k === 'meus' && <small>{mine.length}</small>}</button>
          ))}
          <div className="srch"><input id="busca" type="search" aria-label="Buscar na biblioteca" placeholder="Buscar por título ou assunto" value={query} onChange={(e) => setQuery(e.target.value)} /></div>
        </div>

        {q ? (
          results.length
            ? <Shelf title={`Resultados para "${query.trim()}"`} extra={<small>{results.length}</small>} items={results} {...shelfProps} />
            : <p className="empty">Nada encontrado para "{query.trim()}". Tente outra palavra.</p>
        ) : <>
          {tab !== 'explorar' && <Shelf title="Continue lendo" items={reading} {...shelfProps} />}
          {tab !== 'explorar' && <>
            <div id="minha" />
            <Shelf title="Minha biblioteca" items={mine} {...shelfProps} extra={<small>{mine.length} {mine.length === 1 ? 'título' : 'títulos'}</small>} />
            {!mine.length && <p className="empty">{emptyMine}</p>}
          </>}
          {tab !== 'meus' && <>
            {exploreGroups.length > 0 && <h2 className="sect">Explore a biblioteca<small>acesso liberado depois da compra</small></h2>}
            {exploreGroups.map((c) => (
              <Shelf key={c.slug} title={c.name} items={c.items} {...shelfProps} extra={c.isNew ? <> <span className="tag">Nova coleção</span></> : null} />
            ))}
            <Shelf title="Próximos lançamentos" items={soon} {...shelfProps} />
            {tab === 'explorar' && !exploreGroups.length && !soon.length && <p className="empty">Você já tem todos os títulos disponíveis. As novidades aparecem aqui.</p>}
          </>}
        </>}
        <p className="adm-help" style={{ marginTop: 48, textAlign: 'center' }}>Precisa de ajuda? Escreva para suporte@institutoformare.com.br</p>
      </main>

      {open && <Detail t={open} onClose={() => setOpenId(null)} onBuy={buy} onInterest={interest} />}
      <div className={`toast ${toast ? 'on' : ''}`} role="status" aria-live="polite">{toast}</div>
    </>
  );
}
