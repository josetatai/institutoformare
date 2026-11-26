'use client';
import { useActionState } from 'react';
import { loginAction, setPasswordAction, forgotAction, resetAction, changePasswordAction } from '@/app/actions';

function Msg({ state }) {
  if (state?.error) return <div className="err" role="alert">{state.error}</div>;
  if (state?.ok) return <div className="okmsg" role="status">{state.ok}</div>;
  return null;
}
const Submit = ({ pending, children }) => (
  <button className="btn buy" type="submit" disabled={pending}>{pending ? 'Aguarde…' : children}</button>
);

export function LoginForm() {
  const [state, act, pending] = useActionState(loginAction, null);
  return (
    <form action={act}>
      <Msg state={state} />
      <div className="hint">Primeiro acesso? A senha provisória de 8 caracteres está no e-mail de boas-vindas.</div>
      <div className="fld"><label htmlFor="email">E-mail da compra</label><input id="email" name="email" type="email" autoComplete="email" required defaultValue={state?.email || ''} key={state?.email || 'e'} /></div>
      <div className="fld"><label htmlFor="password">Senha</label><input id="password" name="password" type="password" autoComplete="current-password" required /></div>
      <Submit pending={pending}>Entrar</Submit>
      <a className="lk" href="/esqueci-senha">Esqueci minha senha</a>
    </form>
  );
}

export function NewPasswordForm() {
  const [state, act, pending] = useActionState(setPasswordAction, null);
  return (
    <form action={act}>
      <Msg state={state} />
      <div className="fld"><label htmlFor="password">Nova senha</label><input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required placeholder="Mínimo de 8 caracteres" /></div>
      <div className="fld"><label htmlFor="password2">Repita a nova senha</label><input id="password2" name="password2" type="password" autoComplete="new-password" minLength={8} required /></div>
      <Submit pending={pending}>Salvar e entrar na biblioteca</Submit>
    </form>
  );
}

export function ForgotForm() {
  const [state, act, pending] = useActionState(forgotAction, null);
  return (
    <form action={act}>
      <Msg state={state} />
      <div className="fld"><label htmlFor="email">E-mail da compra</label><input id="email" name="email" type="email" autoComplete="email" required /></div>
      <Submit pending={pending}>Enviar link</Submit>
      <a className="lk" href="/entrar">Voltar para o login</a>
    </form>
  );
}

export function ResetForm({ token }) {
  const [state, act, pending] = useActionState(resetAction, null);
  return (
    <form action={act}>
      <Msg state={state} />
      <input type="hidden" name="token" value={token} />
      <div className="fld"><label htmlFor="password">Nova senha</label><input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required /></div>
      <div className="fld"><label htmlFor="password2">Repita a nova senha</label><input id="password2" name="password2" type="password" autoComplete="new-password" minLength={8} required /></div>
      <Submit pending={pending}>Salvar nova senha</Submit>
    </form>
  );
}

export function ChangePasswordForm() {
  const [state, act, pending] = useActionState(changePasswordAction, null);
  return (
    <form action={act}>
      <Msg state={state} />
      <div className="fld"><label htmlFor="current">Senha atual</label><input id="current" name="current" type="password" autoComplete="current-password" required /></div>
      <div className="fld"><label htmlFor="password">Nova senha</label><input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required /></div>
      <div className="fld"><label htmlFor="password2">Repita a nova senha</label><input id="password2" name="password2" type="password" autoComplete="new-password" minLength={8} required /></div>
      <Submit pending={pending}>Trocar senha</Submit>
    </form>
  );
}
