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
          opacity: 0.35,
        }}
      />

      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to bottom, rgba(5,5,16,0.6) 0%, rgba(5,5,16,0.45) 30%, rgba(5,5,16,0.45) 70%, rgba(5,5,16,0.7) 100%)',
        }}
      />
    </div>
  );
};

export default GalaxyBackground;
