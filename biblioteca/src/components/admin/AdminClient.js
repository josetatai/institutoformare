'use client';
import { useActionState, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

export function ActionForm({ action, children, className, submit = 'Salvar', confirmText }) {
  const [state, act, pending] = useActionState(action, null);
  return (
    <form action={act} className={className} onSubmit={(e) => { if (confirmText && !window.confirm(confirmText)) e.preventDefault(); }}>
      {state?.error && <div className="err" role="alert">{state.error}</div>}
      {state?.ok && <div className="okmsg" role="status" style={{ whiteSpace: 'pre-line' }}>{state.ok}</div>}
      {children}
      <button className="btn buy" type="submit" disabled={pending}>{pending ? 'Salvando…' : submit}</button>
    </form>
  );
}

async function postForm(url, data) {
  const fd = new FormData();
  Object.entries(data).forEach(([k, v]) => fd.append(k, v));
  const r = await fetch(url, { method: 'POST', body: fd });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || `erro ${r.status}`);
  return j;
}

export function CoverUpload({ titleId, cover }) {
  const [src, setSrc] = useState(cover);
  const [msg, setMsg] = useState('');
  const router = useRouter();
  const onChange = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    setMsg('Enviando…');
    try { const j = await postForm('/api/admin/capa', { titleId, file }); setSrc(j.cover); setMsg('Capa trocada.'); router.refresh(); }
    catch (err) { setMsg(err.message); }
    e.target.value = '';
  };
  return (
    <div className="adm-cover">
      <div className="adm-cover-img">{src ? <img src={src} alt="Capa atual" /> : <span>Sem capa</span>}</div>
      <label className="btn sec" style={{ cursor: 'pointer' }}>
        Trocar capa
        <input type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={onChange} />
      </label>
      <p className="adm-help">JPG, PNG ou WebP, até 5 MB. Proporção de livro em pé (ex.: 600 × 850).</p>
      {msg && <p className="adm-help" role="status">{msg}</p>}
    </div>
  );
}

/** Converte o PDF em páginas WebP no navegador e envia uma a uma. */
export function PdfUpload({ titleId, pageCount, hasCover }) {
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [pct, setPct] = useState(0);
  const router = useRouter();
  const onChange = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    if (pageCount && !window.confirm(`Este título já tem ${pageCount} páginas. Substituir pelo novo PDF?`)) { e.target.value = ''; return; }
    setBusy(true); setPct(0);
    try {
      setMsg('Lendo o PDF…');
      const pdfjs = await import('pdfjs-dist');
      pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
      const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
      const total = doc.numPages;
      for (let i = 1; i <= total; i++) {
        setMsg(`Convertendo e enviando página ${i} de ${total}…`);
        const page = await doc.getPage(i);
        const vp1 = page.getViewport({ scale: 1 });
        const vp = page.getViewport({ scale: 1240 / vp1.width });
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(vp.width); canvas.height = Math.round(vp.height);
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvasContext: ctx, viewport: vp, canvas }).promise;
        const blob = await new Promise((res) => canvas.toBlob(res, 'image/webp', 0.82));
        let tries = 0;
        for (;;) {
          try { await postForm('/api/admin/pagina', { titleId, n: i, file: new File([blob], `${i}.webp`, { type: 'image/webp' }) }); break; }
          catch (err) { if (++tries >= 3) throw err; await new Promise((r) => setTimeout(r, 1500)); }
        }
        page.cleanup();
        setPct(Math.round((i / total) * 100));
      }
      setMsg('Finalizando…');
      const r = await fetch('/api/admin/finalizar-pdf', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ titleId, pages: total, coverFromFirst: !hasCover }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      const CH = 3 * 1024 * 1024, parts = Math.ceil(file.size / CH);
      try {
        for (let k = 0; k < parts; k++) {
          setMsg(`Guardando o PDF original para download… ${k + 1} de ${parts}`);
          let tries = 0;
          for (;;) {
            try { await postForm('/api/admin/pdf-original', { titleId, i: k, n: parts, file: new File([file.slice(k * CH, (k + 1) * CH)], 'parte.bin') }); break; }
            catch (err) { if (++tries >= 3) throw err; await new Promise((r) => setTimeout(r, 1500)); }
          }
        }
        setMsg(`Pronto: ${j.pages} páginas no flipbook e PDF para download guardado.`);
      } catch (err) {
        setMsg(`Flipbook publicado (${j.pages} páginas), mas o PDF para download não foi guardado: ${err.message}. Envie o PDF de novo.`);
      }
      router.refresh();
    } catch (err) {
      setMsg(`Não foi possível concluir: ${err.message}`);
    } finally { setBusy(false); e.target.value = ''; }
  };
  return (
    <div>
      <label className={`btn sec ${busy ? 'disabled' : ''}`} style={{ cursor: busy ? 'default' : 'pointer' }}>
        {pageCount ? 'Substituir PDF do livro' : 'Enviar PDF do livro'}
        <input type="file" accept="application/pdf" hidden disabled={busy} onChange={onChange} />
      </label>
      <p className="adm-help">O PDF vira o flipbook aqui no seu navegador e o original fica guardado em pasta privada, para o leitor baixar com marca d'água. Mantenha a aba aberta até terminar.</p>
      {busy && <div className="prog" style={{ maxWidth: 360, marginTop: 8 }}><i style={{ width: pct + '%' }} /></div>}
      {msg && <p className="adm-help" role="status">{msg}</p>}
    </div>
  );
}

export function AttachmentUpload({ titleId }) {
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const formRef = useRef(null);
  const router = useRouter();
  const onSubmit = async (e) => {
    e.preventDefault();
    const f = new FormData(formRef.current);
    if (!f.get('file')?.size) { setMsg('Escolha um arquivo.'); return; }
    setBusy(true); setMsg('Enviando…');
    try {
      await postForm('/api/admin/anexo', { titleId, name: f.get('name'), releaseDays: f.get('releaseDays'), file: f.get('file') });
      setMsg('Anexo adicionado.'); formRef.current.reset(); router.refresh();
    } catch (err) { setMsg(err.message); } finally { setBusy(false); }
  };
  return (
    <form ref={formRef} onSubmit={onSubmit} className="adm-grid3">
      <div className="fld"><label htmlFor="an-name">Nome que o leitor vê</label><input id="an-name" name="name" placeholder="Ex.: Modelo de DFD editável" /></div>
      <div className="fld"><label htmlFor="an-days">Libera em (dias após a compra)</label><input id="an-days" name="releaseDays" type="number" min="0" defaultValue="0" /></div>
      <div className="fld"><label htmlFor="an-file">Arquivo (Word, Excel, PDF…)</label><input id="an-file" name="file" type="file" /></div>
      <div><button className="btn buy" type="submit" disabled={busy}>{busy ? 'Enviando…' : 'Adicionar anexo'}</button>{msg && <span className="adm-help" style={{ marginLeft: 12 }}>{msg}</span>}</div>
    </form>
  );
}

export function CopyButton({ text, label = 'Copiar dados' }) {
  const [done, setDone] = useState(false);
  const mark = () => { setDone(true); setTimeout(() => setDone(false), 2500); };
  const onClick = async () => {
    try { await navigator.clipboard.writeText(text); mark(); }
    catch {
      const t = document.createElement('textarea');
      t.value = text; document.body.appendChild(t); t.select();
      try { document.execCommand('copy'); mark(); } catch { /* sem permissão */ }
      t.remove();
    }
  };
  return <button type="button" className="btn sec" onClick={onClick} style={{ margin: '8px 0' }}>{done ? 'Copiado! Agora cole aqui no chat' : label}</button>;
}
