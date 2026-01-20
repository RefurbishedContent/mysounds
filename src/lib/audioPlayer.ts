class AudioPlayer {
  private audio: HTMLAudioElement | null = null;
  private currentUrl: string | null = null;

  play(url: string): void {
    if (this.currentUrl !== url) {
      this.stop();
      this.audio = new Audio(url);
      this.currentUrl = url;
    }

    if (this.audio) {
      this.audio.play().catch(error => {
        console.error('Error playing audio:', error);
      });
    }
  }

  pause(): void {
    if (this.audio) {
      this.audio.pause();
    }
  }

  stop(): void {
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
      this.audio = null;
      this.currentUrl = null;
    }
  }

  isPlaying(): boolean {
    return this.audio ? !this.audio.paused : false;
  }

  getCurrentUrl(): string | null {
    return this.currentUrl;
  }

  onEnded(callback: () => void): void {
    if (this.audio) {
      this.audio.addEventListener('ended', callback);
    }
  }

  setVolume(volume: number): void {
    if (this.audio) {
      this.audio.volume = Math.max(0, Math.min(1, volume));
    }
  }

  getCurrentTime(): number {
    return this.audio?.currentTime || 0;
  }

  getDuration(): number {
    return this.audio?.duration || 0;
  }

  seek(time: number): void {
    if (this.audio) {
      this.audio.currentTime = time;
    }
  }
}

export const audioPlayer = new AudioPlayer();
