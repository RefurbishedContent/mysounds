import React from 'react';

const GalaxyBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 z-[1] pointer-events-none overflow-hidden">
      <style>{`
        @keyframes orbDrift1 {
          0% { top: 45%; left: 45%; transform: scale(1) rotate(0deg); border-radius: 48% 52% 50% 50%; }
          12% { top: 20%; left: 55%; transform: scale(1.2) rotate(20deg); border-radius: 55% 45% 42% 58%; }
          25% { top: 15%; left: 75%; transform: scale(0.85) rotate(-15deg); border-radius: 42% 58% 55% 45%; }
          37% { top: 35%; left: 80%; transform: scale(1.3) rotate(30deg); border-radius: 58% 42% 48% 52%; }
          50% { top: 60%; left: 65%; transform: scale(0.9) rotate(-10deg); border-radius: 45% 55% 58% 42%; }
          62% { top: 70%; left: 40%; transform: scale(1.15) rotate(25deg); border-radius: 52% 48% 42% 58%; }
          75% { top: 55%; left: 20%; transform: scale(0.8) rotate(-20deg); border-radius: 42% 58% 52% 48%; }
          87% { top: 30%; left: 25%; transform: scale(1.1) rotate(15deg); border-radius: 55% 45% 48% 52%; }
          100% { top: 45%; left: 45%; transform: scale(1) rotate(0deg); border-radius: 48% 52% 50% 50%; }
        }
        @keyframes orbDrift2 {
          0% { top: 50%; left: 50%; transform: scale(1.1) rotate(0deg); border-radius: 52% 48% 45% 55%; }
          16% { top: 65%; left: 70%; transform: scale(0.8) rotate(-30deg); border-radius: 45% 55% 58% 42%; }
          33% { top: 75%; left: 45%; transform: scale(1.25) rotate(20deg); border-radius: 58% 42% 48% 52%; }
          50% { top: 55%; left: 25%; transform: scale(0.9) rotate(-15deg); border-radius: 42% 58% 52% 48%; }
          66% { top: 30%; left: 35%; transform: scale(1.15) rotate(35deg); border-radius: 55% 45% 42% 58%; }
          83% { top: 25%; left: 60%; transform: scale(0.85) rotate(-25deg); border-radius: 48% 52% 55% 45%; }
          100% { top: 50%; left: 50%; transform: scale(1.1) rotate(0deg); border-radius: 52% 48% 45% 55%; }
        }
        @keyframes orbDrift3 {
          0% { top: 40%; left: 55%; transform: scale(0.9) rotate(10deg); border-radius: 50% 50% 55% 45%; }
          20% { top: 25%; left: 30%; transform: scale(1.3) rotate(-35deg); border-radius: 42% 58% 45% 55%; }
          40% { top: 50%; left: 15%; transform: scale(0.75) rotate(25deg); border-radius: 58% 42% 50% 50%; }
          60% { top: 70%; left: 50%; transform: scale(1.2) rotate(-20deg); border-radius: 48% 52% 58% 42%; }
          80% { top: 40%; left: 75%; transform: scale(0.85) rotate(30deg); border-radius: 55% 45% 45% 55%; }
          100% { top: 40%; left: 55%; transform: scale(0.9) rotate(10deg); border-radius: 50% 50% 55% 45%; }
        }
        @keyframes coreFloat {
          0% { top: 45%; left: 48%; transform: scale(1); }
          20% { top: 35%; left: 60%; transform: scale(1.1); }
          40% { top: 55%; left: 55%; transform: scale(0.9); }
          60% { top: 50%; left: 35%; transform: scale(1.15); }
          80% { top: 38%; left: 42%; transform: scale(0.95); }
          100% { top: 45%; left: 48%; transform: scale(1); }
        }
      `}</style>

      {/* Outer diffuse layer - large, soft, wanders wide */}
      <div
        className="absolute w-[420px] h-[420px] blur-[120px]"
        style={{
          background: 'radial-gradient(circle, rgba(0,210,255,0.12) 0%, rgba(0,140,255,0.06) 60%, transparent 100%)',
          animation: 'orbDrift3 25s ease-in-out infinite',
        }}
      />

      {/* Mid energy layer */}
      <div
        className="absolute w-[280px] h-[280px] blur-[80px]"
        style={{
          background: 'radial-gradient(circle, rgba(0,180,255,0.18) 0%, rgba(6,182,212,0.10) 50%, transparent 100%)',
          animation: 'orbDrift2 18s ease-in-out infinite',
        }}
      />

      {/* Primary energy orb - tighter, more vivid */}
      <div
        className="absolute w-[180px] h-[180px] blur-[50px]"
        style={{
          background: 'radial-gradient(circle, rgba(34,211,238,0.22) 0%, rgba(56,189,248,0.12) 50%, transparent 100%)',
          animation: 'orbDrift1 14s ease-in-out infinite',
        }}
      />

      {/* Bright core - small hot center */}
      <div
        className="absolute w-[70px] h-[70px] rounded-full blur-[30px]"
        style={{
          background: 'radial-gradient(circle, rgba(165,243,252,0.25) 0%, rgba(34,211,238,0.15) 60%, transparent 100%)',
          animation: 'coreFloat 10s ease-in-out infinite',
        }}
      />
    </div>
  );
};

export default GalaxyBackground;
