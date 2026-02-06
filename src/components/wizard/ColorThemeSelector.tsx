import React, { useState } from 'react';
import { Palette, Droplet, Check, History } from 'lucide-react';
import { MixerTheme, getPresetThemes, validateThemeColors } from '../../lib/themeUtils';

interface ColorThemeSelectorProps {
  selectedTheme: MixerTheme;
  onThemeChange: (theme: MixerTheme) => void;
  onShowPreviousThemes: () => void;
}

const ColorThemeSelector: React.FC<ColorThemeSelectorProps> = ({
  selectedTheme,
  onThemeChange,
  onShowPreviousThemes
}) => {
  const [showCustom, setShowCustom] = useState(false);
  const [customTheme, setCustomTheme] = useState<MixerTheme>(selectedTheme);
  const [validationError, setValidationError] = useState<string>('');

  const presets = getPresetThemes();

  const handlePresetSelect = (preset: MixerTheme) => {
    setShowCustom(false);
    onThemeChange(preset);
  };

  const handleCustomColorChange = (deck: 'A' | 'B', position: 'from' | 'to', color: string) => {
    const newTheme = { ...customTheme };
    if (deck === 'A') {
      newTheme.deckAColors = { ...newTheme.deckAColors, [position]: color };
    } else {
      newTheme.deckBColors = { ...newTheme.deckBColors, [position]: color };
    }
    newTheme.presetName = undefined;
    setCustomTheme(newTheme);

    const validation = validateThemeColors(newTheme);
    if (validation.valid) {
      setValidationError('');
      onThemeChange(newTheme);
    } else {
      setValidationError(validation.error || '');
    }
  };

  const isPresetSelected = (presetId: string) => {
    return selectedTheme.presetName === presetId;
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Palette size={24} className="text-cyan-400" />
          <div>
            <h3 className="text-lg font-semibold text-white">Mixer Color Theme</h3>
            <p className="text-sm text-gray-400">Customize the look of your DJ decks</p>
          </div>
        </div>
        <button
          onClick={onShowPreviousThemes}
          className="flex items-center space-x-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-sm text-gray-300 rounded-lg transition-colors duration-200"
        >
          <History size={16} />
          <span>Copy from Previous</span>
        </button>
      </div>

      <div>
        <h4 className="text-sm font-medium text-white mb-3">Preset Themes</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {presets.map((preset) => (
            <button
              key={preset.id}
              onClick={() => handlePresetSelect(preset)}
              className={`relative p-4 rounded-lg border-2 transition-all duration-200 ${
                isPresetSelected(preset.id)
                  ? 'border-cyan-500 bg-gray-700'
                  : 'border-gray-600 bg-gray-750 hover:border-gray-500'
              }`}
            >
              {isPresetSelected(preset.id) && (
                <div className="absolute top-2 right-2 w-5 h-5 bg-cyan-500 rounded-full flex items-center justify-center">
                  <Check size={14} className="text-white" />
                </div>
              )}
              <div className="space-y-2">
                <div className="flex space-x-1">
                  <div
                    className="flex-1 h-8 rounded"
                    style={{
                      background: `linear-gradient(to right, ${preset.deckAColors.from}, ${preset.deckAColors.to})`
                    }}
                  />
                  <div
                    className="flex-1 h-8 rounded"
                    style={{
                      background: `linear-gradient(to right, ${preset.deckBColors.from}, ${preset.deckBColors.to})`
                    }}
                  />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-white">{preset.name}</p>
                  <p className="text-xs text-gray-400 line-clamp-2">{preset.description}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <button
          onClick={() => setShowCustom(!showCustom)}
          className={`w-full flex items-center justify-between p-4 rounded-lg border-2 transition-all duration-200 ${
            showCustom
              ? 'border-cyan-500 bg-gray-700'
              : 'border-gray-600 bg-gray-750 hover:border-gray-500'
          }`}
        >
          <div className="flex items-center space-x-3">
            <Droplet size={20} className="text-cyan-400" />
            <div className="text-left">
              <p className="text-sm font-medium text-white">Custom Colors</p>
              <p className="text-xs text-gray-400">Create your own color combination</p>
            </div>
          </div>
          <div className={`transform transition-transform duration-200 ${showCustom ? 'rotate-180' : ''}`}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" className="text-gray-400">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </div>
        </button>

        {showCustom && (
          <div className="mt-4 p-4 bg-gray-750 rounded-lg space-y-4">
            <div className="space-y-3">
              <h5 className="text-sm font-medium text-white">Deck A Colors</h5>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-2">Start Color</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={customTheme.deckAColors.from}
                      onChange={(e) => handleCustomColorChange('A', 'from', e.target.value)}
                      className="w-12 h-10 rounded border-2 border-gray-600 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={customTheme.deckAColors.from}
                      onChange={(e) => handleCustomColorChange('A', 'from', e.target.value)}
                      className="flex-1 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm text-white"
                      placeholder="#000000"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-2">End Color</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={customTheme.deckAColors.to}
                      onChange={(e) => handleCustomColorChange('A', 'to', e.target.value)}
                      className="w-12 h-10 rounded border-2 border-gray-600 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={customTheme.deckAColors.to}
                      onChange={(e) => handleCustomColorChange('A', 'to', e.target.value)}
                      className="flex-1 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm text-white"
                      placeholder="#000000"
                    />
                  </div>
                </div>
              </div>
              <div
                className="h-12 rounded-lg"
                style={{
                  background: `linear-gradient(to right, ${customTheme.deckAColors.from}, ${customTheme.deckAColors.to})`
                }}
              />
            </div>

            <div className="space-y-3">
              <h5 className="text-sm font-medium text-white">Deck B Colors</h5>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-2">Start Color</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={customTheme.deckBColors.from}
                      onChange={(e) => handleCustomColorChange('B', 'from', e.target.value)}
                      className="w-12 h-10 rounded border-2 border-gray-600 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={customTheme.deckBColors.from}
                      onChange={(e) => handleCustomColorChange('B', 'from', e.target.value)}
                      className="flex-1 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm text-white"
                      placeholder="#000000"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-2">End Color</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={customTheme.deckBColors.to}
                      onChange={(e) => handleCustomColorChange('B', 'to', e.target.value)}
                      className="w-12 h-10 rounded border-2 border-gray-600 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={customTheme.deckBColors.to}
                      onChange={(e) => handleCustomColorChange('B', 'to', e.target.value)}
                      className="flex-1 bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm text-white"
                      placeholder="#000000"
                    />
                  </div>
                </div>
              </div>
              <div
                className="h-12 rounded-lg"
                style={{
                  background: `linear-gradient(to right, ${customTheme.deckBColors.from}, ${customTheme.deckBColors.to})`
                }}
              />
            </div>

            {validationError && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                <p className="text-sm text-red-400">{validationError}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ColorThemeSelector;
