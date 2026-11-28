import nodemailer from 'nodemailer';

import { getSettings } from './settings';

async function getTransport(cfg) {
  if (!cfg.smtp_password) throw new Error('senha do e-mail não configurada (Painel → Configurações)');
  return nodemailer.createTransport({
    host: cfg.smtp_host,
    port: Number(cfg.smtp_port || 465),
    secure: Number(cfg.smtp_port || 465) === 465,
    auth: { user: cfg.smtp_user, pass: cfg.smtp_password },
  });
}

const APP = () => process.env.APP_URL || 'https://biblioteca.institutoformare.com.br';
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

let SUPPORT = 'suporte@institutoformare.com.br';
function layout(title, bodyHtml) {
  return `<!doctype html><html><body style="margin:0;background:#f1f3f7;font-family:Arial,Helvetica,sans-serif;color:#1d2330">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden">
<tr><td style="background:#0a0d13;padding:20px 28px"><img src="${APP()}/logo-email.png" alt="Instituto Formare" width="154" height="36" style="display:block;border:0;outline:none;width:154px;height:36px"></td></tr>
<tr><td style="padding:28px">
<h1 style="font-size:22px;margin:0 0 14px;color:#0f3f86">${esc(title)}</h1>
${bodyHtml}
<p style="font-size:13px;color:#566074;margin-top:28px">Instituto Formare · Biblioteca<br>Dúvidas: ${esc(SUPPORT)}</p>
</td></tr></table></td></tr></table></body></html>`;
}

const button = (href, label) =>
  `<p style="margin:22px 0"><a href="${href}" style="background:#2f7df6;color:#fff;text-decoration:none;padding:13px 22px;border-radius:8px;font-weight:bold;display:inline-block">${esc(label)}</a></p>`;

async function send(to, subject, html, text) {
  const cfg = await getSettings();
  const t = await getTransport(cfg);
  await t.sendMail({ from: cfg.mail_from, replyTo: cfg.support_email, to, subject, html, text: `${text}\n\nDúvidas: ${cfg.support_email}` });
}

/** Ajusta o rodapé com o e-mail de suporte antes de montar a mensagem. */
async function prep() { SUPPORT = (await getSettings()).support_email; }

export async function sendTest(to) {
  await prep();
  await send(to, 'Teste de envio · Biblioteca Formare', layout('Teste de envio', '<p>Se você recebeu esta mensagem, o envio de e-mails da biblioteca está funcionando.</p>'), 'O envio de e-mails da biblioteca está funcionando.');
}

/** Cliente novo: link + senha provisória. */
export async function sendWelcome({ to, name, tempPassword, productName }) {
  await prep();
  const link = `${APP()}/entrar`;
  const html = layout('Seu acesso à Biblioteca Formare', `
<p>Olá${name ? ', ' + esc(name.split(' ')[0]) : ''}!</p>
<p>Sua compra de <b>${esc(productName)}</b> foi aprovada. O conteúdo já está na sua biblioteca.</p>
<table cellpadding="0" cellspacing="0" style="background:#f1f5fd;border-radius:8px;width:100%"><tr><td style="padding:14px 18px;font-size:15px">
E-mail: <b>${esc(to)}</b><br>Senha provisória: <b style="font-family:Consolas,monospace;font-size:18px;letter-spacing:1px">${esc(tempPassword)}</b>
</td></tr></table>
${button(link, 'Entrar na biblioteca')}
<p style="font-size:14px">No primeiro acesso, você vai criar uma senha só sua.</p>`);
  const text = `Sua compra de ${productName} foi aprovada.\nEntre em ${link}\nE-mail: ${to}\nSenha provisória: ${tempPassword}\nNo primeiro acesso você cria uma senha sua.`;
  await send(to, 'Seu acesso à Biblioteca Formare', html, text);
}

/** Cliente que já tem conta: só o link. */
export async function sendNewTitle({ to, name, productName }) {
  await prep();
  const link = `${APP()}/entrar`;
  const html = layout('Novo conteúdo na sua biblioteca', `
<p>Olá${name ? ', ' + esc(name.split(' ')[0]) : ''}!</p>
<p>Sua compra de <b>${esc(productName)}</b> foi aprovada e já está na sua biblioteca.</p>
<p>Entre com o seu e-mail e a senha que você já usa.</p>
${button(link, 'Abrir minha biblioteca')}`);
  await send(to, 'Novo conteúdo na sua Biblioteca Formare', html, `Sua compra de ${productName} já está na biblioteca: ${link}`);
}

/** Aviso de lançamento para quem pediu "Avise-me" (consentimento registrado). */
export async function sendLaunch({ to, name, title }) {
  await prep();
  const link = `${APP()}/entrar`;
  const html = layout('Já está disponível na sua biblioteca', `
<p>Olá${name ? ', ' + esc(name.split(' ')[0]) : ''}!</p>
<p>Você pediu para ser avisado quando este título fosse lançado, e ele já está disponível:</p>
<p style="font-size:17px"><b>${esc(title)}</b></p>
${button(link, 'Conhecer na biblioteca')}
<p style="font-size:13px;color:#566074">Você recebeu este e-mail porque pediu aviso no lançamento deste título. Se não quiser mais receber avisos, responda este e-mail escrevendo SAIR.</p>`);
  await send(to, `Já está disponível: ${title}`, html, `Você pediu aviso no lançamento e já está disponível: ${title}\nConheça na biblioteca: ${link}\nPara não receber mais avisos, responda este e-mail com SAIR.`);
}

export async function sendPasswordReset({ to, token }) {
  await prep();
  const link = `${APP()}/redefinir?token=${encodeURIComponent(token)}`;
  const html = layout('Criar nova senha', `
<p>Recebemos um pedido para criar uma nova senha da sua biblioteca.</p>
${button(link, 'Criar nova senha')}
<p style="font-size:14px">O link vale por 1 hora. Se não foi você, ignore este e-mail.</p>`);
  await send(to, 'Criar nova senha · Biblioteca Formare', html, `Crie sua nova senha (vale por 1 hora): ${link}`);
}
