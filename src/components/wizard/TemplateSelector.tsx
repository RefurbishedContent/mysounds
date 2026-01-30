import React, { useState, useEffect } from 'react';
import { Sparkles, Check } from 'lucide-react';
import { TemplateData, databaseService } from '../../lib/database';
import { UploadResult } from '../../lib/storage';

interface TemplateSelectorProps {
  selectedSongs: UploadResult[];
  selectedTemplate: TemplateData | null;
  useAITemplate: boolean;
  onSelectTemplate: (template: TemplateData | null) => void;
  onToggleAI: (useAI: boolean) => void;
}

const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  selectedSongs,
  selectedTemplate,
  useAITemplate,
  onSelectTemplate,
  onToggleAI
}) => {
  const [templates, setTemplates] = useState<TemplateData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTemplates = async () => {
      try {
        setLoading(true);
        const allTemplates = await databaseService.getAllTemplates();

        const songA = selectedSongs[0];
        const songB = selectedSongs[1];

        if (songA && songB) {
          const avgBpm = ((songA.analysis?.bpm || 0) + (songB.analysis?.bpm || 0)) / 2;

          const compatibleTemplates = allTemplates.filter(template => {
            if (!template.bpm_min || !template.bpm_max) return true;
            return avgBpm >= template.bpm_min && avgBpm <= template.bpm_max;
          });

          setTemplates(compatibleTemplates);
        } else {
          setTemplates(allTemplates);
        }
      } catch (error) {
        console.error('Failed to load templates:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTemplates();
  }, [selectedSongs]);

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p className="text-gray-400 mt-2 text-sm">Loading templates...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-white mb-2">Transition Template</h3>
        <p className="text-sm text-gray-400">Choose how your songs will blend together</p>
      </div>

      <button
        onClick={() => onToggleAI(true)}
        className={`w-full p-4 rounded-xl border-2 transition-all duration-200 text-left ${
          useAITemplate
            ? 'bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border-cyan-500 shadow-lg shadow-cyan-500/20'
            : 'bg-gray-800 border-gray-700 hover:border-gray-600'
        }`}
      >
        <div className="flex items-start space-x-3">
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
            useAITemplate
              ? 'bg-gradient-to-br from-cyan-500 to-blue-500'
              : 'bg-gray-700'
          }`}>
            <Sparkles size={24} className="text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <h4 className={`font-semibold ${useAITemplate ? 'text-cyan-400' : 'text-white'}`}>
                Let AI Choose Best Template
              </h4>
              {useAITemplate && (
                <Check size={20} className="text-cyan-400" />
              )}
            </div>
            <p className="text-sm text-gray-400">
              AI will analyze your songs and automatically select the optimal transition template
            </p>
          </div>
        </div>
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
        {templates.slice(0, 6).map((template) => (
          <button
            key={template.id}
            onClick={() => {
              onSelectTemplate(template);
              onToggleAI(false);
            }}
            className={`p-4 rounded-xl border-2 transition-all duration-200 text-left ${
              !useAITemplate && selectedTemplate?.id === template.id
                ? 'bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500 shadow-lg shadow-purple-500/20'
                : 'bg-gray-800 border-gray-700 hover:border-gray-600'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <h4 className={`font-semibold ${
                !useAITemplate && selectedTemplate?.id === template.id ? 'text-purple-400' : 'text-white'
              }`}>
                {template.name}
              </h4>
              {!useAITemplate && selectedTemplate?.id === template.id && (
                <Check size={20} className="text-purple-400" />
              )}
            </div>
            <p className="text-sm text-gray-400 mb-3">{template.description}</p>
            <div className="flex items-center space-x-2 text-xs">
              {template.bpm_min && template.bpm_max && (
                <span className="px-2 py-1 bg-gray-700 rounded text-gray-400">
                  {template.bpm_min}-{template.bpm_max} BPM
                </span>
              )}
              <span className="px-2 py-1 bg-gray-700 rounded text-gray-400 capitalize">
                {template.difficulty}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default TemplateSelector;
