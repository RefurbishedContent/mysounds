import React, { useState, useRef, useCallback } from 'react';
import { Music, X, AlertCircle, CheckCircle, Clock, Zap, Plus, Tag, CreditCard as Edit2 } from 'lucide-react';
import * as mm from 'music-metadata-browser';
import { storageService } from '../lib/storage';
import type { Track } from '../types/track';
import { useAuth } from '../contexts/AuthContext';
import { analyticsService, activityLogger, trackUploadSuccess } from '../lib/analytics';

interface AudioUploaderProps {
  onTracksReady: (trackA: Track, trackB: Track) => void;
}

interface PendingFile {
  file: File;
  slot: 'A' | 'B';
  title: string;
  artist: string;
  album: string;
}

interface SlotStatus {
  status: 'idle' | 'extracting' | 'confirming' | 'uploading' | 'processing' | 'ready' | 'error';
  track?: Track;
}

const SUPPORTED_FORMATS = ['.mp3', '.wav', '.flac', '.m4a', '.aac', '.ogg', '.aiff', '.aif'];

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function stripExtension(name: string): string {
  return name.replace(/\.[^/.]+$/, '');
}

const AudioUploader: React.FC<AudioUploaderProps> = ({ onTracksReady }) => {
  const { user } = useAuth();

  const [slotA, setSlotA] = useState<SlotStatus>({ status: 'idle' });
  const [slotB, setSlotB] = useState<SlotStatus>({ status: 'idle' });
  const [pending, setPending] = useState<PendingFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<{ A: number; B: number }>({ A: 0, B: 0 });

  const inputARef = useRef<HTMLInputElement>(null);
  const inputBRef = useRef<HTMLInputElement>(null);

  const setSlot = useCallback((slot: 'A' | 'B', update: Partial<SlotStatus>) => {
    if (slot === 'A') setSlotA(prev => ({ ...prev, ...update }));
    else setSlotB(prev => ({ ...prev, ...update }));
  }, []);

  const handleFileSelected = useCallback(async (file: File, slot: 'A' | 'B') => {
    if (!user) { setError('You must be signed in to upload files'); return; }

    try {
      storageService.validateFile(file);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Invalid file');
      return;
    }

    setError(null);
    setSlot(slot, { status: 'extracting' });

    let title = stripExtension(file.name);
    let artist = '';
    let album = '';

    try {
      const meta = await mm.parseBlob(file, { skipPostHeaders: true });
      title = meta.common.title ?? title;
      artist = meta.common.artist ?? meta.common.albumartist ?? '';
      album = meta.common.album ?? '';
    } catch {
      // ID3 extraction failed — defaults stay as-is
    }

    setSlot(slot, { status: 'confirming' });
    setPending({ file, slot, title, artist, album });
  }, [user, setSlot]);

  const confirmUpload = useCallback(async () => {
    if (!pending || !user) return;
    const { file, slot, title, artist, album } = pending;

    setPending(null);
    setSlot(slot, { status: 'uploading' });

    try {
      const track = await storageService.uploadTrack(
        file,
        user.id,
        { title, artist, album },
        (p) => setUploadProgress(prev => ({ ...prev, [slot]: p }))
      );

      setSlot(slot, { status: 'processing', track });

      const sub = storageService.subscribeToTrackUpdates(track.id, (status) => {
        if (status === 'ready') {
          const ready = { ...track, status: 'ready' as const };
          setSlot(slot, { status: 'ready', track: ready });
          sub.unsubscribe();

          setSlotA(currentA => {
            setSlotB(currentB => {
              const a = slot === 'A' ? ready : currentA.track;
              const b = slot === 'B' ? ready : currentB.track;
              if (a && b) onTracksReady(a, b);
              return currentB;
            });
            return currentA;
          });
        } else if (status === 'failed') {
          setSlot(slot, { status: 'error', track });
          sub.unsubscribe();
        }
      });

      await activityLogger.logUpload('completed', track.id, user.id, {
        filename: track.originalName,
        size: track.size,
        duration: track.durationMs / 1000,
        track: slot,
        mimeType: track.mimeType,
      });
      trackUploadSuccess(user.id, track.originalName, track.durationMs / 1000);
    } catch (err) {
      setSlot(slot, { status: 'error' });
      setError(err instanceof Error ? err.message : 'Upload failed');
      analyticsService.trackError(
        err instanceof Error ? err : new Error('Upload failed'),
        'file_upload',
        { filename: file.name, size: file.size, track: slot },
        user.id
      );
    }
  }, [pending, user, setSlot, onTracksReady]);

  const cancelPending = useCallback(() => {
    if (!pending) return;
    setSlot(pending.slot, { status: 'idle' });
    setPending(null);
  }, [pending, setSlot]);

  const removeSlot = useCallback((slot: 'A' | 'B') => {
    const current = slot === 'A' ? slotA : slotB;
    if (current.track && user) {
      storageService.deleteTrackAndAllAssets(current.track.id, user.id).catch(() => {});
    }
    setSlot(slot, { status: 'idle', track: undefined });
    setError(null);
  }, [slotA, slotB, setSlot, user]);

  const bothReady = slotA.status === 'ready' && slotB.status === 'ready';

  return (
    <div className="space-y-6 py-4">
      <div className="text-center space-y-3">
        <h2 className="text-3xl font-bold text-white">Upload Your Tracks</h2>
        <p className="text-gray-400">Upload two songs to create your professional DJ mix</p>
        <p className="text-sm text-gray-500">
          Supports: {SUPPORTED_FORMATS.join(', ')} &bull; Max 200MB each
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {(['A', 'B'] as const).map((slot) => {
          const s = slot === 'A' ? slotA : slotB;
          const inputRef = slot === 'A' ? inputARef : inputBRef;
          const accentFrom = slot === 'A' ? 'from-blue-600 to-cyan-600' : 'from-orange-600 to-red-600';
          const isIdle = s.status === 'idle';
          const isUploading = s.status === 'uploading';
          const isProcessing = s.status === 'processing';
          const isReady = s.status === 'ready';
          const isError = s.status === 'error';
          const isBusy = s.status === 'extracting' || s.status === 'confirming';

          let borderColor = 'border-gray-600 hover:border-cyan-500';
          let bgColor = 'bg-gray-800/50 hover:bg-cyan-900/10';
          if (isReady) { borderColor = 'border-green-500'; bgColor = 'bg-green-900/20'; }
          else if (isProcessing) { borderColor = 'border-yellow-500'; bgColor = 'bg-yellow-900/20'; }
          else if (isUploading || isBusy) { borderColor = 'border-cyan-500'; bgColor = 'bg-cyan-900/20'; }
          else if (isError) { borderColor = 'border-red-500'; bgColor = 'bg-red-900/20'; }

          return (
            <div key={slot} className="space-y-3">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 bg-gradient-to-r ${accentFrom} rounded-lg flex items-center justify-center`}>
                  <span className="text-white font-bold text-sm">{slot}</span>
                </div>
                <h3 className="text-lg font-semibold text-white">Track {slot}</h3>
                {s.track?.durationMs ? (
                  <span className="text-xs text-gray-400">({formatDuration(s.track.durationMs)})</span>
                ) : null}
              </div>

              <div className="relative">
                <input
                  ref={inputRef}
                  type="file"
                  accept={SUPPORTED_FORMATS.join(',')}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileSelected(f, slot);
                    e.target.value = '';
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  disabled={!isIdle}
                />

                <div
                  className={`relative w-full h-32 rounded-xl border-2 border-dashed transition-all duration-200 flex flex-col items-center justify-center gap-2 p-4 ${borderColor} ${bgColor} ${isIdle ? 'cursor-pointer' : 'cursor-default'}`}
                  onClick={() => isIdle && inputRef.current?.click()}
                >
                  {isIdle && (
                    <>
                      <Plus size={24} className="text-gray-400" />
                      <div className="text-center">
                        <p className="text-white text-sm font-medium">Upload Track {slot}</p>
                        <p className="text-gray-400 text-xs">Click to select audio file</p>
                      </div>
                    </>
                  )}

                  {isBusy && (
                    <>
                      <Tag size={22} className="text-cyan-400 animate-pulse" />
                      <p className="text-cyan-300 text-sm font-medium">Reading file tags...</p>
                    </>
                  )}

                  {isUploading && (
                    <>
                      <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                      <p className="text-cyan-300 text-sm font-medium">
                        Uploading... {uploadProgress[slot]}%
                      </p>
                      <div className="w-full bg-gray-700 rounded-full h-1">
                        <div
                          className="bg-cyan-500 h-1 rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgress[slot]}%` }}
                        />
                      </div>
                    </>
                  )}

                  {isProcessing && s.track && (
                    <>
                      <Clock size={22} className="text-yellow-400 animate-pulse" />
                      <div className="text-center">
                        <p className="text-white text-xs font-medium truncate max-w-[180px]">
                          {s.track.title || s.track.originalName}
                        </p>
                        <p className="text-yellow-300 text-xs">Analyzing audio...</p>
                      </div>
                    </>
                  )}

                  {isReady && s.track && (
                    <>
                      <CheckCircle size={22} className="text-green-500" />
                      <div className="text-center">
                        <p className="text-white text-xs font-medium truncate max-w-[180px]">
                          {s.track.title || s.track.originalName}
                        </p>
                        <p className="text-gray-400 text-xs">
                          {s.track.artist && <span>{s.track.artist} &bull; </span>}
                          {formatFileSize(s.track.size)} &bull; {formatDuration(s.track.durationMs)}
                        </p>
                      </div>
                    </>
                  )}

                  {isError && (
                    <>
                      <AlertCircle size={22} className="text-red-500" />
                      <p className="text-red-300 text-sm">Upload failed — click X to retry</p>
                    </>
                  )}

                  {!isIdle && (
                    <button
                      onClick={(e) => { e.stopPropagation(); removeSlot(slot); }}
                      className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-400 hover:bg-gray-800 rounded-lg transition-all"
                    >
                      <X size={15} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {pending && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div
            className="w-full max-w-md rounded-2xl border border-gray-700 shadow-2xl p-6 space-y-5"
            style={{ background: 'var(--bg-secondary)' }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                  <Edit2 size={16} className="text-cyan-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-sm">Confirm Track Info</h3>
                  <p className="text-gray-400 text-xs">Auto-filled from file tags — edit if needed</p>
                </div>
              </div>
              <button
                onClick={cancelPending}
                className="p-1.5 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-800/60">
              <Music size={18} className="text-gray-400 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-white text-sm truncate">{pending.file.name}</p>
                <p className="text-gray-500 text-xs">{formatFileSize(pending.file.size)}</p>
              </div>
            </div>

            <div className="space-y-3">
              {([
                { label: 'Title', key: 'title' as const, placeholder: 'Track title' },
                { label: 'Artist', key: 'artist' as const, placeholder: 'Artist name' },
                { label: 'Album', key: 'album' as const, placeholder: 'Album name (optional)' },
              ]).map(({ label, key, placeholder }) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-gray-400 mb-1">{label}</label>
                  <input
                    type="text"
                    value={pending[key]}
                    onChange={(e) =>
                      setPending(prev => prev ? { ...prev, [key]: e.target.value } : prev)
                    }
                    placeholder={placeholder}
                    className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-colors"
                  />
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={cancelPending}
                className="flex-1 py-2.5 rounded-xl border border-gray-600 text-gray-300 text-sm font-medium hover:bg-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmUpload}
                className="flex-1 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-semibold transition-colors"
              >
                Upload Track
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-center gap-3">
        {(['A', 'B'] as const).map((slot, i) => {
          const s = slot === 'A' ? slotA : slotB;
          const ready = s.status === 'ready';
          return (
            <React.Fragment key={slot}>
              {i === 1 && (
                <div className={`w-6 h-0.5 rounded-full ${bothReady ? 'bg-green-500' : 'bg-gray-600'}`} />
              )}
              <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${ready ? 'bg-green-900/30 text-green-300' : 'bg-gray-800/50 text-gray-400'}`}>
                {ready
                  ? <CheckCircle size={15} />
                  : <div className="w-4 h-4 border-2 border-gray-500 rounded-full" />}
                <span className="text-sm font-medium">Track {slot}</span>
              </div>
            </React.Fragment>
          );
        })}
      </div>

      {error && (
        <div className="flex items-start gap-3 p-4 bg-red-900/30 border border-red-700 rounded-xl text-red-300">
          <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {bothReady && slotA.track && slotB.track && (
        <div className="p-4 rounded-xl bg-green-900/20 border border-green-600 text-center space-y-2">
          <CheckCircle size={22} className="text-green-400 mx-auto" />
          <p className="text-green-300 font-semibold">Both tracks ready!</p>
          <p className="text-green-200 text-sm">
            A: {formatDuration(slotA.track.durationMs)} &bull; B: {formatDuration(slotB.track.durationMs)}
          </p>
          <div className="flex items-center justify-center gap-2 text-cyan-400 text-sm">
            <Zap size={14} /> <span>Ready to mix</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default AudioUploader;
