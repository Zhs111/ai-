/**
 * 环境配置文件
 * 定义开发、测试、生产三个环境的配置
 */

const environments = {
  // 开发环境 - 本地开发使用
  development: {
    name: '开发环境',
    frontend: {
      url: 'http://localhost:3000',
      apiUrl: 'http://localhost:3001/api',
    },
    backend: {
      url: 'http://localhost:3001',
      port: 3001,
    },
    supabase: {
      url: process.env.VITE_SUPABASE_URL || '',
      anonKey: process.env.VITE_SUPABASE_ANON_KEY || '',
    },
    features: {
      debug: true,
      analytics: false,
      errorReporting: false,
    },
  },

  // 测试环境 - 部署到测试服务器
  staging: {
    name: '测试环境',
    frontend: {
      url: 'https://staging-ai-game.vercel.app',
      apiUrl: 'https://staging-ai-game-api.onrender.com/api',
    },
    backend: {
      url: 'https://staging-ai-game-api.onrender.com',
      port: process.env.PORT || 3001,
    },
    supabase: {
      url: process.env.VITE_SUPABASE_URL || '',
      anonKey: process.env.VITE_SUPABASE_ANON_KEY || '',
    },
    features: {
      debug: true,
      analytics: false,
      errorReporting: true,
    },
  },

  // 生产环境 - 正式用户使用
  production: {
    name: '生产环境',
    frontend: {
      url: 'https://ai-game-platform.vercel.app',
      apiUrl: 'https://ai-game-api.onrender.com/api',
    },
    backend: {
      url: 'https://ai-game-api.onrender.com',
      port: process.env.PORT || 3001,
    },
    supabase: {
      url: process.env.VITE_SUPABASE_URL || '',
      anonKey: process.env.VITE_SUPABASE_ANON_KEY || '',
    },
    features: {
      debug: false,
      analytics: true,
      errorReporting: true,
    },
  },
};

// 获取当前环境配置
function getCurrentEnv() {
  const env = process.env.NODE_ENV || 'development';
  return environments[env] || environments.development;
}

module.exports = { environments, getCurrentEnv };
