import AuthBox from '@/components/AuthBox';
import { ForgotForm } from '@/components/Forms';

export const metadata = { title: 'Esqueci minha senha · Biblioteca Formare' };

export default function Page() {
  return <AuthBox title="Esqueci minha senha" text="Informe o e-mail da compra. Enviamos um link para você criar uma nova senha."><ForgotForm /></AuthBox>;
}
