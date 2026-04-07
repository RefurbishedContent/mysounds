import React from 'react';

interface Props {
  sidebarWidth?: number;
}

const GalaxyBackground: React.FC<Props> = () => {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'url(/DJ_background.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center top',
          backgroundRepeat: 'no-repeat',
        }}
      />

      <div
        className="animate-pulse"
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse at 50% 40%, rgba(6,182,212,0.06) 0%, transparent 70%)',
          animationDuration: '4s',
        }}
      />

      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to bottom, rgba(5,5,16,0.3) 0%, rgba(5,5,16,0.05) 30%, rgba(5,5,16,0.05) 70%, rgba(5,5,16,0.5) 100%)',
        }}
      />
    </div>
  );
};

export default GalaxyBackground;
