import AuthBox from '@/components/AuthBox';
import { ResetForm } from '@/components/Forms';

export const metadata = { title: 'Nova senha · Biblioteca Formare' };

export default async function Page({ searchParams }) {
  const { token = '' } = await searchParams;
  return <AuthBox title="Criar nova senha" text="Escolha uma senha com pelo menos 8 caracteres."><ResetForm token={String(token)} /></AuthBox>;
}
