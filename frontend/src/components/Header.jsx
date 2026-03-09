export default function Header() {
  return (
    <header className="header">
      <div className="logo">
        <div className="logo-mark">
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M2 6a2 2 0 012-2h7a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM13 6a2 2 0 012-2h3a2 2 0 012 2v12a2 2 0 01-2 2h-3a2 2 0 01-2-2V6z" />
          </svg>
        </div>
        <span className="logo-text">
          MANGA<span>LOG</span>
        </span>
      </div>
      <div className="header-right" />
    </header>
  );
}
