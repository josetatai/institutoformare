export default function AuthBox({ title, text, children }) {
  return (
    <div className="login wrap">
      <div className="lbox">
        <img src="/logo-formare-branco.webp" alt="Instituto Formare" />
        <h2>{title}</h2>
        {text && <p>{text}</p>}
        {children}
        <p className="adm-help" style={{ marginTop: 18, textAlign: 'center' }}>Precisa de ajuda? suporte@institutoformare.com.br</p>
      </div>
    </div>
  );
}
