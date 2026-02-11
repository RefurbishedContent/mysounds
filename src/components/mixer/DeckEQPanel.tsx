import React from 'react';
import { EQKnob } from './EQKnob';

interface DeckEQPanelProps {
  eq: { high: number; mid: number; low: number };
  accentColor?: string;
  deckLabel: string;
  isNightclub?: boolean;
  onChange: (type: 'high' | 'mid' | 'low', value: number) => void;
}

export const DeckEQPanel: React.FC<DeckEQPanelProps> = ({
  eq,
  accentColor = '#06b6d4',
  deckLabel,
  isNightclub = false,
  onChange
}) => {
  return (
    <div
      className="rounded-lg px-3 py-2 transition-all"
      style={{
        backgroundColor: isNightclub ? 'rgba(0,0,0,0.5)' : 'rgba(17,24,39,0.6)',
        boxShadow: isNightclub ? `inset 0 0 15px ${accentColor}10` : undefined
      }}
    >
      <div
        className="text-[9px] font-semibold uppercase tracking-wider text-center mb-2"
        style={{ color: accentColor }}
      >
        EQ {deckLabel}
      </div>
      <div className="flex items-center justify-center gap-3">
        <EQKnob
          value={eq.high}
          label="Hi"
          accentColor={accentColor}
          onChange={(value) => onChange('high', value)}
        />
        <EQKnob
          value={eq.mid}
          label="Mid"
          accentColor={accentColor}
          onChange={(value) => onChange('mid', value)}
        />
        <EQKnob
          value={eq.low}
          label="Lo"
          accentColor={accentColor}
          onChange={(value) => onChange('low', value)}
        />
      </div>
    </div>
  );
};
