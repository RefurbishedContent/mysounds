import React, { useState, Suspense } from 'react';
import { ArrowLeft, Music, Globe, AlertTriangle, ExternalLink } from 'lucide-react';

// Dynamic import to prevent SSR issues
const ToneEngine = React.lazy(() => import('./audio/ToneEngine'));

interface ToneTestPageProps {
  onBack: () => void;
}

const ToneTestPage: React.FC<ToneTestPageProps> = ({ onBack }) => {
  const [showImplementationNotes, setShowImplementationNotes] = useState(false);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-700">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all duration-200"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">Tone.js Audio Engine Test</h1>
            <p className="text-gray-400">Testing browser-based audio processing capabilities</p>
          </div>
        </div>

        <button
          onClick={() => setShowImplementationNotes(!showImplementationNotes)}
          className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white border border-gray-600 hover:border-gray-500 rounded-lg font-medium transition-all duration-200 flex items-center space-x-2"
        >
          <Globe size={16} />
          <span>Implementation Notes</span>
        </button>
      </div>

      {/* Implementation Notes */}
      {showImplementationNotes && (
        <div className="border-b border-gray-700 p-6 bg-gray-800/30">
          <div className="max-w-4xl mx-auto space-y-4">
            <h2 className="text-xl font-semibold text-white mb-4">Implementation Notes</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h3 className="text-lg font-medium text-purple-300">Supabase Integration</h3>
                <ul className="text-sm text-gray-300 space-y-2">
                  <li>• Replace placeholder URLs with Supabase signed URLs from storage</li>
                  <li>• Use storageService.getUpload() to get fresh signed URLs</li>
                  <li>• Implement URL refresh for expired signed URLs</li>
                  <li>• Add CORS headers to Supabase storage bucket</li>
                </ul>
              </div>
              
              <div className="space-y-3">
                <h3 className="text-lg font-medium text-purple-300">Production Considerations</h3>
                <ul className="text-sm text-gray-300 space-y-2">
                  <li>• Handle Safari audio context limitations</li>
                  <li>• Add loading states for audio file fetching</li>
                  <li>• Implement proper error recovery</li>
                  <li>• Add progress indicators for long operations</li>
                </ul>
              </div>
            </div>

            <div className="bg-yellow-900/20 border border-yellow-600/50 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <AlertTriangle size={16} className="text-yellow-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-yellow-200 font-medium text-sm mb-1">Current Limitations</h4>
                  <p className="text-yellow-100/80 text-xs leading-relaxed">
                    Using placeholder URLs (example.com) which will fail to load. In production, 
                    integrate with the existing storageService to get valid signed URLs from Supabase.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto">
          <Suspense 
            fallback={
              <div className="glass-surface rounded-2xl p-12 text-center">
                <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <h3 className="text-xl font-semibold text-white mb-2">Loading Audio Engine</h3>
                <p className="text-gray-400">Initializing Tone.js components...</p>
              </div>
            }
          >
            <ToneEngine />
          </Suspense>

          {/* Usage Instructions */}
          <div className="mt-8 glass-surface rounded-2xl p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Usage Instructions</h2>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">1</div>
                <div>
                  <h3 className="text-white font-medium">Initialize Audio Context</h3>
                  <p className="text-gray-400 text-sm">Click "Initialize Audio" to start the Web Audio API (requires user gesture)</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">2</div>
                <div>
                  <h3 className="text-white font-medium">Start Playback</h3>
                  <p className="text-gray-400 text-sm">Click "Play" to start both audio tracks simultaneously</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">3</div>
                <div>
                  <h3 className="text-white font-medium">Test Crossfading</h3>
                  <p className="text-gray-400 text-sm">Use the crossfade slider to blend between Song A and Song B</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-orange-600 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">4</div>
                <div>
                  <h3 className="text-white font-medium">Scheduled Automation</h3>
                  <p className="text-gray-400 text-sm">Click "Schedule Crossfade" to test automated transitions</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-pink-600 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">5</div>
                <div>
                  <h3 className="text-white font-medium">Record & Export</h3>
                  <p className="text-gray-400 text-sm">Record a 3-second sample and download as mix.wav</p>
                </div>
              </div>
            </div>
          </div>

          {/* Integration Guide */}
          <div className="mt-6 glass-surface rounded-2xl p-6">
            <h2 className="text-xl font-semibold text-white mb-4">Integration with DJ Blender</h2>
            <div className="space-y-3 text-sm text-gray-300">
              <p>
                This test demonstrates core audio engine capabilities that can be integrated 
                into the main DJ Blender timeline:
              </p>
              <ul className="list-disc list-inside space-y-1 text-gray-400">
                <li>Replace placeholder URLs with actual Supabase signed URLs from uploaded tracks</li>
                <li>Connect crossfade control to timeline template parameters</li>
                <li>Use Transport.scheduleOnce for template-based automation</li>
                <li>Integrate recorder with the main export/render system</li>
                <li>Add proper error handling and loading states</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ToneTestPage;