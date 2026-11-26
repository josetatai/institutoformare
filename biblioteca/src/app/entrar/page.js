import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import AuthBox from '@/components/AuthBox';
import { LoginForm } from '@/components/Forms';

export const metadata = { title: 'Entrar · Biblioteca Formare' };

export default async function Page() {
  if (await currentUser()) redirect('/');
  return <AuthBox title="Entrar na biblioteca" text="Use o e-mail da sua compra e a sua senha."><LoginForm /></AuthBox>;
}
