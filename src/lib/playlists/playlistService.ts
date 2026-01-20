import { supabase } from '../supabase';

export interface Playlist {
  id: string;
  userId: string;
  name: string;
  description?: string;
  thumbnailUrl?: string;
  isPublic: boolean;
  trackCount: number;
  totalDuration: number;
  createdAt: string;
  updatedAt: string;
}

export interface PlaylistTrack {
  id: string;
  playlistId: string;
  uploadId: string;
  position: number;
  addedAt: string;
  upload?: any;
}

class PlaylistService {
  async getUserPlaylists(userId: string): Promise<Playlist[]> {
    const { data, error } = await supabase
      .from('playlists')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch playlists:', error);
      return [];
    }

    return data.map(this.mapPlaylistFromDb);
  }

  async getPlaylist(playlistId: string, userId: string): Promise<Playlist | null> {
    const { data, error } = await supabase
      .from('playlists')
      .select('*')
      .eq('id', playlistId)
      .eq('user_id', userId)
      .single();

    if (error || !data) return null;
    return this.mapPlaylistFromDb(data);
  }

  async createPlaylist(
    userId: string,
    name: string,
    description?: string
  ): Promise<Playlist | null> {
    const { data, error } = await supabase
      .from('playlists')
      .insert({
        user_id: userId,
        name,
        description,
        is_public: false,
        track_count: 0,
        total_duration: 0,
      })
      .select()
      .single();

    if (error || !data) return null;
    return this.mapPlaylistFromDb(data);
  }

  async updatePlaylist(
    playlistId: string,
    userId: string,
    updates: Partial<Playlist>
  ): Promise<Playlist | null> {
    const { data, error } = await supabase
      .from('playlists')
      .update({
        name: updates.name,
        description: updates.description,
        thumbnail_url: updates.thumbnailUrl,
        is_public: updates.isPublic,
        updated_at: new Date().toISOString(),
      })
      .eq('id', playlistId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error || !data) return null;
    return this.mapPlaylistFromDb(data);
  }

  async deletePlaylist(playlistId: string, userId: string): Promise<boolean> {
    const { error } = await supabase
      .from('playlists')
      .delete()
      .eq('id', playlistId)
      .eq('user_id', userId);

    return !error;
  }

  async getPlaylistTracks(playlistId: string): Promise<PlaylistTrack[]> {
    const { data, error } = await supabase
      .from('playlist_tracks')
      .select(`
        *,
        upload:uploads(*)
      `)
      .eq('playlist_id', playlistId)
      .order('position', { ascending: true });

    if (error) {
      console.error('Failed to fetch playlist tracks:', error);
      return [];
    }

    return data.map(track => ({
      id: track.id,
      playlistId: track.playlist_id,
      uploadId: track.upload_id,
      position: track.position,
      addedAt: track.added_at,
      upload: track.upload,
    }));
  }

  async addTrackToPlaylist(
    playlistId: string,
    uploadId: string,
    userId: string
  ): Promise<PlaylistTrack | null> {
    const tracks = await this.getPlaylistTracks(playlistId);
    const nextPosition = tracks.length;

    const { data, error } = await supabase
      .from('playlist_tracks')
      .insert({
        playlist_id: playlistId,
        upload_id: uploadId,
        position: nextPosition,
      })
      .select()
      .single();

    if (error || !data) return null;

    await this.updatePlaylistStats(playlistId);

    return {
      id: data.id,
      playlistId: data.playlist_id,
      uploadId: data.upload_id,
      position: data.position,
      addedAt: data.added_at,
    };
  }

  async removeTrackFromPlaylist(
    playlistId: string,
    trackId: string,
    userId: string
  ): Promise<boolean> {
    const { error } = await supabase
      .from('playlist_tracks')
      .delete()
      .eq('id', trackId)
      .eq('playlist_id', playlistId);

    if (!error) {
      await this.updatePlaylistStats(playlistId);
      await this.reorderPlaylistTracks(playlistId);
    }

    return !error;
  }

  async reorderPlaylistTracks(playlistId: string): Promise<void> {
    const tracks = await this.getPlaylistTracks(playlistId);

    for (let i = 0; i < tracks.length; i++) {
      await supabase
        .from('playlist_tracks')
        .update({ position: i })
        .eq('id', tracks[i].id);
    }
  }

  async updatePlaylistStats(playlistId: string): Promise<void> {
    const tracks = await this.getPlaylistTracks(playlistId);

    let totalDuration = 0;
    for (const track of tracks) {
      if (track.upload && track.upload.analysis) {
        totalDuration += track.upload.analysis.duration || 0;
      }
    }

    await supabase
      .from('playlists')
      .update({
        track_count: tracks.length,
        total_duration: totalDuration,
        updated_at: new Date().toISOString(),
      })
      .eq('id', playlistId);
  }

  private mapPlaylistFromDb(data: any): Playlist {
    return {
      id: data.id,
      userId: data.user_id,
      name: data.name,
      description: data.description,
      thumbnailUrl: data.thumbnail_url,
      isPublic: data.is_public,
      trackCount: data.track_count,
      totalDuration: data.total_duration,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }
}

export const playlistService = new PlaylistService();
