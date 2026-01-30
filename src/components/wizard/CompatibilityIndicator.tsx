import React from 'react';
import { TrendingUp, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { UploadResult } from '../../lib/storage';

interface CompatibilityIndicatorProps {
  songA: UploadResult;
  songB: UploadResult;
}

interface CompatibilityScore {
  overall: number;
  bpm: number;
  key: number;
  energy: number;
  messages: string[];
}

const calculateCompatibility = (songA: UploadResult, songB: UploadResult): CompatibilityScore => {
  const analysisA = songA.analysis || {};
  const analysisB = songB.analysis || {};

  const bpmA = analysisA.bpm || 0;
  const bpmB = analysisB.bpm || 0;
  const keyA = analysisA.key || '';
  const keyB = analysisB.key || '';
  const energyA = analysisA.energy || 0.5;
  const energyB = analysisB.energy || 0.5;

  const messages: string[] = [];
  let bpmScore = 0;
  let keyScore = 0;
  let energyScore = 0;

  if (bpmA && bpmB) {
    const bpmDiff = Math.abs(bpmA - bpmB);
    const bpmPercent = (bpmDiff / Math.max(bpmA, bpmB)) * 100;

    if (bpmPercent < 5) {
      bpmScore = 100;
      messages.push('Excellent BPM match');
    } else if (bpmPercent < 10) {
      bpmScore = 80;
      messages.push('Good BPM compatibility');
    } else if (bpmPercent < 20) {
      bpmScore = 60;
      messages.push('BPM adjustment recommended');
    } else {
      bpmScore = 40;
      messages.push('Significant BPM difference');
    }
  }

  const compatibleKeys: { [key: string]: string[] } = {
    'C': ['C', 'G', 'Am', 'F'],
    'G': ['G', 'D', 'Em', 'C'],
    'D': ['D', 'A', 'Bm', 'G'],
    'A': ['A', 'E', 'F#m', 'D'],
    'E': ['E', 'B', 'C#m', 'A'],
  };

  if (keyA && keyB) {
    if (keyA === keyB) {
      keyScore = 100;
      messages.push('Perfect key match');
    } else if (compatibleKeys[keyA]?.includes(keyB)) {
      keyScore = 85;
      messages.push('Harmonically compatible keys');
    } else {
      keyScore = 50;
      messages.push('Key adjustment may be needed');
    }
  }

  if (energyA && energyB) {
    const energyDiff = Math.abs(energyA - energyB);
    if (energyDiff < 0.15) {
      energyScore = 100;
      messages.push('Similar energy levels');
    } else if (energyDiff < 0.3) {
      energyScore = 75;
      messages.push('Moderate energy difference');
    } else {
      energyScore = 50;
      messages.push('Contrasting energy levels');
    }
  }

  const overall = Math.round((bpmScore + keyScore + energyScore) / 3);

  return { overall, bpm: bpmScore, key: keyScore, energy: energyScore, messages };
};

const CompatibilityIndicator: React.FC<CompatibilityIndicatorProps> = ({ songA, songB }) => {
  const compatibility = calculateCompatibility(songA, songB);

  const getColorClass = (score: number) => {
    if (score >= 80) return 'from-green-500 to-emerald-500';
    if (score >= 60) return 'from-yellow-500 to-orange-500';
    return 'from-orange-500 to-red-500';
  };

  const getIcon = (score: number) => {
    if (score >= 80) return CheckCircle;
    if (score >= 60) return Info;
    return AlertCircle;
  };

  const Icon = getIcon(compatibility.overall);

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
          <TrendingUp size={20} className="text-cyan-400" />
          <span>Compatibility Analysis</span>
        </h3>
        <div className="flex items-center space-x-2">
          <Icon size={20} className={`bg-gradient-to-r ${getColorClass(compatibility.overall)} bg-clip-text text-transparent`} />
          <span className={`text-3xl font-bold bg-gradient-to-r ${getColorClass(compatibility.overall)} bg-clip-text text-transparent`}>
            {compatibility.overall}%
          </span>
        </div>
      </div>

      <div className="relative h-3 bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full bg-gradient-to-r ${getColorClass(compatibility.overall)} rounded-full transition-all duration-1000 ease-out`}
          style={{ width: `${compatibility.overall}%` }}
        ></div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="text-center p-3 bg-gray-700/50 rounded-lg">
          <div className="text-xs text-gray-400 mb-1">BPM</div>
          <div className="text-lg font-bold text-white">{compatibility.bpm}%</div>
        </div>
        <div className="text-center p-3 bg-gray-700/50 rounded-lg">
          <div className="text-xs text-gray-400 mb-1">Key</div>
          <div className="text-lg font-bold text-white">{compatibility.key}%</div>
        </div>
        <div className="text-center p-3 bg-gray-700/50 rounded-lg">
          <div className="text-xs text-gray-400 mb-1">Energy</div>
          <div className="text-lg font-bold text-white">{compatibility.energy}%</div>
        </div>
      </div>

      <div className="space-y-2">
        {compatibility.messages.map((message, idx) => (
          <div key={idx} className="flex items-center space-x-2 text-sm text-gray-400">
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-500"></div>
            <span>{message}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CompatibilityIndicator;
