import { Router, Request, Response } from 'express';
import { supabase } from '../lib/supabase';
import { UserProfile } from '../types';

const router = Router();

router.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, username } = req.body;

    if (!email || !password || !username) {
      return res.status(400).json({ 
        success: false, 
        error: '邮箱、密码和用户名都是必填项' 
      });
    }

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username
        }
      }
    });

    if (authError) {
      return res.status(400).json({ 
        success: false, 
        error: authError.message 
      });
    }

    if (authData.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          email: authData.user.email,
          username,
          avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
          bio: '',
          updated_at: new Date().toISOString()
        });

      if (profileError) {
        console.error('Profile creation error:', profileError);
      }
    }

    res.json({
      success: true,
      data: {
        user: authData.user,
        session: authData.session
      }
    });
  } catch (error: any) {
    console.error('Register error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || '注册失败' 
    });
  }
});

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        error: '邮箱和密码都是必填项' 
      });
    }

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (authError) {
      return res.status(401).json({ 
        success: false, 
        error: authError.message 
      });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    res.json({
      success: true,
      data: {
        user: profile,
        session: authData.session
      }
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || '登录失败' 
    });
  }
});

router.post('/logout', async (req: Request, res: Response) => {
  try {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      return res.status(400).json({ 
        success: false, 
        error: error.message 
      });
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('Logout error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || '登出失败' 
    });
  }
});

router.get('/me', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        error: '未授权' 
      });
    }

    const token = authHeader.split(' ')[1];
    
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ 
        success: false, 
        error: '无效的令牌' 
      });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    res.json({
      success: true,
      data: profile
    });
  } catch (error: any) {
    console.error('Get user error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || '获取用户信息失败' 
    });
  }
});

export default router;
