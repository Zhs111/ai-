import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase';

const router = Router();

const getAuthUser = async (req: Request) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.split(' ')[1];
  const { data: { user } } = await supabase.auth.getUser(token);
  return user;
};

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !profile) {
      return res.status(404).json({ 
        success: false, 
        error: '用户不存在' 
      });
    }

    const { data: games } = await supabase
      .from('games')
      .select('*')
      .eq('author_id', id)
      .eq('status', 'published')
      .order('created_at', { ascending: false });

    res.json({
      success: true,
      data: {
        ...profile,
        games: games || []
      }
    });
  } catch (error: any) {
    console.error('Get profile error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || '获取用户资料失败' 
    });
  }
});

router.put('/', async (req: Request, res: Response) => {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        error: '未授权' 
      });
    }

    const { username, bio, avatar_url } = req.body;

    const updates: any = {
      updated_at: new Date().toISOString()
    };

    if (username) updates.username = username;
    if (bio !== undefined) updates.bio = bio;
    if (avatar_url) updates.avatar_url = avatar_url;

    const { data: profile, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ 
        success: false, 
        error: error.message 
      });
    }

    res.json({
      success: true,
      data: profile
    });
  } catch (error: any) {
    console.error('Update profile error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || '更新用户资料失败' 
    });
  }
});

router.get('/', async (req: Request, res: Response) => {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        error: '未授权' 
      });
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error || !profile) {
      return res.status(404).json({ 
        success: false, 
        error: '用户资料不存在' 
      });
    }

    const { data: games } = await supabase
      .from('games')
      .select('*')
      .eq('author_id', user.id)
      .order('created_at', { ascending: false });

    const { data: likedGames } = await supabase
      .from('game_likes')
      .select('game_id, games(*)')
      .eq('user_id', user.id);

    res.json({
      success: true,
      data: {
        ...profile,
        myGames: games || [],
        likedGames: likedGames?.map(l => l.games) || []
      }
    });
  } catch (error: any) {
    console.error('Get my profile error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || '获取用户资料失败' 
    });
  }
});

export default router;
