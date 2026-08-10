import React from 'react';

const GalaxyBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 z-[1] pointer-events-none overflow-hidden">
      <div className="absolute top-[-15%] left-[-10%] w-[55%] h-[50%] rounded-full bg-cyan-500/[0.07] blur-[120px]" />
      <div className="absolute top-[10%] right-[-15%] w-[50%] h-[45%] rounded-full bg-blue-600/[0.06] blur-[130px]" />
      <div className="absolute bottom-[-10%] left-[20%] w-[45%] h-[40%] rounded-full bg-cyan-400/[0.04] blur-[100px]" />
      <div className="absolute bottom-[15%] right-[5%] w-[35%] h-[35%] rounded-full bg-blue-500/[0.05] blur-[110px]" />
    </div>
  );
};

export default GalaxyBackground;
