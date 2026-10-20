// Shared artwork for the generated PNG icons: the app logo (public copy: src/app/icon.svg)
// centred on a white tile, with padding so launchers that crop to a circle keep the lens.
export function TennisIcon({ size }: { size: number }) {
  const logo = size * 0.78
  return (
    <div
      style={{
        width: size,
        height: size,
        background: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <svg width={logo} height={logo} viewBox="0 0 512 512">
        <path d="M350 342 L424 416" fill="none" stroke="#14263D" strokeWidth="54" strokeLinecap="round" />
        <circle cx="226" cy="218" r="128" fill="#D7F21B" />
        <path d="M168 105 C218 145 218 291 168 331" fill="none" stroke="#FFFFFF" strokeWidth="13" strokeLinecap="round" />
        <path d="M284 105 C234 145 234 291 284 331" fill="none" stroke="#FFFFFF" strokeWidth="13" strokeLinecap="round" />
        <circle cx="226" cy="218" r="145" fill="none" stroke="#14263D" strokeWidth="24" />
      </svg>
    </div>
  )
}
