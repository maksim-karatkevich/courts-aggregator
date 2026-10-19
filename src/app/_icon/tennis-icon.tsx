// Shared artwork for the generated app icons: green tile, tennis-ball glyph.
export function TennisIcon({ size }: { size: number }) {
  const ball = size * 0.62
  return (
    <div
      style={{
        width: size,
        height: size,
        background: '#15803d',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          width: ball,
          height: ball,
          borderRadius: '50%',
          background: '#d9f24a',
          display: 'flex',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: ball * 0.1,
            width: ball * 0.3,
            height: ball * 0.8,
            borderRight: `${ball * 0.06}px solid #ffffff`,
            borderRadius: '0 100% 100% 0',
          }}
        />
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: ball * 0.1,
            width: ball * 0.3,
            height: ball * 0.8,
            borderLeft: `${ball * 0.06}px solid #ffffff`,
            borderRadius: '100% 0 0 100%',
          }}
        />
      </div>
    </div>
  )
}
