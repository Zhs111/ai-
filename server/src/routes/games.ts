import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase';
import { Game, GameNPC } from '../types';

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

router.get('/', async (req: Request, res: Response) => {
  try {
    const { category, status, limit = 20, offset = 0 } = req.query;

    let query = supabase
      .from('games')
      .select('*')
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (category) {
      query = query.eq('category', category as string);
    }
    if (status) {
      query = query.eq('status', status as string);
    }

    const { data: games, error } = await query;

    if (error) {
      return res.status(400).json({ 
        success: false, 
        error: error.message 
      });
    }

    const { count } = await supabase
      .from('games')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'published');

    res.json({
      success: true,
      data: games || [],
      total: count || 0
    });
  } catch (error: any) {
    console.error('Get games error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || '获取游戏列表失败' 
    });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { data: game, error } = await supabase
      .from('games')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !game) {
      return res.status(404).json({ 
        success: false, 
        error: '游戏不存在' 
      });
    }

    const { data: npcs } = await supabase
      .from('game_npcs')
      .select('*')
      .eq('game_id', id);

    res.json({
      success: true,
      data: { ...game, npcs }
    });
  } catch (error: any) {
    console.error('Get game error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || '获取游戏详情失败' 
    });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        error: '未授权' 
      });
    }

    const { 
      title, 
      description, 
      cover, 
      category, 
      tags, 
      plot, 
      gameplay, 
      player_identity, 
      game_goal, 
      status = 'draft',
      npcs 
    } = req.body;

    if (!title || !description || !category) {
      return res.status(400).json({ 
        success: false, 
        error: '标题、描述和分类是必填项' 
      });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('username, avatar_url')
      .eq('id', user.id)
      .single();

    const { data: game, error } = await supabase
      .from('games')
      .insert({
        title,
        description,
        cover: cover || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1000&auto=format&fit=crop',
        category,
        tags: tags || [],
        plot,
        gameplay,
        player_identity,
        game_goal,
        status,
        author_id: user.id,
        author_username: profile?.username || 'Unknown',
        author_avatar: profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`,
        plays: 0,
        likes: 0
      })
      .select()
      .single();

    if (error) {
      return res.status(400).json({ 
        success: false, 
        error: error.message 
      });
    }

    if (npcs && npcs.length > 0) {
      const npcsData = npcs.map((npc: Partial<GameNPC>) => ({
        game_id: game.id,
        name: npc.name,
        avatar: npc.avatar,
        card_image: npc.card_image,
        description: npc.description,
        personality: npc.personality,
        relationship: npc.relationship,
        background: npc.background
      }));

      await supabase.from('game_npcs').insert(npcsData);
    }

    res.json({
      success: true,
      data: game
    });
  } catch (error: any) {
    console.error('Create game error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || '创建游戏失败' 
    });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        error: '未授权' 
      });
    }

    const { id } = req.params;
    const updates = req.body;

    const { data: existingGame } = await supabase
      .from('games')
      .select('author_id')
      .eq('id', id)
      .single();

    if (!existingGame || existingGame.author_id !== user.id) {
      return res.status(403).json({ 
        success: false, 
        error: '无权限修改此游戏' 
      });
    }

    const { data: game, error } = await supabase
      .from('games')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
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
      data: game
    });
  } catch (error: any) {
    console.error('Update game error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || '更新游戏失败' 
    });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        error: '未授权' 
      });
    }

    const { id } = req.params;

    const { data: existingGame } = await supabase
      .from('games')
      .select('author_id')
      .eq('id', id)
      .single();

    if (!existingGame || existingGame.author_id !== user.id) {
      return res.status(403).json({ 
        success: false, 
        error: '无权限删除此游戏' 
      });
    }

    await supabase.from('game_npcs').delete().eq('game_id', id);
    
    const { error } = await supabase
      .from('games')
      .delete()
      .eq('id', id);

    if (error) {
      return res.status(400).json({ 
        success: false, 
        error: error.message 
      });
    }

    res.json({
      success: true
    });
  } catch (error: any) {
    console.error('Delete game error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || '删除游戏失败' 
    });
  }
});

router.post('/:id/like', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const { data: game, error } = await supabase
      .from('games')
      .select('likes')
      .eq('id', id)
      .single();

    if (error || !game) {
      return res.status(404).json({ 
        success: false, 
        error: '游戏不存在' 
      });
    }

    const { data: updatedGame, error: updateError } = await supabase
      .from('games')
      .update({ likes: game.likes + 1 })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return res.status(400).json({ 
        success: false, 
        error: updateError.message 
      });
    }

    res.json({
      success: true,
      data: updatedGame
    });
  } catch (error: any) {
    console.error('Like game error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || '点赞失败' 
    });
  }
});

export default router;
