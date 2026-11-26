import { getSettings } from '@/lib/settings';
import { currentUser } from '@/lib/auth';
import { ActionForm } from '@/components/admin/AdminClient';
import { saveSettings, sendTestEmail } from '../actions';

export default async function Config() {
  const s = await getSettings();
  const u = await currentUser();
  const app = process.env.APP_URL || 'https://biblioteca.institutoformare.com.br';
  return (
    <>
      <h1>Configurações</h1>
      <p className="adm-help">Senhas e tokens ficam guardados no banco e não aparecem de volta aqui. Deixe um campo secreto em branco para manter o que já está salvo.</p>

      <ActionForm action={saveSettings} className="adm-box">
        <h2>E-mail de envio</h2>
        <p className="adm-help">Os e-mails saem pela caixa abaixo (na Hostinger, acesso@ e suporte@ são apelidos da caixa controle@).</p>
        <div className="adm-grid3">
          <div className="fld"><label htmlFor="smtp_user">Caixa que envia (login SMTP)</label><input id="smtp_user" name="smtp_user" defaultValue={s.smtp_user} /></div>
          <div className="fld"><label htmlFor="smtp_password">Senha dessa caixa {s.smtp_password ? '(já salva)' : '(não salva)'}</label><input id="smtp_password" name="smtp_password" type="password" autoComplete="new-password" placeholder={s.smtp_password ? '••••••••' : 'Digite a senha'} /></div>
          <div className="fld"><label htmlFor="mail_from">Remetente que o cliente vê</label><input id="mail_from" name="mail_from" defaultValue={s.mail_from} /></div>
          <div className="fld"><label htmlFor="support_email">E-mail de suporte (respostas e rodapé)</label><input id="support_email" name="support_email" defaultValue={s.support_email} /></div>
          <div className="fld"><label htmlFor="smtp_host">Servidor SMTP</label><input id="smtp_host" name="smtp_host" defaultValue={s.smtp_host} /></div>
          <div className="fld"><label htmlFor="smtp_port">Porta</label><input id="smtp_port" name="smtp_port" defaultValue={s.smtp_port} /></div>
        </div>
        <h2>Kiwify</h2>
        <p className="adm-help">Endereço do webhook para colar na Kiwify: <b>{app}/api/webhooks/kiwify</b></p>
        <div className="adm-grid3">
          <div className="fld"><label htmlFor="kiwify_token">Token do webhook {s.kiwify_token ? '(já salvo)' : '(não salvo)'}</label><input id="kiwify_token" name="kiwify_token" type="password" autoComplete="off" placeholder={s.kiwify_token ? '••••••••' : 'Cole o token que a Kiwify mostra'} /></div>
        </div>
      </ActionForm>

      <ActionForm action={sendTestEmail} className="adm-box adm-grid3" submit="Enviar e-mail de teste">
        <div className="fld"><label htmlFor="to">Enviar teste para</label><input id="to" name="to" type="email" defaultValue={u?.email} /></div>
      </ActionForm>
    </>
  );
}
