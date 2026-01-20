import React, { useState } from 'react';
import {
  Play,
  Upload,
  Layers,
  Shuffle,
  ArrowRight,
  Music,
  Headphones,
  Shield,
  Zap,
  Users,
  Globe,
  Twitter,
  Instagram,
  Youtube,
  Menu,
  X
} from 'lucide-react';

interface LandingPageProps {
  onTryMixer: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onTryMixer }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const features = [
    {
      icon: Upload,
      title: "Upload Two Songs",
      description: "Select any two tracks you want to combine. Our system supports MP3, WAV, and FLAC formats."
    },
    {
      icon: Layers,
      title: "AI Template Selection",
      description: "Our AI analyzes both tracks and selects the perfect transition template based on key, tempo, and energy patterns."
    },
    {
      icon: Shuffle,
      title: "Instant Fusion",
      description: "AI predicts optimal transition points and seamlessly blends your songs into one cohesive track."
    }
  ];

  const stats = [
    { number: "50K+", label: "Active Users" },
    { number: "1M+", label: "Songs Fused" },
    { number: "100+", label: "AI Templates" },
    { number: "4.9★", label: "User Rating" }
  ];

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Navigation */}
      <nav className="bg-gray-900/95 backdrop-blur-md border-b border-gray-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 via-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-cyan-500/30">
                <div className="w-5 h-5 bg-gradient-to-br from-white to-cyan-100 rounded-sm opacity-90"></div>
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
                  MySounds.ai
                </h1>
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-gray-300 hover:text-white transition-colors duration-200">Features</a>
              <a href="#pricing" className="text-gray-300 hover:text-white transition-colors duration-200">Pricing</a>
              <button
                onClick={onTryMixer}
                className="px-6 py-2 bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 hover:from-cyan-700 hover:via-blue-700 hover:to-purple-700 text-white rounded-lg font-medium transition-all duration-200 hover:shadow-lg hover:shadow-cyan-500/30"
              >
                Start Fusing
              </button>
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="text-gray-400 hover:text-white transition-colors duration-200"
              >
                {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <div className="md:hidden border-t border-gray-800 py-4">
              <div className="flex flex-col space-y-4">
                <a href="#features" className="text-gray-300 hover:text-white transition-colors duration-200">Features</a>
                <a href="#pricing" className="text-gray-300 hover:text-white transition-colors duration-200">Pricing</a>
                <button
                  onClick={onTryMixer}
                  className="w-full py-3 bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 hover:from-cyan-700 hover:via-blue-700 hover:to-purple-700 text-white rounded-lg font-medium transition-all duration-200"
                >
                  Start Fusing
                </button>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-900/20 via-blue-900/20 to-purple-900/20"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
          <div className="text-center space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold text-white leading-tight">
                A New Way to Play
                <span className="block bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
                  Your Playlist
                </span>
              </h1>
              <p className="text-xl sm:text-2xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
                Blend songs from your playlist using your favorite templates. Take full control of how your music flows together.
                Create the perfect soundtrack for any moment.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={onTryMixer}
                className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 hover:from-cyan-700 hover:via-blue-700 hover:to-purple-700 text-white rounded-xl font-semibold text-lg transition-all duration-200 hover:shadow-xl hover:shadow-cyan-500/30 flex items-center justify-center space-x-2"
              >
                <Play size={20} />
                <span>Start Your Flow</span>
              </button>
              <button className="w-full sm:w-auto px-8 py-4 bg-gray-800 hover:bg-gray-700 text-white border border-gray-600 hover:border-cyan-500/50 rounded-xl font-semibold text-lg transition-all duration-200 flex items-center justify-center space-x-2">
                <Layers size={20} />
                <span>Explore Templates</span>
              </button>
            </div>

            {/* Video Showcase */}
            <div className="pt-8">
              <p className="text-gray-400 text-sm mb-6">See MySounds.ai in action</p>
              <div className="relative max-w-4xl mx-auto">
                <div className="relative aspect-video bg-gray-800 rounded-2xl overflow-hidden border border-gray-700 group">
                  {/* Video Placeholder */}
                  <div className="absolute inset-0 bg-gradient-to-br from-cyan-900/30 via-blue-900/30 to-purple-900/30 flex items-center justify-center">
                    <div className="text-center space-y-4">
                      <div className="w-20 h-20 bg-gradient-to-br from-cyan-500 via-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto shadow-2xl shadow-cyan-500/50 group-hover:scale-110 transition-transform duration-300">
                        <Play size={32} className="text-white ml-1" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-white mb-2">Watch MySounds.ai Demo</h3>
                        <p className="text-gray-300">See AI predict perfect transitions between any two songs</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Video Element (will be replaced with actual video later) */}
                  <video 
                    className="absolute inset-0 w-full h-full object-cover opacity-0"
                    poster="https://images.pexels.com/photos/1763075/pexels-photo-1763075.jpeg?auto=compress&cs=tinysrgb&w=1200"
                    controls
                    preload="metadata"
                  >
                    {/* Video source will be added later */}
                    <source src="" type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>
                  
                  {/* Glassmorphism overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none"></div>
                  
                  {/* Video duration badge */}
                  <div className="absolute bottom-4 right-4 px-3 py-1 bg-black/70 backdrop-blur-sm text-white text-sm rounded-lg">
                    2:45
                  </div>
                </div>
                
                {/* Video description */}
                <div className="text-center mt-6 space-y-2">
                  <h4 className="text-lg font-semibold text-white">AI-Powered Song Fusion</h4>
                  <p className="text-gray-400 max-w-2xl mx-auto">
                    Watch how MySounds.ai intelligently combines any two songs using AI templates that predict the perfect transition points, creating seamless fusion tracks automatically.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust & Safety */}
      <section className="py-20 lg:py-32 bg-gray-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="glass-surface rounded-2xl p-8 lg:p-12 border border-cyan-500/10">
            <div className="flex items-center justify-center space-x-3 mb-6">
              <Shield size={32} className="text-cyan-500" />
              <h2 className="text-2xl lg:text-3xl font-bold text-white">Copyright & Safety</h2>
            </div>
            <div className="text-center space-y-4 max-w-3xl mx-auto">
              <p className="text-lg text-gray-300 leading-relaxed">
                MySounds.ai is a creative tool for personal and educational use. Please respect copyright laws
                and obtain proper licenses before using copyrighted material in commercial settings.
              </p>
              <p className="text-gray-400">
                We encourage responsible music fusion and support artists by promoting legal music consumption.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 lg:py-32">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8">
          <div className="space-y-4">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white">
              Ready to Fuse Your Tracks?
            </h2>
            <p className="text-xl text-gray-300">
              Join thousands of creators making unique song fusions with MySounds.ai
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={onTryMixer}
              className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-cyan-600 via-blue-600 to-purple-600 hover:from-cyan-700 hover:via-blue-700 hover:to-purple-700 text-white rounded-xl font-semibold text-lg transition-all duration-200 hover:shadow-xl hover:shadow-cyan-500/30 flex items-center justify-center space-x-2"
            >
              <Zap size={20} />
              <span>Start Fusing Free</span>
            </button>
            <button className="w-full sm:w-auto px-8 py-4 text-gray-300 hover:text-white transition-colors duration-200 flex items-center justify-center space-x-2">
              <Users size={20} />
              <span>Join Community</span>
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-800 border-t border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Brand */}
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 via-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-cyan-500/30">
                  <div className="w-5 h-5 bg-gradient-to-br from-white to-cyan-100 rounded-sm opacity-90"></div>
                </div>
                <h3 className="text-xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
                  MySounds.ai
                </h3>
              </div>
              <p className="text-gray-400">
                AI-powered song fusion made simple for everyone.
              </p>
              <div className="flex space-x-4">
                <a href="#" className="text-gray-400 hover:text-white transition-colors duration-200">
                  <Twitter size={20} />
                </a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors duration-200">
                  <Instagram size={20} />
                </a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors duration-200">
                  <Youtube size={20} />
                </a>
              </div>
            </div>

            {/* Product */}
            <div className="space-y-4">
              <h4 className="text-white font-semibold">Product</h4>
              <div className="space-y-2">
                <a href="#" className="block text-gray-400 hover:text-white transition-colors duration-200">Features</a>
                <a href="#" className="block text-gray-400 hover:text-white transition-colors duration-200">Pricing</a>
                <a href="#" className="block text-gray-400 hover:text-white transition-colors duration-200">API</a>
              </div>
            </div>

            {/* Support */}
            <div className="space-y-4">
              <h4 className="text-white font-semibold">Support</h4>
              <div className="space-y-2">
                <a href="#" className="block text-gray-400 hover:text-white transition-colors duration-200">Help Center</a>
                <a href="#" className="block text-gray-400 hover:text-white transition-colors duration-200">Community</a>
                <a href="#" className="block text-gray-400 hover:text-white transition-colors duration-200">Tutorials</a>
                <a href="#" className="block text-gray-400 hover:text-white transition-colors duration-200">Contact</a>
              </div>
            </div>

            {/* Legal */}
            <div className="space-y-4">
              <h4 className="text-white font-semibold">Legal</h4>
              <div className="space-y-2">
                <a href="#" className="block text-gray-400 hover:text-white transition-colors duration-200">Terms of Service</a>
                <a href="#" className="block text-gray-400 hover:text-white transition-colors duration-200">Privacy Policy</a>
                <a href="#" className="block text-gray-400 hover:text-white transition-colors duration-200">Cookie Policy</a>
                <a href="#" className="block text-gray-400 hover:text-white transition-colors duration-200">DMCA</a>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-700 mt-12 pt-8 flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
            <p className="text-gray-400 text-sm">
              © 2025 MySounds.ai. All rights reserved.
            </p>
            <div className="flex items-center space-x-2 text-gray-400 text-sm">
              <Globe size={16} />
              <span>Powered by AI • Made for music lovers</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;