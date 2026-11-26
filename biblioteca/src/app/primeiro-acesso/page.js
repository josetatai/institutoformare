import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import AuthBox from '@/components/AuthBox';
import { NewPasswordForm } from '@/components/Forms';

export const metadata = { title: 'Primeiro acesso · Biblioteca Formare' };

export default async function Page() {
  const user = await requireUser({ allowTempPassword: true });
  if (!user.must_change_password) redirect('/');
  return <AuthBox title="Crie sua senha" text="Este é seu primeiro acesso. Troque a senha provisória que chegou no seu e-mail por uma senha sua."><NewPasswordForm /></AuthBox>;
}
