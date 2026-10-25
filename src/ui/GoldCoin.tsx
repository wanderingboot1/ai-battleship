export function GoldCoin() {
  return (
    <svg className="coin" viewBox="0 0 20 20" aria-hidden="true">
      <defs>
        <radialGradient id="coin-face" cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#fff3b0" />
          <stop offset="45%" stopColor="#f7c531" />
          <stop offset="100%" stopColor="#c98a0b" />
        </radialGradient>
      </defs>
      <circle cx="10" cy="10" r="9" fill="url(#coin-face)" stroke="#7a5200" strokeWidth="1.2" />
      <circle cx="10" cy="10" r="6" fill="none" stroke="#a86f05" strokeWidth="1" />
      <path d="M10 6.2l1.1 2.3 2.5.3-1.8 1.7.5 2.5-2.3-1.2-2.3 1.2.5-2.5-1.8-1.7 2.5-.3z" fill="#fff1a8" stroke="#a86f05" strokeWidth="0.5" />
    </svg>
  )
}
