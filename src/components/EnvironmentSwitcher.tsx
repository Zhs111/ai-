import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Globe, Check, AlertCircle, X } from 'lucide-react';

interface Environment {
  name: string;
  key: 'development' | 'staging' | 'production';
  color: string;
  apiUrl: string;
  description: string;
}

// 注意：以下URL需要替换为你实际部署的地址
// 开发环境：本地运行
// 测试环境：需要部署到Vercel/Render
// 生产环境：https://ai-nine-topaz.vercel.app

const environments: Environment[] = [
  {
    name: '开发环境',
    key: 'development',
    color: '#22c55e',
    apiUrl: 'http://localhost:3001/api',
    description: '本地开发调试',
  },
  {
    name: '测试环境',
    key: 'staging',
    color: '#f59e0b',
    apiUrl: 'https://staging-ai-game-api.onrender.com/api',
    description: '功能测试验证 (未部署)',
  },
  {
    name: '生产环境',
    key: 'production',
    color: '#ef4444',
    apiUrl: 'https://ai-game-api.onrender.com/api',
    description: '正式用户使用 (未部署)',
  },
];

// 前端部署地址映射
const frontendUrls: Record<string, string> = {
  development: 'http://localhost:3000',
  staging: '', // 需要填写你的测试环境Vercel地址
  production: 'https://ai-nine-topaz.vercel.app',
};

export default function EnvironmentSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentEnv, setCurrentEnv] = useState<Environment>(environments[0]);
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'error'>('checking');

  useEffect(() => {
    // 检测当前环境
    const hostname = window.location.hostname;
    if (hostname.includes('staging')) {
      setCurrentEnv(environments[1]);
    } else if (hostname.includes('vercel.app') && !hostname.includes('staging')) {
      setCurrentEnv(environments[2]);
    } else {
      setCurrentEnv(environments[0]);
    }

    // 检测API连接状态
    checkConnection();
  }, []);

  const checkConnection = async () => {
    setConnectionStatus('checking');
    try {
      const response = await fetch(`${currentEnv.apiUrl}/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      setConnectionStatus(response.ok ? 'connected' : 'error');
    } catch {
      setConnectionStatus('error');
    }
  };

  const switchEnvironment = (env: Environment) => {
    if (env.key === currentEnv.key) {
      setIsOpen(false);
      return;
    }

    // 检查目标环境是否已配置
    const targetUrl = frontendUrls[env.key];
    if (!targetUrl) {
      alert(`【${env.name}】尚未部署，无法切换。\n\n请先部署到对应环境后再试。`);
      return;
    }

    // 跳转到对应环境
    window.location.href = targetUrl;
  };

  // 只在开发/测试环境显示，或添加参数 ?env=show
  const shouldShow = () => {
    const urlParams = new URLSearchParams(window.location.search);
    return (
      currentEnv.key !== 'production' ||
      urlParams.get('env') === 'show' ||
      localStorage.getItem('showEnvSwitcher') === 'true'
    );
  };

  if (!shouldShow()) return null;

  return (
    <>
      {/* 悬浮按钮 */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 right-4 z-50 w-12 h-12 rounded-full shadow-lg flex items-center justify-center"
        style={{ backgroundColor: currentEnv.color }}
        title={`当前环境: ${currentEnv.name}`}
      >
        <Globe className="w-6 h-6 text-white" />
        {/* 状态指示点 */}
        <span
          className={`absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
            connectionStatus === 'connected'
              ? 'bg-green-500'
              : connectionStatus === 'error'
              ? 'bg-red-500'
              : 'bg-yellow-500 animate-pulse'
          }`}
        />
      </motion.button>

      {/* 弹窗 */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* 遮罩 */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
            />

            {/* 内容 */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed bottom-36 right-4 z-50 w-80 bg-white rounded-2xl shadow-2xl overflow-hidden"
            >
              {/* 头部 */}
              <div className="px-4 py-3 bg-gray-50 border-b flex items-center justify-between">
                <h3 className="font-bold text-gray-800">切换环境</h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 hover:bg-gray-200 rounded-full transition-colors"
                >
                  <X size={18} className="text-gray-500" />
                </button>
              </div>

              {/* 环境列表 */}
              <div className="p-2 space-y-1">
                {environments.map((env) => (
                  <button
                    key={env.key}
                    onClick={() => switchEnvironment(env)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${
                      currentEnv.key === env.key
                        ? 'bg-orange-50 border-2 border-orange-200'
                        : 'hover:bg-gray-50 border-2 border-transparent'
                    }`}
                  >
                    {/* 颜色指示 */}
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: env.color }}
                    />

                    {/* 信息 */}
                    <div className="flex-1 text-left">
                      <div className="font-semibold text-gray-800">{env.name}</div>
                      <div className="text-xs text-gray-500">{env.description}</div>
                    </div>

                    {/* 选中标记 */}
                    {currentEnv.key === env.key && (
                      <Check className="w-5 h-5 text-orange-500" />
                    )}
                  </button>
                ))}
              </div>

              {/* 底部信息 */}
              <div className="px-4 py-3 bg-gray-50 border-t">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <AlertCircle size={14} />
                  <span>点击环境即可切换</span>
                </div>
                <div className="mt-1 text-xs text-gray-400 truncate">
                  API: {currentEnv.apiUrl}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
