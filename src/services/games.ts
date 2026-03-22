import { supabase } from '../lib/supabase';

export interface Game {
  id: string;
  title: string;
  description: string;
  cover_image?: string;
  category: string;
  author_id: string;
  author?: {
    username: string;
    avatar_url?: string;
  };
  likes_count: number;
  created_at: string;
  updated_at: string;
}

export const gamesService = {
  async getGames(params?: { category?: string; limit?: number; offset?: number }) {
    let query = supabase
      .from('games')
      .select(`
        *,
        author:profiles(username, avatar_url)
      `)
      .eq('published', true)
      .order('created_at', { ascending: false });

    if (params?.category) {
      query = query.eq('category', params.category);
    }

    if (params?.limit) {
      query = query.limit(params.limit);
    }

    if (params?.offset) {
      query = query.range(params.offset, params.offset + (params.limit || 10) - 1);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data as Game[];
  },

  async getGame(id: string) {
    const { data, error } = await supabase
      .from('games')
      .select(`
        *,
        author:profiles(username, avatar_url)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as Game;
  },

  async createGame(gameData: Partial<Game>) {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('games')
      .insert([
        {
          ...gameData,
          author_id: user.id,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return data as Game;
  },

  async updateGame(id: string, updates: Partial<Game>) {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('games')
      .update(updates)
      .eq('id', id)
      .eq('author_id', user.id)
      .select()
      .single();

    if (error) throw error;
    return data as Game;
  },

  async deleteGame(id: string) {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('games')
      .delete()
      .eq('id', id)
      .eq('author_id', user.id);

    if (error) throw error;
  },

  async likeGame(gameId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error('Not authenticated');

    const { data: existingLike } = await supabase
      .from('game_likes')
      .select('*')
      .eq('game_id', gameId)
      .eq('user_id', user.id)
      .single();

    if (existingLike) {
      await supabase
        .from('game_likes')
        .delete()
        .eq('game_id', gameId)
        .eq('user_id', user.id);
    } else {
      await supabase
        .from('game_likes')
        .insert([
          {
            game_id: gameId,
            user_id: user.id,
          },
        ]);
    }

    return !existingLike;
  },

  async getMyGames() {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('games')
      .select('*')
      .eq('author_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as Game[];
  },
};
