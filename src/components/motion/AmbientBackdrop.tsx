/**
 * Static light pools, vignette and film grain. Keeping this full-screen
 * backdrop still avoids continuous compositing beneath the frosted UI.
 */

const GRAIN = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.55 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`;

export function AmbientBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[-1] overflow-hidden bg-[#08070d]">
      {/* Key light — violet, top centre. */}
      <div
        className="absolute left-1/2 top-[-35%] h-[95vh] w-[130vw] -translate-x-1/2"
        style={{ background: 'radial-gradient(closest-side, rgba(109, 74, 255, 0.28), rgba(109, 74, 255, 0) 70%)' }}
      />
      {/* Fill — cool blue, the onion-skin "previous frame" colour. */}
      <div
        className="absolute left-[-20%] top-[30%] h-[80vh] w-[70vw]"
        style={{
          background: 'radial-gradient(closest-side, rgba(79, 139, 255, 0.12), rgba(79, 139, 255, 0) 70%)',
        }}
      />
      {/* Rim — warm amber, the "next frame" colour, kept faint. */}
      <div
        className="absolute bottom-[-30%] right-[-15%] h-[75vh] w-[65vw]"
        style={{
          background: 'radial-gradient(closest-side, rgba(255, 154, 61, 0.08), rgba(255, 154, 61, 0) 70%)',
        }}
      />
      {/* Vignette pulls the eye inward. */}
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse at 50% 35%, transparent 40%, rgba(4, 3, 8, 0.75) 100%)' }}
      />
      {/* Film grain. */}
      <div className="absolute inset-0 opacity-[0.07] mix-blend-overlay" style={{ backgroundImage: GRAIN }} />
    </div>
  );
}
