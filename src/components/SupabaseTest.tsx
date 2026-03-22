import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { authService } from '../services/auth';
import { gamesService } from '../services/games';

export default function SupabaseTest() {
  const [status, setStatus] = useState<'loading' | 'connected' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [games, setGames] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    testConnection();
  }, []);

  async function testConnection() {
    try {
      // 测试Supabase连接
      const { data, error } = await supabase.from('games').select('count');
      
      if (error) {
        setStatus('error');
        setMessage(`连接失败: ${error.message}`);
        return;
      }

      setStatus('connected');
      setMessage('Supabase连接成功！');

      // 获取游戏列表
      const gamesData = await gamesService.getGames({ limit: 5 });
      setGames(gamesData || []);

      // 检查当前用户
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
    } catch (err: any) {
      setStatus('error');
      setMessage(`错误: ${err.message}`);
    }
  }

  async function handleTestRegister() {
    try {
      const email = `test${Date.now()}@example.com`;
      const result = await authService.signUp(email, 'password123', '测试用户');
      setMessage(`注册成功: ${email}`);
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
    } catch (err: any) {
      setMessage(`注册失败: ${err.message}`);
    }
  }

  async function handleTestLogin() {
    try {
      await authService.signIn('test@example.com', 'password123');
      setMessage('登录成功');
      const currentUser = await authService.getCurrentUser();
      setUser(currentUser);
    } catch (err: any) {
      setMessage(`登录失败: ${err.message}`);
    }
  }

  async function handleLogout() {
    await authService.signOut();
    setUser(null);
    setMessage('已退出登录');
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Supabase 连接测试</h1>
      
      <div className={`p-4 rounded-lg mb-4 ${
        status === 'connected' ? 'bg-green-100 text-green-800' :
        status === 'error' ? 'bg-red-100 text-red-800' :
        'bg-yellow-100 text-yellow-800'
      }`}>
        <p className="font-semibold">
          状态: {status === 'loading' ? '连接中...' : status === 'connected' ? '已连接' : '连接失败'}
        </p>
        <p className="text-sm mt-1">{message}</p>
      </div>

      <div className="space-y-4 mb-6">
        <h2 className="font-semibold">用户测试</h2>
        <div className="flex gap-2">
          <button 
            onClick={handleTestRegister}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            测试注册
          </button>
          <button 
            onClick={handleTestLogin}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            测试登录
          </button>
          <button 
            onClick={handleLogout}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            退出
          </button>
        </div>
        {user && (
          <div className="p-3 bg-gray-100 rounded">
            <p className="text-sm">当前用户: {user.username || user.email}</p>
            <p className="text-xs text-gray-500">ID: {user.id}</p>
          </div>
        )}
      </div>

      <div>
        <h2 className="font-semibold mb-2">游戏列表 ({games.length})</h2>
        {games.length === 0 ? (
          <p className="text-gray-500">暂无游戏数据</p>
        ) : (
          <div className="space-y-2">
            {games.map((game) => (
              <div key={game.id} className="p-3 border rounded">
                <h3 className="font-medium">{game.title}</h3>
                <p className="text-sm text-gray-500">{game.category}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <button 
        onClick={testConnection}
        className="mt-6 px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
      >
        重新测试连接
      </button>
    </div>
  );
}
