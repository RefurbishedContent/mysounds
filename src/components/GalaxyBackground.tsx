import React from 'react';

const GalaxyBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 z-[1] pointer-events-none overflow-hidden">
      <style>{`
        @keyframes grain {
          0%, 100% { transform: translate(0, 0); }
          10% { transform: translate(-5%, -10%); }
          20% { transform: translate(-15%, 5%); }
          30% { transform: translate(7%, -25%); }
          40% { transform: translate(-5%, 25%); }
          50% { transform: translate(-15%, 10%); }
          60% { transform: translate(15%, 0%); }
          70% { transform: translate(0%, 15%); }
          80% { transform: translate(3%, 35%); }
          90% { transform: translate(-10%, 10%); }
        }
        .grain-overlay {
          position: fixed;
          inset: -50%;
          width: 200%;
          height: 200%;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
          background-size: 128px 128px;
          opacity: 0.035;
          animation: grain 8s steps(10) infinite;
          z-index: 1;
        }
        @keyframes edgePulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
      `}</style>

      {/* Film grain texture */}
      <div className="grain-overlay" />

      {/* Top edge glow */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px]"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, #06b6d4 15%, #3b82f6 35%, #06b6d4 50%, #3b82f6 65%, #06b6d4 85%, transparent 100%)',
          animation: 'edgePulse 4s ease-in-out infinite',
        }}
      />
      <div
        className="absolute top-0 left-0 right-0 h-16"
        style={{
          background: 'linear-gradient(180deg, rgba(6,182,212,0.08) 0%, transparent 100%)',
        }}
      />

      {/* Bottom edge glow */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[2px]"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, #06b6d4 15%, #3b82f6 35%, #06b6d4 50%, #3b82f6 65%, #06b6d4 85%, transparent 100%)',
          animation: 'edgePulse 4s ease-in-out infinite 1s',
        }}
      />
      <div
        className="absolute bottom-0 left-0 right-0 h-16"
        style={{
          background: 'linear-gradient(0deg, rgba(6,182,212,0.08) 0%, transparent 100%)',
        }}
      />

      {/* Left edge glow */}
      <div
        className="absolute top-0 bottom-0 left-0 w-[2px]"
        style={{
          background: 'linear-gradient(180deg, transparent 0%, #06b6d4 15%, #3b82f6 35%, #06b6d4 50%, #3b82f6 65%, #06b6d4 85%, transparent 100%)',
          animation: 'edgePulse 4s ease-in-out infinite 0.5s',
        }}
      />
      <div
        className="absolute top-0 bottom-0 left-0 w-16"
        style={{
          background: 'linear-gradient(90deg, rgba(6,182,212,0.06) 0%, transparent 100%)',
        }}
      />

      {/* Right edge glow */}
      <div
        className="absolute top-0 bottom-0 right-0 w-[2px]"
        style={{
          background: 'linear-gradient(180deg, transparent 0%, #06b6d4 15%, #3b82f6 35%, #06b6d4 50%, #3b82f6 65%, #06b6d4 85%, transparent 100%)',
          animation: 'edgePulse 4s ease-in-out infinite 1.5s',
        }}
      />
      <div
        className="absolute top-0 bottom-0 right-0 w-16"
        style={{
          background: 'linear-gradient(270deg, rgba(6,182,212,0.06) 0%, transparent 100%)',
        }}
      />

      {/* Corner accents - bright spots where edges meet */}
      {/* Top-left */}
      <div className="absolute top-0 left-0 w-24 h-24" style={{
        background: 'radial-gradient(circle at 0% 0%, rgba(6,182,212,0.15) 0%, transparent 70%)',
      }} />
      {/* Top-right */}
      <div className="absolute top-0 right-0 w-24 h-24" style={{
        background: 'radial-gradient(circle at 100% 0%, rgba(59,130,246,0.15) 0%, transparent 70%)',
      }} />
      {/* Bottom-left */}
      <div className="absolute bottom-0 left-0 w-24 h-24" style={{
        background: 'radial-gradient(circle at 0% 100%, rgba(59,130,246,0.15) 0%, transparent 70%)',
      }} />
      {/* Bottom-right */}
      <div className="absolute bottom-0 right-0 w-24 h-24" style={{
        background: 'radial-gradient(circle at 100% 100%, rgba(6,182,212,0.15) 0%, transparent 70%)',
      }} />
    </div>
  );
};

export default GalaxyBackground;
