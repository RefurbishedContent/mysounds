import React from 'react';

const GalaxyBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 z-[1] pointer-events-none overflow-hidden flex items-center justify-center">
      <style>{`
        @keyframes energyPulse {
          0% { transform: scale(1) rotate(0deg); border-radius: 48% 52% 50% 50%; opacity: 0.6; }
          15% { transform: scale(1.15) rotate(15deg); border-radius: 55% 45% 42% 58%; opacity: 0.75; }
          30% { transform: scale(0.9) rotate(-10deg); border-radius: 42% 58% 55% 45%; opacity: 0.55; }
          45% { transform: scale(1.25) rotate(25deg); border-radius: 50% 50% 45% 55%; opacity: 0.8; }
          60% { transform: scale(0.85) rotate(-20deg); border-radius: 58% 42% 52% 48%; opacity: 0.5; }
          75% { transform: scale(1.1) rotate(10deg); border-radius: 45% 55% 58% 42%; opacity: 0.7; }
          100% { transform: scale(1) rotate(0deg); border-radius: 48% 52% 50% 50%; opacity: 0.6; }
        }
        @keyframes energyPulse2 {
          0% { transform: scale(1.1) rotate(0deg); border-radius: 52% 48% 45% 55%; opacity: 0.4; }
          20% { transform: scale(0.85) rotate(-25deg); border-radius: 45% 55% 58% 42%; opacity: 0.55; }
          40% { transform: scale(1.3) rotate(20deg); border-radius: 58% 42% 48% 52%; opacity: 0.65; }
          60% { transform: scale(0.95) rotate(-15deg); border-radius: 42% 58% 52% 48%; opacity: 0.45; }
          80% { transform: scale(1.2) rotate(30deg); border-radius: 55% 45% 42% 58%; opacity: 0.6; }
          100% { transform: scale(1.1) rotate(0deg); border-radius: 52% 48% 45% 55%; opacity: 0.4; }
        }
        @keyframes energyPulse3 {
          0% { transform: scale(0.9) rotate(10deg); border-radius: 50% 50% 55% 45%; opacity: 0.3; }
          25% { transform: scale(1.35) rotate(-30deg); border-radius: 42% 58% 45% 55%; opacity: 0.5; }
          50% { transform: scale(0.8) rotate(20deg); border-radius: 58% 42% 50% 50%; opacity: 0.25; }
          75% { transform: scale(1.2) rotate(-15deg); border-radius: 48% 52% 58% 42%; opacity: 0.45; }
          100% { transform: scale(0.9) rotate(10deg); border-radius: 50% 50% 55% 45%; opacity: 0.3; }
        }
        @keyframes coreGlow {
          0% { transform: scale(1); opacity: 0.9; }
          25% { transform: scale(1.15); opacity: 1; }
          50% { transform: scale(0.9); opacity: 0.8; }
          75% { transform: scale(1.1); opacity: 0.95; }
          100% { transform: scale(1); opacity: 0.9; }
        }
      `}</style>

      {/* Outer diffuse layer */}
      <div
        className="absolute w-[500px] h-[500px] bg-cyan-500/20 blur-[100px]"
        style={{ animation: 'energyPulse3 11s ease-in-out infinite' }}
      />

      {/* Mid energy layer */}
      <div
        className="absolute w-[350px] h-[350px] bg-blue-500/25 blur-[80px]"
        style={{ animation: 'energyPulse2 8s ease-in-out infinite' }}
      />

      {/* Primary energy orb */}
      <div
        className="absolute w-[250px] h-[250px] bg-cyan-400/30 blur-[60px]"
        style={{ animation: 'energyPulse 6s ease-in-out infinite' }}
      />

      {/* Bright core */}
      <div
        className="absolute w-[100px] h-[100px] rounded-full bg-cyan-300/40 blur-[40px]"
        style={{ animation: 'coreGlow 4s ease-in-out infinite' }}
      />
    </div>
  );
};

export default GalaxyBackground;
