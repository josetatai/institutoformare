'use client';
import { useEffect, useRef, useState } from 'react';
import { I } from './icons';

/*
 * Leitor flipbook. Páginas são imagens servidas por /api/paginas/<slug>/<n>,
 * só para quem tem acesso. No computador mostra duas páginas; no celular, uma.
 */
export default function Reader({ slug, title, pageCount, startPage, email, code }) {
  const bookRef = useRef(null);
  const stageRef = useRef(null);
  const S = useRef({ i: Math.max(0, startPage - 1), busy: false, zoom: 1, pw: 0, ph: 0 });
  const [label, setLabel] = useState('');
  const [idx, setIdx] = useState(S.current.i);
  const [saved, setSaved] = useState(false);
  const saveTimer = useRef(null);

  useEffect(() => {
    if (!pageCount) return;
    const st = S.current;
    const n = pageCount;
    const spread = () => window.innerWidth >= 900;
    const src = (i) => `/api/paginas/${encodeURIComponent(slug)}/${i + 1}`;
    const wmText = `${email} · ${code}`;

    const pageEl = (i) => {
      const d = document.createElement('div');
      d.className = 'page img';
      if (i < 0 || i >= n) { d.style.background = '#e9e7e1'; return d; }
      const img = document.createElement('img');
      img.src = src(i); img.alt = `Página ${i + 1}`; img.draggable = false;
      d.appendChild(img);
      const wm = document.createElement('div');
      wm.className = 'wm'; wm.setAttribute('aria-hidden', 'true');
      for (let k = 0; k < 2; k++) { const s = document.createElement('span'); s.textContent = wmText; wm.appendChild(s); }
      d.appendChild(wm);
      return d;
    };
    const slotsFor = (i) => (!spread() ? { S: i } : i === 0 ? { L: -1, R: 0 } : { L: i, R: i + 1 });

    const preload = (i) => { for (const k of [i + 1, i + 2, i + 3]) if (k < n) new Image().src = src(k); };

    const updateLabel = () => {
      const s = slotsFor(st.i);
      const txt = spread()
        ? s.L < 0 ? 'Página 1' : s.R >= n ? `Página ${s.L + 1}` : `Páginas ${s.L + 1}–${s.R + 1}`
        : `Página ${st.i + 1}`;
      setLabel(`${txt} de ${n}`);
      setIdx(st.i);
    };

    const saveProgress = () => {
      clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        fetch('/api/progresso', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug, page: st.i + 1 }) })
          .then((r) => { if (r.ok) { setSaved(true); setTimeout(() => setSaved(false), 1500); } })
          .catch(() => {});
      }, 600);
    };

    const draw = () => {
      const b = bookRef.current; if (!b) return;
      const sp = spread();
      b.style.setProperty('--pw', st.pw + 'px');
      b.style.width = (sp ? st.pw * 2 : st.pw) + 'px';
      b.style.height = st.ph + 'px';
      b.style.transform = `scale(${st.zoom})`;
      b.innerHTML = '';
      const s = slotsFor(st.i);
      const mk = (i, left) => {
        const d = document.createElement('div');
        d.className = 'slot'; d.style.width = st.pw + 'px'; d.style.left = left + 'px';
        if (i >= 0 && i < n) { d.appendChild(pageEl(i)); d.style.boxShadow = '0 20px 50px rgba(0,0,0,.5)'; }
        return d;
      };
      if (sp) {
        b.appendChild(mk(s.L, 0)); b.appendChild(mk(s.R, st.pw));
        if (s.L >= 0 && s.R < n) { const sn = document.createElement('div'); sn.className = 'spine'; b.appendChild(sn); }
      } else b.appendChild(mk(s.S, 0));
      updateLabel(); preload(st.i);
    };

    const layout = () => {
      const stg = stageRef.current; if (!stg) return;
      const W = stg.clientWidth - 32, H = stg.clientHeight - 36, ratio = 1.414;
      st.pw = spread() ? Math.min(W / 2, H / ratio) : Math.min(W, H / ratio);
      st.ph = st.pw * ratio;
      if (spread() && st.i > 0 && st.i % 2 === 0) st.i--;
      draw();
    };

    const go = (dir) => {
      if (st.busy) return;
      const sp = spread();
      const ni = dir > 0 ? st.i + (sp ? (st.i === 0 ? 1 : 2) : 1) : st.i - (sp ? (st.i === 1 ? 1 : 2) : 1);
      if (ni < 0 || ni >= n) return;
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) { st.i = ni; draw(); saveProgress(); return; }
      st.busy = true;
      const b = bookRef.current, pw = st.pw;
      const leaf = document.createElement('div'); leaf.className = 'leaf'; leaf.style.width = pw + 'px';
      const face = (i, cls) => { const f = document.createElement('div'); f.className = 'face ' + cls; f.appendChild(pageEl(i)); const sh = document.createElement('div'); sh.className = 'shade'; f.appendChild(sh); return f; };
      const cur = slotsFor(st.i), nxt = slotsFor(ni);
      let target;
      if (sp) {
        const slots = b.querySelectorAll('.slot');
        if (dir > 0) {
          slots[1].innerHTML = ''; if (nxt.R < n) slots[1].appendChild(pageEl(nxt.R)); else slots[1].style.boxShadow = 'none';
          leaf.style.left = pw + 'px'; leaf.style.transformOrigin = 'left center';
          leaf.appendChild(face(cur.R, 'front')); leaf.appendChild(face(nxt.L, 'back')); target = 'rotateY(-180deg)';
        } else {
          slots[0].innerHTML = ''; if (nxt.L >= 0) slots[0].appendChild(pageEl(nxt.L)); else slots[0].style.boxShadow = 'none';
          leaf.style.left = '0px'; leaf.style.transformOrigin = 'right center';
          leaf.appendChild(face(cur.L, 'front')); leaf.appendChild(face(nxt.R, 'back')); target = 'rotateY(180deg)';
        }
      } else {
        const slot = b.querySelector('.slot');
        leaf.style.left = '0px'; leaf.style.transformOrigin = 'left center';
        if (dir > 0) { slot.innerHTML = ''; slot.appendChild(pageEl(ni)); leaf.appendChild(face(st.i, 'front')); leaf.appendChild(face(-1, 'back')); target = 'rotateY(-180deg)'; }
        else { leaf.appendChild(face(ni, 'front')); leaf.appendChild(face(-1, 'back')); leaf.style.transform = 'rotateY(-180deg)'; target = 'rotateY(0deg)'; }
      }
      b.appendChild(leaf);
      leaf.getBoundingClientRect();
      leaf.style.transition = 'transform .75s cubic-bezier(.33,.08,.2,1)';
      leaf.querySelectorAll('.shade').forEach((s) => (s.style.opacity = 1));
      requestAnimationFrame(() => (leaf.style.transform = target));
      let finished = false;
      const done = () => { if (finished) return; finished = true; st.i = ni; st.busy = false; draw(); saveProgress(); };
      leaf.addEventListener('transitionend', done, { once: true });
      setTimeout(done, 1100);
    };

    st.go = go;
    st.jump = (v) => { let x = v; if (spread() && x > 0 && x % 2 === 0) x--; st.i = x; draw(); saveProgress(); };
    st.zoomBy = (d) => { st.zoom = Math.min(1.8, Math.max(1, st.zoom + d)); draw(); };

    const key = (e) => { if (e.key === 'ArrowRight') go(1); else if (e.key === 'ArrowLeft') go(-1); else if (e.key === 'Escape') location.href = '/'; };
    let sx = null;
    const stg = stageRef.current;
    const down = (e) => { sx = e.clientX; };
    const up = (e) => { if (sx !== null && Math.abs(e.clientX - sx) > 40) go(e.clientX < sx ? 1 : -1); sx = null; };
    const noCtx = (e) => e.preventDefault();
    stg.addEventListener('pointerdown', down); stg.addEventListener('pointerup', up);
    document.addEventListener('contextmenu', noCtx);
    window.addEventListener('keydown', key); window.addEventListener('resize', layout);
    document.body.style.overflow = 'hidden';
    layout();
    return () => {
      stg.removeEventListener('pointerdown', down); stg.removeEventListener('pointerup', up);
      document.removeEventListener('contextmenu', noCtx);
      window.removeEventListener('keydown', key); window.removeEventListener('resize', layout);
      document.body.style.overflow = '';
      clearTimeout(saveTimer.current);
    };
  }, [slug, pageCount, email, code]);

  if (!pageCount) {
    return <div className="login wrap"><div className="lbox"><h2>Livro em preparação</h2><p>As páginas deste título ainda estão sendo carregadas. Volte em breve.</p><a className="btn sec" href="/">Voltar à biblioteca</a></div></div>;
  }

  return (
    <div className="reader">
      <div className="rbar wrap">
        <a className="ib" href="/" aria-label="Fechar leitor">{I.x}</a>
        <div className="ti">{title}</div>
        <span className="saved">{saved ? 'Página salva' : ''}</span>
        <button className="ib" aria-label="Diminuir zoom" onClick={() => S.current.zoomBy(-0.2)}>{I.zout}</button>
        <button className="ib" aria-label="Aumentar zoom" onClick={() => S.current.zoomBy(0.2)}>{I.zin}</button>
      </div>
      <div className="stage" ref={stageRef}>
        <div className="book" ref={bookRef} />
        <button className="navz l" aria-label="Página anterior" onClick={() => S.current.go(-1)} />
        <button className="navz r" aria-label="Próxima página" onClick={() => S.current.go(1)} />
      </div>
      <div className="rfoot wrap">
        <button className="ib" aria-label="Página anterior" onClick={() => S.current.go(-1)}>{I.left}</button>
        <input type="range" min={0} max={pageCount - 1} value={idx} aria-label="Ir para a página"
          onChange={(e) => S.current.jump(Number(e.target.value))} />
        <span className="pg">{label}</span>
        <button className="ib" aria-label="Próxima página" onClick={() => S.current.go(1)}>{I.right}</button>
      </div>
    </div>
  );
}
