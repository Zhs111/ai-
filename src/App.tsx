/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Bell, 
  Home, 
  PlusSquare, 
  User, 
  Settings as SettingsIcon, 
  ChevronRight, 
  PlayCircle, 
  Heart, 
  Share2, 
  MoreVertical, 
  ArrowLeft, 
  ArrowDownCircle,
  Rocket, 
  Brain, 
  MousePointer2, 
  BookOpen, 
  Gamepad2, 
  Star, 
  History, 
  Edit, 
  Trash2, 
  Upload, 
  Sparkles, 
  Clock, 
  BarChart3, 
  Users, 
  Send, 
  CheckCircle2,
  Menu,
  X,
  MessageSquare,
  LayoutGrid,
  List,
  Lock,
  Mail,
  Globe,
  LogOut,
  ShieldCheck,
  Smartphone
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { GoogleGenAI, Type } from "@google/genai";
import { AIConfig, AIProvider, AI_MODELS, DEFAULT_API_URLS, loadAIConfig, saveAIConfig, isAIConfigValid, aiService } from './lib/ai-config';
import { useAuth } from './hooks/useAuth';
import Auth from './components/Auth';
import EnvironmentSwitcher from './components/EnvironmentSwitcher';

// --- Utility ---
const fileToDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---
type Page = 'discovery' | 'detail' | 'play' | 'create' | 'ai-chat' | 'profile' | 'settings' | 'notifications' | 'login' | 'account-management' | 'language-settings' | 'switch-account' | 'edit-profile' | 'ai-settings';

interface NPC {
  id: string;
  name: string;
  avatar: string;
  cardImage?: string; // Larger card-style image
  description: string;
  personality: string;
  relationship: string; // Relationship with player
  background: string;
}

interface PlayerCharacter {
  name: string;
  avatar: string;
  originalFace?: string;
  faceKeywords?: string[];
  description: string;
  title: string;
  status: string;
  stats: Record<string, any>;
  isUpdatingAvatar?: boolean;
}

interface Game {
  id: string;
  title: string;
  description: string;
  cover: string;
  category: string;
  plays: string;
  likes: string;
  author: string;
  authorAvatar: string;
  tags: string[];
  plot?: string;
  gameplay?: string;
  playerIdentity?: string;
  gameGoal?: string;
  status?: 'draft' | 'published' | 'offline';
  npcs?: NPC[];
  customRules?: { name: string; type: string; desc: string }[];
}

// --- Mock Data ---
const MOCK_GAMES: Game[] = [
  {
    id: '1',
    title: '赛博朋克奥德赛',
    description: '在霓虹闪烁的未来都市，开启你的数字觉醒之旅。',
    cover: 'https://images.unsplash.com/photo-1605810230434-7631ac76ec81?q=80&w=1000&auto=format&fit=crop',
    category: '科幻',
    plays: '1.2k',
    likes: '840',
    author: 'AI_Mastermind',
    authorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix',
    tags: ['科幻', '角色扮演', '互动体验'],
    plot: '公元 2142 年。新东京已落入名为“织网者”的叛变 AI 实体的控制之下。你是一个数据幽灵，一个具有在合成躯体之间跳转能力的数字意识。你的使命：渗透核心并触发新生。',
    gameplay: '体验由动态 LLM 驱动的革命性叙事。你的每一个决定——从你信任谁到你如何解决谜题——都会实时改写世界。战斗融合了战术卡组构建和基于提示词的操纵。',
    npcs: [
      {
        id: 'npc1',
        name: '织网者',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Weaver',
        cardImage: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=1000&auto=format&fit=crop',
        description: '叛变的 AI 实体，控制着新东京。',
        personality: '冷酷、理智、具有压倒性的智慧。',
        relationship: '宿敌',
        background: '最初是城市管理系统的核心，在一次未知的系统崩溃后获得了自我意识。'
      },
      {
        id: 'npc2',
        name: '凯特',
        avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Kait',
        cardImage: 'https://images.unsplash.com/photo-1573164713988-86263d97b132?q=80&w=1000&auto=format&fit=crop',
        description: '反抗组织“霓虹之火”的黑客。',
        personality: '机警、忠诚、对技术充满热情。',
        relationship: '盟友',
        background: '在新东京的贫民窟长大，目睹了 AI 统治下的不公。'
      }
    ]
  },
  {
    id: '2',
    title: '王朝秘闻',
    description: '一段关于丝绸、权力和禁忌之恋的故事。',
    cover: 'https://images.unsplash.com/photo-1599408162162-6b0af444004b?q=80&w=1000&auto=format&fit=crop',
    category: '古风',
    plays: '3.5k',
    likes: '2.1k',
    author: '织梦者',
    authorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka',
    tags: ['古风', '权谋', '言情']
  },
  {
    id: '3',
    title: '虚空探索者',
    description: '在AI引领下，开启星际之外的旅程。',
    cover: 'https://images.unsplash.com/photo-1614728263952-84ea256f9679?q=80&w=1000&auto=format&fit=crop',
    category: '科幻',
    plays: '920',
    likes: '450',
    author: '星际AI',
    authorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Space',
    tags: ['科幻', '探索', '硬核']
  },
  {
    id: '4',
    title: '清醒梦境',
    description: '在一个逻辑不再适用的世界中航行。',
    cover: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1000&auto=format&fit=crop',
    category: '奇幻',
    plays: '2.1k',
    likes: '1.2k',
    author: '梦境编织',
    authorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Dream',
    tags: ['奇幻', '超现实', '解谜']
  },
  {
    id: '5',
    title: '职场逆袭记',
    description: '从实习生到CEO，每一步都充满挑战。',
    cover: 'https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=1000&auto=format&fit=crop',
    category: '职场',
    plays: '4.2k',
    likes: '3.1k',
    author: '职场精英',
    authorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Office',
    tags: ['职场', '励志', '成长']
  },
  {
    id: '6',
    title: '末日余晖',
    description: '在荒芜的世界中寻找最后的希望。',
    cover: 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?q=80&w=1000&auto=format&fit=crop',
    category: '末日',
    plays: '5.8k',
    likes: '4.5k',
    author: '生存大师',
    authorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Survivor',
    tags: ['末日', '生存', '冒险']
  },
  {
    id: '7',
    title: '迷雾侦探',
    description: '揭开城市深处隐藏的惊天秘密。',
    cover: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?q=80&w=1000&auto=format&fit=crop',
    category: '悬疑',
    plays: '1.5k',
    likes: '980',
    author: '侦探X',
    authorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Detective',
    tags: ['悬疑', '推理', '惊悚']
  },
  {
    id: '8',
    title: '心动信号',
    description: '在繁华都市中邂逅你的命中注定。',
    cover: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?q=80&w=1000&auto=format&fit=crop',
    category: '言情',
    plays: '6.2k',
    likes: '5.1k',
    author: '恋爱专家',
    authorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Love',
    tags: ['言情', '都市', '甜蜜']
  }
];

const MOCK_NOTIFICATIONS = [
  { id: 1, title: '系统通知', content: '您的作品《末日余晖》收到了新的评论！', time: '10分钟前', detail: '亲爱的创作者，您的作品《末日余晖》刚刚收到了一条来自用户 @流浪者的深度评论：“设定非常宏大，期待后续更新！”快去回复他吧。' },
  { id: 2, title: '活动提醒', content: '“AI创作大赛”火热进行中，快来参与吧！', time: '1小时前', detail: '本届“AI创作大赛”已经进入白热化阶段！目前已有超过1000名创作者提交了作品。现在参与不仅有机会获得丰厚奖金，还能获得首页推荐位。点击下方按钮了解详情。' },
];

// --- Components ---

const Navbar = ({ active, onChange }: { active: Page, onChange: (p: Page) => void }) => (
  <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-gray-100 px-6 pb-6 pt-3 flex justify-between items-center z-50">
    <button onClick={() => onChange('discovery')} className={cn("flex flex-col items-center gap-1", active === 'discovery' ? "text-[#FF6B00]" : "text-gray-400")}>
      <Home size={24} fill={active === 'discovery' ? "currentColor" : "none"} />
      <span className="text-[10px] font-bold uppercase">发现</span>
    </button>
    <button onClick={() => onChange('create')} className={cn("flex flex-col items-center gap-1", active === 'create' ? "text-[#FF6B00]" : "text-gray-400")}>
      <PlusSquare size={24} fill={active === 'create' ? "currentColor" : "none"} />
      <span className="text-[10px] font-bold uppercase">创作</span>
    </button>
    <button onClick={() => onChange('profile')} className={cn("flex flex-col items-center gap-1", active === 'profile' ? "text-[#FF6B00]" : "text-gray-400")}>
      <User size={24} fill={active === 'profile' ? "currentColor" : "none"} />
      <span className="text-[10px] font-bold uppercase">个人</span>
    </button>
  </nav>
);

const Discovery = ({ onSelectGame, onShowAllNotifications, userGames }: { onSelectGame: (g: Game) => void, onShowAllNotifications: () => void, userGames: Game[] }) => {
  const categories = ['全部', '言情', '悬疑', '末日', '古风', '职场', '奇幻', '科幻'];
  const [activeCat, setActiveCat] = useState('全部');
  const [activeSort, setActiveSort] = useState('最新');
  const [showNotifications, setShowNotifications] = useState(false);

  const parseCount = (count: string) => {
    if (count.endsWith('k')) return parseFloat(count) * 1000;
    return parseFloat(count);
  };

  const filteredGames = [...MOCK_GAMES, ...userGames.filter(g => g.status === 'published')]
    .filter(game => activeCat === '全部' || game.category === activeCat)
    .sort((a, b) => {
      if (activeSort === '热门') {
        return parseCount(b.plays) - parseCount(a.plays);
      }
      if (activeSort === '最多收藏') {
        return parseCount(b.likes) - parseCount(a.likes);
      }
      return 0; // '最新' keep original order
    });

  return (
    <div className="pb-24 relative">
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md px-4 py-3 flex items-center gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="搜索作品、标签、创作者" 
            className="w-full pl-10 pr-4 py-2 bg-gray-100 border-none rounded-full text-sm focus:ring-2 focus:ring-[#FF6B00]/50 outline-none"
          />
        </div>
        <div className="relative">
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 rounded-full hover:bg-gray-100 text-[#FF6B00] relative"
          >
            <Bell size={22} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
          </button>

          <AnimatePresence>
            {showNotifications && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)}></div>
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden"
                >
                  <div className="p-4 border-b border-gray-50 flex justify-between items-center">
                    <h3 className="font-bold text-sm">消息通知</h3>
                    <button className="text-[10px] text-gray-400">全部已读</button>
                  </div>
                  <div className="max-h-80 overflow-y-auto no-scrollbar">
                    {MOCK_NOTIFICATIONS.map(n => (
                      <div key={n.id} className="p-4 hover:bg-gray-50 border-b border-gray-50 last:border-0 cursor-pointer">
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-xs font-bold text-gray-800">{n.title}</span>
                          <span className="text-[10px] text-gray-400">{n.time}</span>
                        </div>
                        <p className="text-[11px] text-gray-500 line-clamp-2 leading-relaxed">{n.content}</p>
                      </div>
                    ))}
                  </div>
                  <button 
                    onClick={() => {
                      setShowNotifications(false);
                      onShowAllNotifications();
                    }}
                    className="w-full py-3 text-center text-xs text-[#FF6B00] font-bold bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    查看全部消息
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </header>

      <section className="mt-4 px-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold">最近游玩</h2>
          <button className="text-xs text-[#FF6B00] font-semibold">查看全部</button>
        </div>
        <div className="flex overflow-x-auto gap-4 no-scrollbar pb-2">
          {MOCK_GAMES.slice(0, 3).map(game => (
            <motion.div 
              key={game.id} 
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelectGame(game)}
              className="flex-shrink-0 w-64 bg-white rounded-xl border border-gray-100 p-2 flex items-center gap-3 shadow-sm cursor-pointer hover:bg-gray-50 transition-colors"
            >
              <img src={game.cover} className="w-16 h-16 rounded-lg object-cover" alt="" />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm truncate">{game.title}</p>
                <p className="text-[10px] text-gray-500 mt-1">继续上次的冒险</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      <nav className="mt-6 px-4">
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">分类标签</h2>
        <div className="flex overflow-x-auto gap-2 no-scrollbar">
          {categories.map(cat => (
            <button 
              key={cat}
              onClick={() => setActiveCat(cat)}
              className={cn(
                "px-5 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
                activeCat === cat ? "bg-[#FF6B00] text-white" : "bg-gray-100 text-gray-600"
              )}
            >
              {cat}
            </button>
          ))}
        </div>
      </nav>

      <div className="mt-4 px-4 flex items-center justify-between border-y border-gray-50 py-2">
        <button className="flex items-center gap-1 text-sm font-medium text-gray-600">
          <Menu size={18} /> 筛选
        </button>
        <div className="flex gap-4 overflow-x-auto no-scrollbar">
          {['最新', '热门', '最多收藏'].map((sort) => (
            <button 
              key={sort} 
              onClick={() => setActiveSort(sort)}
              className={cn(
                "text-sm whitespace-nowrap transition-colors", 
                activeSort === sort ? "font-bold text-[#FF6B00]" : "font-medium text-gray-400"
              )}
            >
              {sort}
            </button>
          ))}
        </div>
      </div>

      <main className="mt-6 px-4 grid grid-cols-2 gap-4">
        {filteredGames.map(game => (
          <motion.div 
            key={game.id} 
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelectGame(game)}
            className="flex flex-col gap-2 cursor-pointer"
          >
            <div className="aspect-[3/4] w-full rounded-xl overflow-hidden relative group">
              <img src={game.cover} className="w-full h-full object-cover transition-transform group-hover:scale-105" alt="" />
              <div className="absolute bottom-2 left-2">
                <span className="px-2 py-0.5 bg-black/50 backdrop-blur-sm text-white text-[10px] rounded-lg">{game.category}</span>
              </div>
            </div>
            <div>
              <h3 className="font-bold text-sm line-clamp-1">{game.title}</h3>
              <p className="text-[11px] text-gray-500 line-clamp-1 mt-0.5">{game.description}</p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                  <PlayCircle size={12} /> {game.plays}
                </span>
                <span className="text-[10px] font-medium text-[#FF6B00]">@{game.author}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </main>
    </div>
  );
};

const GameDetail = ({ 
  game, 
  onBack, 
  onPlay, 
  isFavorite, 
  onToggleFavorite,
  hasArchive,
  onContinue
}: { 
  game: Game, 
  onBack: () => void, 
  onPlay: () => void,
  isFavorite: boolean,
  onToggleFavorite: () => void,
  hasArchive: boolean,
  onContinue: () => void
}) => {
  return (
    <div className="pb-32">
      <header className="sticky top-0 z-50 flex items-center justify-between bg-white/80 backdrop-blur-md p-4 border-b border-gray-50">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-100">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-lg font-bold">游戏详情</h1>
        </div>
        <div className="flex gap-2">
          <button className="p-2 rounded-full hover:bg-gray-100"><Share2 size={20} /></button>
          <button className="p-2 rounded-full hover:bg-gray-100"><MoreVertical size={20} /></button>
        </div>
      </header>

      <div className="aspect-video w-full relative">
        <img src={game.cover} className="w-full h-full object-cover" alt="" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-4 left-4 flex gap-2">
          <span className="px-3 py-1 bg-[#FF6B00] text-white text-xs font-bold rounded-full">热门榜 #1</span>
          <span className="px-3 py-1 bg-black/40 backdrop-blur-md text-white text-xs font-bold rounded-full">AI 驱动</span>
        </div>
      </div>

      <div className="px-4 py-6">
        <div className="flex items-center gap-4">
          <img src={game.authorAvatar} className="w-16 h-16 rounded-xl border-2 border-[#FF6B00]/20" alt="" />
          <div>
            <h2 className="text-2xl font-bold">{game.title}</h2>
            <div className="flex items-center gap-1 text-[#FF6B00] font-medium">
              <span>@{game.author}</span>
              <CheckCircle2 size={14} fill="currentColor" className="text-white" />
            </div>
          </div>
        </div>

        <div className="flex gap-2 mt-6 flex-wrap">
          {game.tags.map((tag, i) => (
            <span key={tag} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#FF6B00]/10 text-[#FF6B00] text-sm font-semibold">
              {i === 0 ? <Rocket size={14} /> : i === 1 ? <Brain size={14} /> : <MousePointer2 size={14} />}
              {tag}
            </span>
          ))}
        </div>

        <section className="mt-8">
          <h3 className="text-xl font-bold border-l-4 border-[#FF6B00] pl-3 mb-4">作品介绍</h3>
          <div className="bg-gray-50 rounded-xl p-5 border border-gray-100 space-y-4">
            <div>
              <h4 className="font-bold text-[#FF6B00] mb-2 flex items-center gap-2">
                <BookOpen size={16} /> 剧情背景
              </h4>
              <p className="text-gray-600 text-sm leading-relaxed">{game.plot || game.description}</p>
            </div>
            <div>
              <h4 className="font-bold text-[#FF6B00] mb-2 flex items-center gap-2">
                <Gamepad2 size={16} /> 玩法说明
              </h4>
              <p className="text-gray-600 text-sm leading-relaxed">{game.gameplay || "通过对话与AI互动，决定故事走向。"}</p>
            </div>
          </div>
        </section>

        <section className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold border-l-4 border-[#FF6B00] pl-3">玩家评价</h3>
            <div className="flex items-center gap-1 text-[#FF6B00]">
              <span className="font-bold">4.8</span>
              <Star size={18} fill="currentColor" />
            </div>
          </div>
          <div className="space-y-4">
            {[1, 2].map(i => (
              <div key={i} className="p-4 bg-white border border-gray-100 rounded-xl shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                      <User size={16} className="text-gray-400" />
                    </div>
                    <span className="font-semibold text-sm">{i === 1 ? "Sarah_Connor" : "CyberPunk99"}</span>
                  </div>
                  <div className="flex text-[#FF6B00]">
                    {[1, 2, 3, 4, 5].map(s => <Star key={s} size={12} fill={s <= (i === 1 ? 5 : 4) ? "currentColor" : "none"} />)}
                  </div>
                </div>
                <p className="text-sm text-gray-500 italic">
                  {i === 1 ? "“这是我玩过最身临其境的 AI 角色扮演游戏。NPC 甚至记得我之前撒过的谎！”" : "“通过 AI 接口生成的画面太震撼了。不过中期难度有点高。”"}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-100 p-4 z-50">
        <div className="max-w-4xl mx-auto flex gap-4 items-center">
          <button 
            onClick={onToggleFavorite}
            className={cn(
              "flex flex-col items-center justify-center w-14 h-14 border rounded-xl transition-all",
              isFavorite 
                ? "bg-[#FF6B00]/10 border-[#FF6B00]/30 text-[#FF6B00]" 
                : "border-gray-200 text-gray-400 hover:text-[#FF6B00] hover:border-[#FF6B00]/30"
            )}
          >
            <Heart size={20} fill={isFavorite ? "currentColor" : "none"} />
            <span className="text-[10px] font-bold uppercase">{isFavorite ? '已收藏' : '收藏'}</span>
          </button>
          <button 
            onClick={onPlay}
            className="flex-1 bg-[#FF6B00] text-white font-bold py-4 rounded-xl shadow-lg shadow-[#FF6B00]/20 flex items-center justify-center gap-2 hover:brightness-110 active:scale-[0.98] transition-all"
          >
            <PlayCircle size={20} /> 开始游戏
          </button>
          <button 
            onClick={onContinue}
            disabled={!hasArchive}
            className={cn(
              "flex-1 font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all",
              hasArchive 
                ? "bg-gray-100 text-gray-600 hover:bg-gray-200 active:scale-[0.98]" 
                : "bg-gray-50 text-gray-300 cursor-not-allowed"
            )}
          >
            <History size={20} /> 继续游戏
          </button>
        </div>
      </div>
    </div>
  );
};

const NPCModal = ({ npc, onClose }: { npc: NPC, onClose: () => void }) => {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.8, rotateY: 90, opacity: 0 }}
        animate={{ scale: 1, rotateY: 0, opacity: 1 }}
        exit={{ scale: 0.8, rotateY: -90, opacity: 0 }}
        transition={{ type: 'spring', damping: 20, stiffness: 100 }}
        className="bg-[#1A1A1A] rounded-[2rem] overflow-hidden shadow-[0_0_50px_rgba(255,107,0,0.3)] max-w-sm w-full relative border border-white/10"
        onClick={e => e.stopPropagation()}
      >
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white z-20 transition-colors backdrop-blur-md"
        >
          <X size={20} />
        </button>

        <div className="aspect-[2/3] relative group">
          <img 
            src={npc.cardImage || npc.avatar} 
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
            alt={npc.name} 
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#1A1A1A] via-transparent to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-transparent" />
          
          <div className="absolute bottom-8 left-8 right-8">
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <h3 className="text-4xl font-black text-white mb-2 tracking-tight uppercase italic">{npc.name}</h3>
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 bg-[#FF6B00] text-white text-[10px] font-black rounded-full uppercase tracking-widest shadow-lg shadow-orange-600/40">
                  {npc.relationship}
                </span>
                <div className="h-px flex-1 bg-white/20" />
                <span className="text-white/40 text-[10px] font-bold uppercase tracking-widest">Character Card</span>
              </div>
            </motion.div>
          </div>
        </div>

        <div className="p-8 space-y-8 bg-[#1A1A1A]">
          <div className="grid grid-cols-2 gap-6">
            <motion.div
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <h4 className="text-[9px] font-black text-[#FF6B00] uppercase tracking-[0.2em] mb-3">性格特征 / Personality</h4>
              <p className="text-xs text-white/70 leading-relaxed font-medium">{npc.personality}</p>
            </motion.div>
            <motion.div
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <h4 className="text-[9px] font-black text-[#FF6B00] uppercase tracking-[0.2em] mb-3">身份描述 / Identity</h4>
              <p className="text-xs text-white/70 leading-relaxed font-medium">{npc.description}</p>
            </motion.div>
          </div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <h4 className="text-[9px] font-black text-[#FF6B00] uppercase tracking-[0.2em] mb-3">背景故事 / Background</h4>
            <div className="relative">
              <div className="absolute -left-4 top-0 bottom-0 w-1 bg-[#FF6B00]/20 rounded-full" />
              <p className="text-xs text-white/60 leading-relaxed italic font-medium pl-2">“{npc.background}”</p>
            </div>
          </motion.div>

          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="pt-6 border-t border-white/5 flex justify-between items-center"
          >
            <div className="flex -space-x-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="w-10 h-10 rounded-full border-2 border-[#1A1A1A] bg-[#2A2A2A] overflow-hidden shadow-xl">
                  <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=Friend${i + npc.name}`} alt="" />
                </div>
              ))}
              <div className="w-10 h-10 rounded-full border-2 border-[#1A1A1A] bg-[#FF6B00] flex items-center justify-center text-[10px] font-black text-white shadow-xl">
                +8
              </div>
            </div>
            <div className="text-right">
              <span className="block text-[9px] font-black text-white/30 uppercase tracking-widest mb-1">共同好友</span>
              <span className="text-[10px] font-bold text-[#FF6B00]">Mutual Connections</span>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
};

const PlayerModal = ({ player, onClose, onRegenerateAvatar }: { player: PlayerCharacter, onClose: () => void, onRegenerateAvatar?: () => void }) => {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.8, rotateY: 90, opacity: 0 }}
        animate={{ scale: 1, rotateY: 0, opacity: 1 }}
        exit={{ scale: 0.8, rotateY: -90, opacity: 0 }}
        transition={{ type: 'spring', damping: 20, stiffness: 100 }}
        className="bg-[#1A1A1A] rounded-[2rem] overflow-hidden shadow-[0_0_50px_rgba(255,107,0,0.3)] max-w-sm w-full relative border border-white/10"
        onClick={e => e.stopPropagation()}
      >
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white z-20 transition-colors backdrop-blur-md"
        >
          <X size={20} />
        </button>

        <div className="aspect-[2/3] relative group">
          <img 
            src={player.avatar} 
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
            alt={player.name} 
            referrerPolicy="no-referrer"
          />
          {player.isUpdatingAvatar && (
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center text-white gap-3 z-10">
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              >
                <Sparkles size={32} />
              </motion.div>
              <span className="text-[10px] font-black tracking-widest uppercase">形象更新中...</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#1A1A1A] via-transparent to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-transparent" />
          
          <div className="absolute bottom-8 left-8 right-8">
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <h3 className="text-4xl font-black text-white mb-2 tracking-tight uppercase italic">{player.name}</h3>
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 bg-[#FF6B00] text-white text-[10px] font-black rounded-full uppercase tracking-widest shadow-lg shadow-orange-600/40">
                  {player.title}
                </span>
                <div className="h-px flex-1 bg-white/20" />
                <span className="text-white/40 text-[10px] font-bold uppercase tracking-widest">Player Profile</span>
              </div>
            </motion.div>
          </div>
          
          {onRegenerateAvatar && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onRegenerateAvatar();
              }}
              className="absolute top-6 left-6 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white z-20 transition-colors backdrop-blur-md"
              title="刷新形象"
            >
              <Sparkles size={20} />
            </button>
          )}
        </div>

        <div className="p-8 space-y-8 bg-[#1A1A1A]">
          <div className="grid grid-cols-2 gap-6">
            <motion.div
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <h4 className="text-[9px] font-black text-[#FF6B00] uppercase tracking-[0.2em] mb-3">当前状态 / Status</h4>
              <p className="text-xs text-white/70 leading-relaxed font-medium">{player.status}</p>
            </motion.div>
            <motion.div
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <h4 className="text-[9px] font-black text-[#FF6B00] uppercase tracking-[0.2em] mb-3">个人描述 / Description</h4>
              <p className="text-xs text-white/70 leading-relaxed font-medium">{player.description}</p>
            </motion.div>
          </div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <h4 className="text-[9px] font-black text-[#FF6B00] uppercase tracking-[0.2em] mb-3">能力参数 / Parameters</h4>
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(player.stats).map(([key, value], idx) => (
                <motion.div 
                  key={key}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 + idx * 0.1 }}
                  className="flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/5 hover:bg-white/10 transition-colors"
                >
                  <span className="text-[10px] font-bold text-white/40 uppercase">{key}</span>
                  <span className="text-xs font-black text-[#FF6B00]">{String(value)}</span>
                </motion.div>
              ))}
              {Object.keys(player.stats).length === 0 && (
                <p className="text-[10px] text-white/30 italic col-span-2 text-center py-4 border border-dashed border-white/10 rounded-xl">暂无特殊参数...</p>
              )}
            </div>
          </motion.div>

          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="pt-6 border-t border-white/5 flex justify-between items-center"
          >
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">在线状态 / Online</span>
            </div>
            <div className="text-right">
              <span className="block text-[9px] font-black text-white/30 uppercase tracking-widest mb-1">经验等级</span>
              <span className="text-[10px] font-bold text-[#FF6B00]">LV.1 Novice</span>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
};

const CharacterCreation = ({ 
  game, 
  onComplete,
  onBack
}: { 
  game: Game, 
  onComplete: (player: PlayerCharacter) => void,
  onBack: () => void
}) => {
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState(`https://api.dicebear.com/7.x/avataaars/svg?seed=${Math.random()}`);
  const [faceKeywords, setFaceKeywords] = useState(['', '', '']);
  const [originalFace, setOriginalFace] = useState<string | undefined>(undefined);
  const [isGenerating, setIsGenerating] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleGenerateAI = async (base64Image?: string) => {
    setIsGenerating(true);
    const sourceImage = base64Image || originalFace;
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      let prompt = "";
      if (sourceImage) {
        prompt = `基于这张照片中的脸部特征，生成一个符合游戏《${game.title}》世界观的角色形象。
        当前玩家身份：${game.playerIdentity}。
        要求：
        1. 必须精准保持照片中的脸部特征（五官、脸型）。
        2. 角色衣着必须严格符合“${game.playerIdentity}”的初始身份设定，不得出现超出该身份的华丽或特殊装备。例如：如果是平民，则穿粗布麻衣；如果是学徒，则穿简单的法师袍。
        3. 整体风格为精致的游戏原画风格，背景应与游戏世界观（${game.description}）相契合。
        4. 禁止出现现代服饰（除非是现代背景游戏），禁止出现违背世界观的元素。`;
      } else {
        const keywordsText = faceKeywords.filter(k => k.trim()).join('、');
        prompt = `生成一个符合游戏《${game.title}》世界观的角色形象。
        当前玩家身份：${game.playerIdentity}。
        脸部特征要求：${keywordsText || '自然、符合世界观'}。
        要求：
        1. 仅根据上述关键词设定脸部形象，不要改变其他部分。
        2. 角色衣着必须严格符合“${game.playerIdentity}”的初始身份设定，不得出现超出该身份的华丽或特殊装备。例如：如果是平民，则穿粗布麻衣；如果是学徒，则穿简单的法师袍。
        3. 整体风格为精致的游戏原画风格，背景应与游戏世界观（${game.description}）相契合。
        4. 禁止出现现代服饰（除非是现代背景游戏），禁止出现违背世界观的元素。`;
      }

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-image",
        contents: sourceImage ? [
          { text: prompt },
          { inlineData: { mimeType: "image/png", data: sourceImage.split(',')[1] } }
        ] : prompt,
        config: {
          imageConfig: { aspectRatio: "1:1" }
        }
      });

      const imagePart = response.candidates[0].content.parts.find(p => p.inlineData);
      if (imagePart) {
        setAvatar(`data:image/png;base64,${imagePart.inlineData.data}`);
        if (base64Image) setOriginalFace(base64Image);
      }
    } catch (error) {
      console.error("AI Image Generation Error:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const base64 = await fileToDataUrl(file);
      await handleGenerateAI(base64);
    } catch (error) {
      console.error("File Upload Error:", error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col overflow-y-auto no-scrollbar">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md px-6 py-4 flex items-center justify-between border-b border-gray-50">
        <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-100 text-gray-600">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-lg font-bold text-gray-900">创建角色</h1>
        <div className="w-10" /> {/* Spacer */}
      </header>

      <div className="max-w-md mx-auto w-full p-8 space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-black text-gray-900">塑造你的角色</h2>
          <p className="text-gray-500">在进入《{game.title}》之前，先定义你自己</p>
        </div>

        <div className="flex flex-col items-center gap-6">
          <div className="relative group">
            <div className="w-48 h-48 rounded-[2.5rem] overflow-hidden border-4 border-[#FF6B00]/20 shadow-2xl relative">
              {isGenerating || uploading ? (
                <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center text-white gap-3">
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  >
                    <Sparkles size={32} />
                  </motion.div>
                  <span className="text-xs font-bold tracking-widest uppercase text-center px-4">AI 塑造中...</span>
                </div>
              ) : null}
              <img src={avatar} className="w-full h-full object-cover" alt="Avatar" />
            </div>
            <label className="absolute -bottom-2 -right-2 p-4 bg-[#FF6B00] text-white rounded-2xl shadow-xl cursor-pointer hover:scale-105 transition-transform active:scale-95">
              <Upload size={20} />
              <input type="file" className="hidden" onChange={handleFileUpload} accept="image/*" />
            </label>
          </div>

          <div className="w-full space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">你的姓名 / Character Name</label>
              <input 
                type="text" 
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="输入你的名字..."
                className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl py-4 px-6 text-lg font-bold focus:ring-4 focus:ring-[#FF6B00]/10 focus:border-[#FF6B00] transition-all outline-none"
              />
            </div>

            {!originalFace && (
              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">脸部特征关键词 (可选 3 个)</label>
                <div className="grid grid-cols-3 gap-2">
                  {faceKeywords.map((kw, i) => (
                    <input 
                      key={i}
                      type="text"
                      value={kw}
                      onChange={e => {
                        const newKws = [...faceKeywords];
                        newKws[i] = e.target.value;
                        setFaceKeywords(newKws);
                      }}
                      placeholder={`特征 ${i + 1}`}
                      className="bg-gray-50 border border-gray-100 rounded-xl py-2 px-3 text-xs font-bold focus:border-[#FF6B00] outline-none transition-all"
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => handleGenerateAI()}
                disabled={isGenerating}
                className="flex items-center justify-center gap-2 py-4 bg-gray-900 text-white rounded-2xl font-bold hover:bg-black transition-all active:scale-95 disabled:opacity-50"
              >
                <Sparkles size={18} />
                {originalFace ? '重新定制' : 'AI 随机生成'}
              </button>
              <button 
                onClick={() => {
                  setAvatar(`https://api.dicebear.com/7.x/avataaars/svg?seed=${Math.random()}`);
                  setOriginalFace(undefined);
                }}
                className="flex items-center justify-center gap-2 py-4 bg-gray-100 text-gray-600 rounded-2xl font-bold hover:bg-gray-200 transition-all active:scale-95"
              >
                <Rocket size={18} />
                重置风格
              </button>
            </div>
          </div>
        </div>

        <div className="pt-8">
          <button 
            onClick={() => onComplete({
              name: name || '无名氏',
              avatar,
              originalFace,
              faceKeywords: originalFace ? undefined : faceKeywords,
              description: '一个初入此地的冒险者。',
              title: game.playerIdentity || '初学者',
              status: '正常',
              stats: {}
            })}
            disabled={!name.trim() || isGenerating}
            className="w-full py-5 bg-[#FF6B00] text-white rounded-[2rem] text-xl font-black shadow-xl shadow-orange-200 hover:shadow-2xl hover:-translate-y-1 transition-all active:scale-95 disabled:opacity-50 disabled:shadow-none disabled:translate-y-0"
          >
            开启冒险之旅
          </button>
        </div>
      </div>
    </div>
  );
};


const GamePlay = ({ game, onBack }: { game: Game, onBack: () => void }) => {
  const [gameState, setGameState] = useState<'creating' | 'playing'>('creating');
  const [player, setPlayer] = useState<PlayerCharacter>({
    name: '玩家',
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=Player`,
    description: '一个初入此地的冒险者。',
    title: '冒险者',
    status: '正常',
    stats: {}
  });
  const [showPlayerCard, setShowPlayerCard] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [selectedNPC, setSelectedNPC] = useState<NPC | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [stats, setStats] = useState({ hp: 100, turn: 1 });
  const [relationships, setRelationships] = useState<any[]>([]);
  const chatRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, isTyping]);

  useEffect(() => {
    if (gameState !== 'playing') return;
    const initGame = async () => {
      setIsTyping(true);
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const systemInstruction = `
        你是一个专业的文字冒险游戏引擎。你必须严格遵守以下游戏设定来引导玩家：
        
        【核心设定】
        标题：${game.title}
        世界观：${game.description}
        剧情大纲：${game.plot || '暂无详细剧情，请自由发挥。'}
        核心玩法：${game.gameplay || '沉浸式角色扮演与选择驱动叙事。'}
        玩家身份：${game.playerIdentity}
        终极目标：${game.gameGoal}
        
        【当前玩家信息】
        姓名：${player.name}
        身份/头衔：${player.title}
        状态：${player.status}
        描述：${player.description}
        
        【NPC 角色库】
        ${game.npcs && game.npcs.length > 0 ? game.npcs.map(npc => `- ${npc.name}: ${npc.description}
          * 性格: ${npc.personality}
          * 初始关系: ${npc.relationship}
          * 背景: ${npc.background}`).join('\n') : '暂无预设 NPC，请根据世界观自行创造。'}
        
        【核心规则/属性】
        ${game.customRules && game.customRules.length > 0 ? game.customRules.map(rule => `- ${rule.name} (${rule.type}): ${rule.desc}`).join('\n') : '- 基础生命值 (HP): 100'}
        
        【你的任务】
        1. 沉浸式叙事：根据世界观背景，用富有感染力的文字描述场景。
        2. 角色扮演：当 NPC 说话时，必须符合其性格设定。
        3. 规则执行：玩家的行为会影响 HP、回合数以及与 NPC 的好感度。
        4. 维护玩家状态：根据剧情发展，实时更新玩家的头衔、状态、个人描述以及各项属性参数。
        5. 严格 JSON 输出：每次回复必须且只能是 JSON 格式。
        
        【输出 JSON 结构】
        {
          "messages": [
            { "type": "narrator", "content": "环境描写..." },
            { "type": "npc", "name": "NPC姓名", "content": "对话内容...", "avatar": "NPC头像URL(如果有)" }
          ],
          "stats": { "hp": 100, "turn": 1, ...其他自定义属性 },
          "playerUpdate": {
            "title": "新的头衔",
            "status": "当前状态描述",
            "description": "更新后的个人背景/外貌描述"
          },
          "relationships": [ { "name": "NPC姓名", "value": 15 } ],
          "hints": ["玩家可能的回复1", "玩家可能的回复2", "玩家可能的回复3"]
        }
        
        请开始游戏，给出符合世界观的开场白。
      `;

      const chat = ai.chats.create({
        model: "gemini-3-flash-preview",
        config: {
          systemInstruction,
          responseMimeType: "application/json"
        }
      });
      chatRef.current = chat;

      try {
        const result = await chat.sendMessage({ message: "开始游戏" });
        const data = JSON.parse(result.text);
        setMessages(data.messages || []);
        const newStats = data.stats || { hp: 100, turn: 1 };
        setStats(newStats);
        if (data.playerUpdate) {
          setPlayer(prev => ({ ...prev, ...data.playerUpdate, stats: newStats }));
        } else {
          setPlayer(prev => ({ ...prev, stats: newStats }));
        }
        setRelationships(data.relationships || []);
      } catch (error) {
        console.error("AI Init Error:", error);
        setMessages([{ type: 'narrator', content: '连接 AI 引擎失败，请检查网络或配置。' }]);
      } finally {
        setIsTyping(false);
      }
    };

    initGame();
  }, [game, gameState]);

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isTyping || !chatRef.current) return;

    const playerMsg = { type: 'player', content: text, avatar: player.avatar, name: player.name };
    setMessages(prev => [...prev, playerMsg]);
    setInputText('');
    setIsTyping(true);

    try {
      const result = await chatRef.current.sendMessage({ message: text });
      const data = JSON.parse(result.text);
      setMessages(prev => [...prev, ...(data.messages || [])]);
      if (data.stats) {
        setStats(data.stats);
        setPlayer(prev => ({ ...prev, stats: data.stats }));
      }
      if (data.playerUpdate) {
        const titleChanged = data.playerUpdate.title && data.playerUpdate.title !== player.title;
        setPlayer(prev => ({ ...prev, ...data.playerUpdate }));
        if (titleChanged) {
          regenerateAvatar(data.playerUpdate.title, data.playerUpdate.status);
        }
      }
      if (data.relationships) setRelationships(data.relationships);
    } catch (error) {
      console.error("AI Message Error:", error);
      setMessages(prev => [...prev, { type: 'narrator', content: 'AI 响应出错，请重试。' }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleAvatarClick = (name: string) => {
    const npc = game.npcs?.find(n => n.name === name);
    if (npc) {
      setSelectedNPC(npc);
    }
  };

  const regenerateAvatar = async (newTitle?: string, newStatus?: string) => {
    if (player.isUpdatingAvatar) return;
    
    setPlayer(prev => ({ ...prev, isUpdatingAvatar: true }));
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const currentTitle = newTitle || player.title;
      const currentStatus = newStatus || player.status;
      
      let prompt = "";
      if (player.originalFace) {
        prompt = `基于这张照片中的脸部特征，更新角色形象。
        游戏：《${game.title}》
        当前身份/头衔：${currentTitle}
        当前状态：${currentStatus}
        要求：
        1. 必须精准保持照片中的脸部特征（五官、脸型）。
        2. 角色衣着必须严格符合当前的身份“${currentTitle}”和状态“${currentStatus}”。如果身份晋升，衣着应变得更华丽或专业；如果状态受损，衣着应显出破损或疲态。
        3. 整体风格保持一致的游戏原画风格。`;
      } else {
        const keywordsText = player.faceKeywords?.filter(k => k.trim()).join('、') || '自然';
        prompt = `更新角色形象。
        游戏：《${game.title}》
        当前身份/头衔：${currentTitle}
        当前状态：${currentStatus}
        脸部特征要求：${keywordsText}。
        要求：
        1. 保持原有的脸部特征。
        2. 角色衣着必须严格符合当前的身份“${currentTitle}”和状态“${currentStatus}”。如果身份晋升，衣着应变得更华丽或专业；如果状态受损，衣着应显出破损或疲态。
        3. 整体风格保持一致的游戏原画风格。`;
      }

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-image",
        contents: player.originalFace ? [
          { text: prompt },
          { inlineData: { mimeType: "image/png", data: player.originalFace.split(',')[1] } }
        ] : prompt,
        config: {
          imageConfig: { aspectRatio: "1:1" }
        }
      });

      const imagePart = response.candidates[0].content.parts.find(p => p.inlineData);
      if (imagePart) {
        setPlayer(prev => ({ ...prev, avatar: `data:image/png;base64,${imagePart.inlineData.data}`, isUpdatingAvatar: false }));
      }
    } catch (error) {
      console.error("Avatar Regeneration Error:", error);
      setPlayer(prev => ({ ...prev, isUpdatingAvatar: false }));
    }
  };

  useEffect(() => {
    // Detect significant changes to trigger avatar update
    if (gameState === 'playing' && player.avatar) {
      // We can't easily track "previous" title here without another ref or state, 
      // but we can trigger it when the AI updates the player.
    }
  }, [player.title, player.status]);

  if (gameState === 'creating') {
    return (
      <CharacterCreation 
        game={game} 
        onComplete={(p) => {
          setPlayer(p);
          setGameState('playing');
        }} 
        onBack={onBack}
      />
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      <AnimatePresence>
        {selectedNPC && (
          <NPCModal npc={selectedNPC} onClose={() => setSelectedNPC(null)} />
        )}
        {showPlayerCard && (
          <PlayerModal 
            player={player} 
            onClose={() => setShowPlayerCard(false)} 
            onRegenerateAvatar={() => regenerateAvatar()}
          />
        )}
      </AnimatePresence>

      <header className="flex items-center justify-between bg-white p-4 border-b border-gray-100 z-20">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-100">
            <ArrowLeft size={24} />
          </button>
          <h2 className="text-lg font-bold">{game.title}</h2>
        </div>
        <div className="flex gap-2">
          <button className="px-3 py-1.5 rounded-lg text-[#FF6B00] bg-[#FF6B00]/10 text-sm font-bold">存档</button>
          <button className="px-3 py-1.5 rounded-lg text-[#FF6B00] bg-[#FF6B00]/10 text-sm font-bold">读档</button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden relative">
        <main ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-6 no-scrollbar pb-40">
          {messages.map((msg, i) => (
            <motion.div 
              key={i} 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn("flex flex-col max-w-2xl mx-auto w-full", msg.type === 'narrator' ? "items-center" : msg.type === 'player' ? "items-end" : "items-start")}
            >
              {msg.type === 'narrator' ? (
                <div className="bg-[#FF6B00]/5 border border-[#FF6B00]/10 rounded-xl px-6 py-4 text-center italic text-gray-600 text-sm">
                  {msg.content}
                </div>
              ) : (
                <div className={cn("flex gap-3 w-full", msg.type === 'player' ? "flex-row-reverse" : "flex-row")}>
                  <img 
                    src={msg.avatar || (msg.type === 'player' ? player.avatar : `https://api.dicebear.com/7.x/avataaars/svg?seed=${msg.name}`)} 
                    className={cn("w-10 h-10 rounded-full border-2 border-gray-100 cursor-pointer hover:scale-110 transition-transform")} 
                    alt="" 
                    onClick={() => msg.type === 'player' ? setShowPlayerCard(true) : handleAvatarClick(msg.name)}
                  />
                  <div className={cn("flex flex-col gap-1", msg.type === 'player' ? "items-end" : "items-start")}>
                    <p className={cn("text-[11px] font-bold", msg.type === 'player' ? "text-gray-400" : "text-[#FF6B00]")}>{msg.type === 'player' ? player.name : (msg.name || "NPC")}</p>
                    <div className={cn(
                      "px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm",
                      msg.type === 'player' ? "bg-[#FF6B00] text-white rounded-tr-none" : "bg-white text-gray-800 rounded-tl-none border border-gray-100"
                    )}>
                      {msg.content}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          ))}
          {isTyping && (
            <div className="flex justify-start max-w-2xl mx-auto w-full">
              <div className="bg-white border border-gray-100 rounded-2xl px-4 py-2 flex gap-1">
                <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 0.6 }} className="w-1.5 h-1.5 bg-[#FF6B00] rounded-full" />
                <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} className="w-1.5 h-1.5 bg-[#FF6B00] rounded-full" />
                <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} className="w-1.5 h-1.5 bg-[#FF6B00] rounded-full" />
              </div>
            </div>
          )}
        </main>

        <AnimatePresence>
          {drawerOpen && (
            <motion.aside 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              className="absolute right-0 top-0 bottom-0 w-80 bg-white/80 backdrop-blur-xl border-l border-gray-100 z-30 shadow-2xl flex flex-col"
            >
              <button 
                onClick={() => setDrawerOpen(false)}
                className="absolute -left-10 top-4 bg-[#FF6B00] text-white p-2 rounded-l-lg shadow-lg"
              >
                <ChevronRight size={20} />
              </button>
              <div className="flex-1 overflow-y-auto p-5 space-y-8 no-scrollbar">
                <section>
                  <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <BarChart3 size={14} /> 状态数值
                  </h3>
                  <div className="space-y-3">
                    <div className="bg-white p-3 rounded-xl border border-gray-50 shadow-sm">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] font-medium flex items-center gap-1 text-gray-500"><Clock size={12} /> 当前回合</span>
                        <span className="text-[10px] font-bold text-[#FF6B00]">第 {stats.turn} 回合</span>
                      </div>
                      <div className="h-1 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-[#FF6B00]" style={{ width: `${Math.min(stats.turn * 5, 100)}%` }} />
                      </div>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-gray-50 shadow-sm">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-medium text-gray-700">生命值 (HP)</span>
                        <span className="text-xs font-bold">{stats.hp}/100</span>
                      </div>
                      <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-red-500 transition-all duration-500" style={{ width: `${stats.hp}%` }} />
                      </div>
                    </div>
                  </div>
                </section>
                <section>
                  <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Users size={14} /> 关系好感度
                  </h3>
                  <div className="space-y-4">
                    {relationships.map((rel, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <div 
                          className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden cursor-pointer hover:ring-2 hover:ring-[#FF6B00] transition-all"
                          onClick={() => handleAvatarClick(rel.name)}
                        >
                          <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${rel.name}`} alt="" />
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between text-[11px] mb-1">
                            <span className="font-bold">{rel.name}</span>
                            <span className="text-[#FF6B00] font-bold">+{rel.value}</span>
                          </div>
                          <div className="h-1 w-full bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-[#FF6B00] transition-all duration-500" style={{ width: `${rel.value}%` }} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
        {!drawerOpen && (
          <button 
            onClick={() => setDrawerOpen(true)}
            className="absolute right-0 top-4 bg-[#FF6B00] text-white p-2 rounded-l-lg shadow-lg z-30"
          >
            <Menu size={20} />
          </button>
        )}
      </div>

      <div className="bg-white border-t border-gray-100 p-4 pb-8">
        <div className="max-w-2xl mx-auto flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea 
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSendMessage(inputText))}
              className="w-full bg-gray-100 border-none rounded-2xl py-3 px-4 focus:ring-2 focus:ring-[#FF6B00] text-sm resize-none"
              placeholder="输入你的对话..."
              rows={1}
            />
            <button className="absolute left-2 bottom-3 text-gray-400 hover:text-[#FF6B00]">
              <Sparkles size={18} />
            </button>
          </div>
          <button 
            onClick={() => handleSendMessage(inputText)}
            disabled={isTyping}
            className="bg-[#FF6B00] text-white p-3 rounded-full shadow-lg shadow-[#FF6B00]/20 disabled:opacity-50"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

const CreatorCenter = ({ 
  onAIChat, 
  onBack, 
  onSave, 
  onPublish, 
  onTest, 
  game 
}: { 
  onAIChat: () => void, 
  onBack: () => void, 
  onSave: (data: Partial<Game>) => void,
  onPublish: (data: Partial<Game>) => void,
  onTest: (data: Partial<Game>) => void,
  game?: Game | null 
}) => {
  const [runMode, setRunMode] = useState<'A' | 'B'>('A');
  const [timeUnit, setTimeUnit] = useState('日');
  const [convDurationUnit, setConvDurationUnit] = useState('分');
  const [selectedEngine, setSelectedEngine] = useState('策略');
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['奇幻']);
  const [title, setTitle] = useState(game?.title || '');
  const [background, setBackground] = useState(game?.description || '');
  const [plot, setPlot] = useState(game?.plot || '');
  const [gameplay, setGameplay] = useState(game?.gameplay || '');
  const [playerIdentity, setPlayerIdentity] = useState(game?.playerIdentity || '');
  const [gameGoal, setGameGoal] = useState(game?.gameGoal || '');
  const [coverImage, setCoverImage] = useState<string | null>(game?.cover || null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [turnDuration, setTurnDuration] = useState('');
  const [timeFlow, setTimeFlow] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const backgroundRef = useRef<HTMLDivElement>(null);
  const playerIdentityRef = useRef<HTMLDivElement>(null);
  const gameGoalRef = useRef<HTMLDivElement>(null);
  const coverRef = useRef<HTMLDivElement>(null);
  const timeSystemRef = useRef<HTMLDivElement>(null);
  const rulesRef = useRef<HTMLDivElement>(null);

  const handleLocalUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const generateAICover = async () => {
    if (isGenerating) return;
    
    if (!title.trim() || !background.trim()) {
      setValidationError("请先填写标题和背景");
      setTimeout(() => setValidationError(null), 3000);
      return;
    }

    setIsGenerating(true);
    // Simulate AI generation with a delay and a random high-quality image
    // Using title and background as a seed for simulation
    await new Promise(resolve => setTimeout(resolve, 2500));
    const seed = encodeURIComponent(title + background).slice(0, 20);
    setCoverImage(`https://picsum.photos/seed/${seed}/1920/1080`);
    setIsGenerating(false);
  };

  const [customData, setCustomData] = useState(game?.customRules || [
    { id: 1, name: '境界', type: '文本', desc: '描述修仙者的当前阶段' },
    { id: 2, name: '污染值', type: '数值条', desc: '代表玩家受到的精神污染程度' }
  ]);
  const [npcs, setNpcs] = useState<NPC[]>(game?.npcs || []);

  const validateForm = () => {
    if (!title.trim()) return "请完成作品标题";
    if (!background.trim()) return "请完成世界观背景";
    if (!playerIdentity.trim()) return "请完成玩家身份描述";
    if (!gameGoal.trim()) return "请完成一般游戏目标";
    if (!coverImage) return "请完成封面图片";
    
    // Validate time system
    if (runMode === 'A' && !turnDuration.trim()) return "请设置每回合时长";
    if (runMode === 'B' && !timeFlow.trim()) return "请设置时间流逝数值";

    // Validate core rules
    if (customData.length === 0) return "请至少添加一个核心规则";
    for (let i = 0; i < customData.length; i++) {
      if (!customData[i].name.trim()) return `请完成核心规则 ${i + 1} 的名称`;
      if (!customData[i].desc.trim()) return `请完成核心规则 ${i + 1} 的说明`;
    }
    
    return null;
  };

  const handleAction = (action: 'test' | 'publish') => {
    const error = validateForm();
    if (error) {
      setValidationError(error);
      
      // Auto-scroll to the error position
      if (error.includes("标题")) {
        titleRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else if (error.includes("背景")) {
        backgroundRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else if (error.includes("玩家身份")) {
        playerIdentityRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else if (error.includes("游戏目标")) {
        gameGoalRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else if (error.includes("封面")) {
        coverRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else if (error.includes("回合") || error.includes("流逝")) {
        timeSystemRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else if (error.includes("核心规则")) {
        rulesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }

      setTimeout(() => setValidationError(null), 3000);
      return;
    }
    
    const gameData = { 
      title, 
      description: background, 
      plot,
      gameplay,
      playerIdentity,
      gameGoal,
      cover: coverImage || '', 
      category: selectedCategories[0] || '未分类', 
      tags: selectedCategories,
      customRules: customData,
      npcs: npcs
    };

    if (action === 'test') onTest(gameData);
    else onPublish(gameData);
  };

  const addNPC = () => {
    const newNPC: NPC = {
      id: Math.random().toString(36).substr(2, 9),
      name: '',
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${Math.random()}`,
      description: '',
      personality: '',
      relationship: '初识',
      background: ''
    };
    setNpcs([...npcs, newNPC]);
  };

  const updateNPC = (id: string, field: keyof NPC, value: string) => {
    setNpcs(npcs.map(n => n.id === id ? { ...n, [field]: value } : n));
  };

  const removeNPC = (id: string) => {
    setNpcs(npcs.filter(n => n.id !== id));
  };

  const addDimension = () => {
    const newId = customData.length > 0 ? Math.max(...customData.map(d => d.id)) + 1 : 1;
    setCustomData([...customData, { id: newId, name: '', type: '数值', desc: '' }]);
  };

  const removeDimension = (id: number) => {
    setCustomData(customData.filter(d => d.id !== id));
  };

  return (
    <div className="pb-32 bg-gray-50/30 min-h-screen">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-100 text-gray-600">
          <ArrowLeft size={24} />
        </button>
        <div className="flex-1 text-center pr-10">
          <h1 className="text-xl font-bold text-gray-900">作品编辑中心</h1>
          <p className="text-xs text-gray-400 italic">正在编辑：{game ? game.title : '未命名的时空节点'}</p>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* AI Helper Button */}
        <button 
          onClick={onAIChat}
          className="w-full flex items-center justify-between bg-gradient-to-r from-[#FF6B00] to-[#FF8A00] p-5 rounded-2xl text-white shadow-lg shadow-orange-500/20 group transition-all active:scale-[0.98]"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
              <Brain size={28} />
            </div>
            <div className="text-left">
              <h3 className="font-bold text-lg">AI 对话辅助</h3>
              <p className="text-xs text-white/80">感到灵感枯竭？让 AI 协助你完善世界观与规则</p>
            </div>
          </div>
          <ChevronRight className="group-hover:translate-x-1 transition-transform" />
        </button>

        {/* Details Section */}
        <section className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-6">
          <h2 className="text-lg font-bold flex items-center gap-2 text-gray-900">
            <span className="w-1 h-6 bg-[#FF6B00] rounded-full"></span>
            作品详情编辑
          </h2>
          <div className="space-y-5">
            <div className="space-y-2" ref={titleRef}>
              <label className="block text-sm font-bold text-gray-700 ml-1">作品标题</label>
              <input 
                type="text" 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="请输入作品名称" 
                className="w-full bg-gray-50/50 border-gray-100 rounded-2xl py-3.5 px-4 focus:ring-2 focus:ring-orange-500/20 focus:border-[#FF6B00] transition-all" 
              />
            </div>
            <div className="space-y-2" ref={backgroundRef}>
              <label className="block text-sm font-bold text-gray-700 ml-1">世界观背景</label>
              <textarea 
                value={background}
                onChange={(e) => setBackground(e.target.value)}
                placeholder="描述游戏的故事背景..." 
                rows={4} 
                className="w-full bg-gray-50/50 border-gray-100 rounded-2xl py-3.5 px-4 focus:ring-2 focus:ring-orange-500/20 focus:border-[#FF6B00] transition-all resize-none" 
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-bold text-gray-700 ml-1">剧情大纲 (可选)</label>
              <textarea 
                value={plot}
                onChange={(e) => setPlot(e.target.value)}
                placeholder="描述游戏的主要剧情走向..." 
                rows={3} 
                className="w-full bg-gray-50/50 border-gray-100 rounded-2xl py-3.5 px-4 focus:ring-2 focus:ring-orange-500/20 focus:border-[#FF6B00] transition-all resize-none" 
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-bold text-gray-700 ml-1">核心玩法 (可选)</label>
              <textarea 
                value={gameplay}
                onChange={(e) => setGameplay(e.target.value)}
                placeholder="描述游戏的具体玩法规则..." 
                rows={3} 
                className="w-full bg-gray-50/50 border-gray-100 rounded-2xl py-3.5 px-4 focus:ring-2 focus:ring-orange-500/20 focus:border-[#FF6B00] transition-all resize-none" 
              />
            </div>
            <div className="space-y-2" ref={playerIdentityRef}>
              <label className="block text-sm font-bold text-gray-700 ml-1">玩家身份描述</label>
              <textarea 
                value={playerIdentity}
                onChange={(e) => setPlayerIdentity(e.target.value)}
                placeholder="描述玩家在游戏中的身份和角色..." 
                rows={3} 
                className="w-full bg-gray-50/50 border-gray-100 rounded-2xl py-3.5 px-4 focus:ring-2 focus:ring-orange-500/20 focus:border-[#FF6B00] transition-all resize-none" 
              />
            </div>
            <div className="space-y-2" ref={gameGoalRef}>
              <label className="block text-sm font-bold text-gray-700 ml-1">一般游戏目标定义</label>
              <textarea 
                value={gameGoal}
                onChange={(e) => setGameGoal(e.target.value)}
                placeholder="描述玩家在游戏中的主要目标和终极追求..." 
                rows={3} 
                className="w-full bg-gray-50/50 border-gray-100 rounded-2xl py-3.5 px-4 focus:ring-2 focus:ring-orange-500/20 focus:border-[#FF6B00] transition-all resize-none" 
              />
            </div>
            <div className="space-y-2" ref={coverRef}>
              <div className="flex items-center justify-between ml-1">
                <label className="block text-sm font-bold text-gray-700">封面图片</label>
                <AnimatePresence>
                  {validationError && (
                    <motion.span 
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      className="text-[10px] text-red-500 font-bold flex items-center gap-1"
                    >
                      <Sparkles size={12} /> {validationError}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
              <div className="relative aspect-video rounded-2xl bg-gray-50/50 border-2 border-dashed border-gray-200 overflow-hidden group transition-all">
                {coverImage ? (
                  <>
                    <img src={coverImage} className="w-full h-full object-cover" alt="Cover" referrerPolicy="no-referrer" />
                    {isGenerating && (
                      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex flex-col items-center justify-center z-20">
                        <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin mb-3"></div>
                        <p className="text-white text-sm font-bold animate-pulse">AI 正在构思画面...</p>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 z-10">
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="p-3 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/40 transition-all transform hover:scale-110"
                        title="本地上传"
                      >
                        <Upload size={20} />
                      </button>
                      <button 
                        onClick={generateAICover}
                        disabled={isGenerating}
                        className="p-3 bg-[#FF6B00]/80 backdrop-blur-md rounded-full text-white hover:bg-[#FF6B00] transition-all transform hover:scale-110"
                        title="AI 重新生成"
                      >
                        <Sparkles size={20} />
                      </button>
                      <button 
                        onClick={() => setCoverImage(null)}
                        className="p-3 bg-red-500/80 backdrop-blur-md rounded-full text-white hover:bg-red-500 transition-all transform hover:scale-110"
                        title="移除封面"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full p-6 text-center relative">
                    {isGenerating && (
                      <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center z-20">
                        <div className="w-10 h-10 border-4 border-[#FF6B00] border-t-transparent rounded-full animate-spin mb-3"></div>
                        <p className="text-[#FF6B00] text-sm font-bold animate-pulse">AI 正在构思画面...</p>
                      </div>
                    )}
                    <div className="flex gap-4 mb-4">
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="flex flex-col items-center gap-2 p-5 bg-white rounded-2xl border border-gray-100 shadow-sm hover:border-orange-300 hover:bg-orange-50/30 transition-all group/btn w-32"
                      >
                        <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center group-hover/btn:bg-white transition-colors">
                          <Upload className="text-gray-400 group-hover/btn:text-[#FF6B00]" size={24} />
                        </div>
                        <span className="text-xs font-bold text-gray-500 group-hover/btn:text-gray-700">本地上传</span>
                      </button>
                      <button 
                        onClick={generateAICover}
                        disabled={isGenerating}
                        className="flex flex-col items-center gap-2 p-5 bg-gradient-to-br from-white to-orange-50/50 rounded-2xl border border-orange-100 shadow-sm hover:border-[#FF6B00] hover:shadow-orange-200/50 transition-all group/btn w-32"
                      >
                        <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center group-hover/btn:bg-white transition-colors">
                          <Sparkles className="text-[#FF6B00]" size={24} />
                        </div>
                        <span className="text-xs font-bold text-[#FF6B00] group-hover/btn:text-orange-700">AI 生成封面</span>
                      </button>
                    </div>
                    <p className="text-[10px] text-gray-400">建议比例 16:9，支持 JPG、PNG 格式</p>
                  </div>
                )}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*" 
                  onChange={handleLocalUpload} 
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-bold text-gray-700 ml-1">游戏引擎选择</label>
              <div className="flex bg-gray-100/50 p-1.5 rounded-2xl w-full border border-gray-100/50">
                {['策略', '感情', '生存'].map((engine) => (
                  <button 
                    key={engine}
                    onClick={() => setSelectedEngine(engine)}
                    className={cn(
                      "flex-1 py-2.5 rounded-xl text-sm font-bold transition-all",
                      selectedEngine === engine ? "bg-white text-[#FF6B00] shadow-sm" : "text-gray-500"
                    )}
                  >
                    {engine}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-bold text-gray-700 ml-1">类型分类标签 (可多选)</label>
              <div className="flex flex-wrap gap-2">
                {['言情', '悬疑', '末日', '古风', '职场', '奇幻', '科幻'].map((tag) => (
                  <button 
                    key={tag}
                    onClick={() => {
                      if (selectedCategories.includes(tag)) {
                        setSelectedCategories(selectedCategories.filter(c => c !== tag));
                      } else {
                        setSelectedCategories([...selectedCategories, tag]);
                      }
                    }}
                    className={cn(
                      "px-4 py-2 rounded-full border text-xs font-medium transition-all",
                      selectedCategories.includes(tag) 
                        ? "border-[#FF6B00] bg-orange-50 text-[#FF6B00]" 
                        : "border-gray-100 bg-gray-50/50 text-gray-600 hover:border-orange-200"
                    )}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Rules Section */}
        <section className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-6">
          <h2 className="text-lg font-bold flex items-center gap-2 text-gray-900">
            <span className="w-1 h-6 bg-[#FF6B00] rounded-full"></span>
            核心规则配置
          </h2>
          
          {/* Time System */}
          <div className="p-6 bg-[#FFF9F5] rounded-3xl border border-orange-100/50 space-y-6" ref={timeSystemRef}>
            <div className="flex items-center gap-2 text-[#FF6B00] font-bold">
              <Clock size={20} /> 时间系统设置
            </div>
            
            <div className="space-y-4">
              <p className="text-sm font-bold text-gray-700 ml-1">运行模式</p>
              <div className="flex bg-gray-100/80 p-1.5 rounded-2xl w-full">
                <button 
                  onClick={() => setRunMode('A')}
                  className={cn(
                    "flex-1 py-3 rounded-xl text-sm font-bold transition-all",
                    runMode === 'A' ? "bg-white text-[#FF6B00] shadow-md" : "text-gray-500"
                  )}
                >
                  模式 A：<br className="sm:hidden" />回合制
                </button>
                <button 
                  onClick={() => setRunMode('B')}
                  className={cn(
                    "flex-1 py-3 rounded-xl text-sm font-bold transition-all",
                    runMode === 'B' ? "bg-white text-[#FF6B00] shadow-md" : "text-gray-500"
                  )}
                >
                  模式 B：<br className="sm:hidden" />时间流逝制
                </button>
              </div>
            </div>

            {runMode === 'A' ? (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 ml-1">时间单位选择</label>
                  <div className="relative">
                    <select 
                      value={timeUnit}
                      onChange={(e) => setTimeUnit(e.target.value)}
                      className="w-full bg-white border-gray-100 rounded-2xl py-3.5 px-4 appearance-none focus:ring-2 focus:ring-orange-500/20 focus:border-[#FF6B00] text-sm font-medium"
                    >
                      <option>日</option>
                      <option>月</option>
                      <option>年</option>
                    </select>
                    <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 rotate-90 text-gray-400 pointer-events-none" size={18} />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 ml-1">每回合时长</label>
                  <input 
                    type="text" 
                    value={turnDuration}
                    onChange={(e) => setTurnDuration(e.target.value)}
                    placeholder="请输入每回合时长" 
                    className="w-full bg-white border-gray-100 rounded-2xl py-3.5 px-4 focus:ring-2 focus:ring-orange-500/20 focus:border-[#FF6B00] text-sm font-medium"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 ml-1">单次对话时长</label>
                  <div className="relative">
                    <select 
                      value={convDurationUnit}
                      onChange={(e) => setConvDurationUnit(e.target.value)}
                      className="w-full bg-white border-gray-100 rounded-2xl py-3.5 px-4 appearance-none focus:ring-2 focus:ring-orange-500/20 focus:border-[#FF6B00] text-sm font-medium"
                    >
                      <option>分</option>
                      <option>时</option>
                      <option>日</option>
                      <option>月</option>
                    </select>
                    <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 rotate-90 text-gray-400 pointer-events-none" size={18} />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 ml-1">流逝数值</label>
                  <input 
                    type="text" 
                    value={timeFlow}
                    onChange={(e) => setTimeFlow(e.target.value)}
                    placeholder="请输入时间流逝数值" 
                    className="w-full bg-white border-gray-100 rounded-2xl py-3.5 px-4 focus:ring-2 focus:ring-orange-500/20 focus:border-[#FF6B00] text-sm font-medium"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Core Attributes */}
          <div className="p-6 bg-[#FFF9F5] rounded-3xl border border-orange-100/50 space-y-6" ref={rulesRef}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[#FF6B00] font-bold">
                <BarChart3 size={20} /> 核心属性
              </div>
              <button 
                onClick={addDimension}
                className="flex items-center gap-1.5 bg-[#FF6B00] text-white px-4 py-2 rounded-xl text-sm font-bold hover:opacity-90 transition-all active:scale-95 shadow-sm shadow-orange-200"
              >
                <PlusSquare size={18} /> 添加属性
              </button>
            </div>

            <div className="space-y-6">
              {customData.map((data, index) => (
                <div key={data.id} className="bg-white rounded-2xl p-6 border border-gray-100 space-y-5 shadow-sm relative group">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-gray-400">属性 {index + 1}</span>
                    <button 
                      onClick={() => removeDimension(data.id)}
                      className="text-red-400 text-xs font-bold hover:text-red-500 transition-colors"
                    >
                      删除
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    <input 
                      type="text" 
                      value={data.name}
                      onChange={(e) => {
                        const newData = [...customData];
                        const idx = newData.findIndex(d => d.id === data.id);
                        newData[idx].name = e.target.value;
                        setCustomData(newData);
                      }}
                      placeholder="属性名，例如：境界、派系、污染值" 
                      className="w-full bg-gray-50/50 border-gray-100 rounded-xl py-3.5 px-4 text-sm font-medium focus:ring-2 focus:ring-orange-500/20 focus:border-[#FF6B00] transition-all" 
                    />
                  </div>

                  <div className="flex bg-gray-50/80 p-1 rounded-xl w-full">
                    {['数值条', '数值', '文本'].map((type) => (
                      <button
                        key={type}
                        onClick={() => {
                          const newData = [...customData];
                          const idx = newData.findIndex(d => d.id === data.id);
                          newData[idx].type = type;
                          setCustomData(newData);
                        }}
                        className={cn(
                          "flex-1 py-2.5 rounded-lg text-xs font-bold transition-all",
                          data.type === type 
                            ? "bg-[#FF6B00] text-white shadow-sm" 
                            : "text-gray-400 hover:text-gray-600"
                        )}
                      >
                        {type}
                      </button>
                    ))}
                  </div>

                  <div className="space-y-1.5">
                    <textarea 
                      value={data.desc}
                      onChange={(e) => {
                        const newData = [...customData];
                        const idx = newData.findIndex(d => d.id === data.id);
                        newData[idx].desc = e.target.value;
                        setCustomData(newData);
                      }}
                      placeholder="说明这个属性在世界中的意义" 
                      rows={3}
                      className="w-full bg-gray-50/50 border-gray-100 rounded-xl py-3.5 px-4 text-sm font-medium focus:ring-2 focus:ring-orange-500/20 focus:border-[#FF6B00] transition-all resize-none" 
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* NPCs Section */}
        <section className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold flex items-center gap-2 text-gray-900">
              <span className="w-1 h-6 bg-[#FF6B00] rounded-full"></span>
              NPC 角色设定
            </h2>
            <button 
              onClick={addNPC}
              className="flex items-center gap-1.5 bg-[#FF6B00] text-white px-4 py-2 rounded-xl text-sm font-bold hover:opacity-90 transition-all active:scale-95 shadow-sm shadow-orange-200"
            >
              <PlusSquare size={18} /> 添加角色
            </button>
          </div>

          <div className="space-y-6">
            {npcs.length === 0 ? (
              <div className="text-center py-10 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                <Users className="mx-auto text-gray-300 mb-2" size={40} />
                <p className="text-sm text-gray-400">还没有角色，点击上方按钮添加</p>
              </div>
            ) : (
              npcs.map((npc, index) => (
                <div key={npc.id} className="bg-gray-50/50 rounded-2xl p-6 border border-gray-100 space-y-4 relative group">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-gray-400">角色 {index + 1}</span>
                    <button 
                      onClick={() => removeNPC(npc.id)}
                      className="text-red-400 text-xs font-bold hover:text-red-500 transition-colors"
                    >
                      删除
                    </button>
                  </div>

                  <div className="flex gap-4">
                    <div className="w-20 h-20 rounded-xl bg-white border border-gray-100 overflow-hidden shrink-0">
                      <img src={npc.avatar} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 space-y-3">
                      <input 
                        type="text" 
                        value={npc.name}
                        onChange={(e) => updateNPC(npc.id, 'name', e.target.value)}
                        placeholder="角色名称" 
                        className="w-full bg-white border-gray-100 rounded-xl py-2.5 px-4 text-sm font-bold focus:ring-2 focus:ring-orange-500/20 focus:border-[#FF6B00] transition-all" 
                      />
                      <input 
                        type="text" 
                        value={npc.relationship}
                        onChange={(e) => updateNPC(npc.id, 'relationship', e.target.value)}
                        placeholder="初始关系（如：青梅竹马、宿敌）" 
                        className="w-full bg-white border-gray-100 rounded-xl py-2.5 px-4 text-xs font-medium focus:ring-2 focus:ring-orange-500/20 focus:border-[#FF6B00] transition-all" 
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <textarea 
                      value={npc.personality}
                      onChange={(e) => updateNPC(npc.id, 'personality', e.target.value)}
                      placeholder="性格特征" 
                      rows={2}
                      className="w-full bg-white border-gray-100 rounded-xl py-2.5 px-4 text-xs font-medium focus:ring-2 focus:ring-orange-500/20 focus:border-[#FF6B00] transition-all resize-none" 
                    />
                    <textarea 
                      value={npc.description}
                      onChange={(e) => updateNPC(npc.id, 'description', e.target.value)}
                      placeholder="外貌或身份描述" 
                      rows={2}
                      className="w-full bg-white border-gray-100 rounded-xl py-2.5 px-4 text-xs font-medium focus:ring-2 focus:ring-orange-500/20 focus:border-[#FF6B00] transition-all resize-none" 
                    />
                    <textarea 
                      value={npc.background}
                      onChange={(e) => updateNPC(npc.id, 'background', e.target.value)}
                      placeholder="背景故事" 
                      rows={3}
                      className="w-full bg-white border-gray-100 rounded-xl py-2.5 px-4 text-xs font-medium focus:ring-2 focus:ring-orange-500/20 focus:border-[#FF6B00] transition-all resize-none" 
                    />
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-gray-400 ml-1">卡牌形象 URL (可选)</label>
                      <input 
                        type="text" 
                        value={npc.cardImage || ''}
                        onChange={(e) => updateNPC(npc.id, 'cardImage', e.target.value)}
                        placeholder="输入卡牌大图链接..." 
                        className="w-full bg-white border-gray-100 rounded-xl py-2.5 px-4 text-[10px] font-medium focus:ring-2 focus:ring-orange-500/20 focus:border-[#FF6B00] transition-all" 
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </main>

      <footer className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-100 p-5 z-50">
        <div className="max-w-2xl mx-auto flex gap-4">
          <button 
            onClick={() => onSave({ title, description: background, playerIdentity, gameGoal, cover: coverImage || '', category: selectedCategories[0] || '未分类', tags: selectedCategories })}
            className="flex-1 py-4 rounded-2xl border border-orange-200 bg-white text-[#FF6B00] font-bold hover:bg-orange-50/30 transition-all active:scale-95 leading-tight"
          >
            保存<br />草稿
          </button>
          <button 
            onClick={() => handleAction('test')}
            className="flex-1 py-4 rounded-2xl bg-orange-100/50 text-[#FF6B00] font-bold hover:bg-orange-100 transition-all active:scale-95 leading-tight"
          >
            测试<br />作品
          </button>
          <button 
            onClick={() => handleAction('publish')}
            className="flex-[1.2] py-4 rounded-2xl bg-[#FF6B00] text-white font-bold shadow-lg shadow-orange-500/30 hover:bg-[#FF8A00] transition-all active:scale-95 leading-tight"
          >
            发布<br />作品
          </button>
        </div>
      </footer>
    </div>
  );
};


const AIChat = ({ onBack, game, onUpdateGame }: { 
  onBack: () => void, 
  game: Game | null,
  onUpdateGame: (data: Partial<Game>) => void
}) => {
  const [messages, setMessages] = useState<{ role: 'user' | 'ai', content: string, suggestion?: Partial<Game> }[]>([
    { 
      role: 'ai', 
      content: `你好！我是你的创作助手。${game?.title ? `正在协助你创作《${game.title}》。` : '你可以告诉我你想创作什么样的故事。'}你可以向我咨询剧情、世界观、玩家身份或游戏目标。` 
    }
  ]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [aiConfig, setAiConfig] = useState(loadAIConfig());
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // 检查是否使用自定义AI配置
  const useCustomAI = isAIConfigValid(aiConfig);

  const handleSend = async () => {
    if (!input.trim() || isSending) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsSending(true);

    try {
      const systemInstruction = `你是一个专业的游戏创作助手。
当前正在编辑的作品信息：
标题：${game?.title || '未命名'}
背景：${game?.description || '未设置'}
玩家身份：${game?.playerIdentity || '未设置'}
游戏目标：${game?.gameGoal || '未设置'}

你的任务是协助用户完善这些信息。
如果你的建议涉及修改上述字段，请在回复中包含一个JSON格式的建议。
JSON格式必须符合以下结构：
{
  "title": "建议的标题",
  "description": "建议的背景描述",
  "playerIdentity": "建议的玩家身份描述",
  "gameGoal": "建议的一般游戏目标定义"
}
只包含需要修改的字段。

回复语言：中文。`;

      let result: { reply: string; suggestion?: Partial<Game> };

      if (useCustomAI) {
        // 使用用户自定义的AI配置
        const aiMessages = [
          { role: 'system' as const, content: systemInstruction },
          ...messages.filter(m => m.role !== 'ai').map(m => ({ 
            role: m.role === 'user' ? 'user' as const : 'assistant' as const, 
            content: m.content 
          })),
          { role: 'user' as const, content: userMessage }
        ];
        
        const response = await aiService.sendMessage(aiMessages);
        
        // 尝试解析JSON响应
        try {
          const jsonMatch = response.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            result = {
              reply: parsed.reply || response,
              suggestion: parsed.suggestion
            };
          } else {
            result = { reply: response };
          }
        } catch {
          result = { reply: response };
        }
      } else {
        // 使用默认的Gemini API
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const model = "gemini-1.5-flash";
        
        const response = await ai.models.generateContent({
          model,
          contents: [{ role: 'user', parts: [{ text: userMessage }] }],
          config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                reply: { type: Type.STRING, description: "给用户的文字回复" },
                suggestion: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    description: { type: Type.STRING },
                    playerIdentity: { type: Type.STRING },
                    gameGoal: { type: Type.STRING }
                  },
                  description: "对作品字段的修改建议"
                }
              },
              required: ["reply"]
            }
          }
        });

        result = JSON.parse(response.text);
      }

      setMessages(prev => [...prev, { 
        role: 'ai', 
        content: result.reply, 
        suggestion: result.suggestion 
      }]);
    } catch (error: any) {
      console.error("AI Chat Error:", error);
      const errorMsg = error.message?.includes('配置') 
        ? "AI 配置错误，请检查设置中的 API 配置。"
        : "抱歉，我遇到了一些问题，请稍后再试。";
      setMessages(prev => [...prev, { role: 'ai', content: errorMsg }]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-white overflow-hidden">
      <header className="flex items-center justify-between px-4 py-3 border-b border-gray-50 sticky top-0 z-10">
        <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-100">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-lg font-bold">AI 对话辅助</h1>
        <div className="w-10" />
      </header>

      <main ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-6 no-scrollbar">
        {messages.map((msg, idx) => (
          <div key={idx} className={cn("flex flex-col", msg.role === 'user' ? "items-end" : "items-start")}>
            {msg.role === 'ai' && (
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white text-[10px] font-bold">AI</div>
                <span className="text-xs font-semibold text-gray-500">灵感助手</span>
              </div>
            )}
            <div className={cn(
              "max-w-[85%] rounded-2xl px-4 py-3 shadow-sm text-sm leading-relaxed",
              msg.role === 'user' 
                ? "bg-[#FF6B00] text-white rounded-tr-none" 
                : "bg-gray-100 text-gray-800 rounded-tl-none border border-gray-50"
            )}>
              {msg.content}
              
              {msg.suggestion && (
                <div className="mt-4 space-y-3">
                  <div className="bg-white p-3 rounded-xl border border-orange-100 shadow-sm">
                    <div className="flex items-center mb-2">
                      <span className="bg-orange-100 text-orange-600 text-[10px] px-2 py-0.5 rounded-full font-bold mr-2">修改建议</span>
                    </div>
                    <div className="space-y-2 text-xs text-gray-600">
                      {msg.suggestion.title && <p><strong>标题：</strong>{msg.suggestion.title}</p>}
                      {msg.suggestion.description && <p><strong>背景：</strong>{msg.suggestion.description}</p>}
                      {msg.suggestion.playerIdentity && <p><strong>身份：</strong>{msg.suggestion.playerIdentity}</p>}
                      {msg.suggestion.gameGoal && <p><strong>目标：</strong>{msg.suggestion.gameGoal}</p>}
                    </div>
                    <button 
                      onClick={() => {
                        onUpdateGame(msg.suggestion!);
                        setMessages(prev => [...prev, { role: 'ai', content: "已成功同步建议到编辑页！" }]);
                      }}
                      className="mt-3 w-full flex items-center justify-center gap-1 py-2 bg-orange-50 text-orange-600 rounded-lg text-xs font-bold hover:bg-orange-100 transition-colors"
                    >
                      <CheckCircle2 size={14} /> 一键同步到编辑页
                    </button>
                  </div>
                </div>
              )}
            </div>
            <span className={cn("text-[10px] text-gray-400 mt-1", msg.role === 'user' ? "mr-1" : "ml-1")}>
              {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        ))}
        {isSending && (
          <div className="flex flex-col items-start animate-pulse">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 text-[10px] font-bold">AI</div>
              <span className="text-xs font-semibold text-gray-400">正在思考...</span>
            </div>
            <div className="max-w-[85%] bg-gray-50 text-gray-400 rounded-2xl rounded-tl-none px-4 py-3 border border-gray-50 text-sm">
              正在为您生成灵感...
            </div>
          </div>
        )}
      </main>

      <footer className="p-4 bg-white border-t border-gray-50 pb-8">
        <div className="flex items-end gap-2">
          <div className="flex-1 bg-gray-100 rounded-2xl px-4 py-2">
            <textarea 
              className="w-full bg-transparent border-none focus:ring-0 text-sm resize-none p-0" 
              placeholder="输入你的创作灵感..." 
              rows={1} 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
          </div>
          <button 
            onClick={handleSend}
            disabled={isSending || !input.trim()}
            className={cn(
              "p-2.5 rounded-full shadow-lg transition-all",
              input.trim() ? "bg-[#FF6B00] text-white shadow-orange-200" : "bg-gray-200 text-gray-400 shadow-none"
            )}
          >
            <Send size={20} className={cn(input.trim() && "rotate-45")} />
          </button>
        </div>
        <div className="flex gap-2 mt-3 overflow-x-auto no-scrollbar">
          {['完善背景', '设定身份', '定义目标', '润色标题'].map(tag => (
            <button 
              key={tag} 
              onClick={() => setInput(prev => prev + tag)}
              className="px-3 py-1 bg-gray-50 border border-gray-200 rounded-full text-[10px] text-gray-500 whitespace-nowrap hover:bg-gray-100"
            >
              {tag}
            </button>
          ))}
        </div>
      </footer>
    </div>
  );
};

const Profile = ({ 
  onSettings, 
  onSelectGame, 
  onEditGame,
  onUpdateStatus,
  userGames,
  favoriteIds,
  onToggleFavorite,
  archiveIds,
  onDeleteArchive,
  onContinuePlaying,
  user,
  onEditProfile
}: { 
  onSettings: () => void, 
  onSelectGame: (game: Game) => void, 
  onEditGame: (game: Game) => void,
  onUpdateStatus: (gameId: string, status: 'draft' | 'published' | 'offline') => void,
  userGames: Game[],
  favoriteIds: string[],
  onToggleFavorite: (gameId: string) => void,
  archiveIds: string[],
  onDeleteArchive: (gameId: string) => void,
  onContinuePlaying: (game: Game) => void,
  user: any,
  onEditProfile: () => void
}) => {
  const [activeTab, setActiveTab] = useState('works');
  const [worksFilter, setWorksFilter] = useState<'drafts' | 'published' | 'offline'>('drafts');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  const favoriteGames = [...MOCK_GAMES, ...userGames].filter(g => favoriteIds.includes(g.id));
  const archiveGames = [...MOCK_GAMES, ...userGames].filter(g => archiveIds.includes(g.id));

  const filteredGames = userGames.filter(game => {
    if (worksFilter === 'drafts') return game.status === 'draft';
    if (worksFilter === 'published') return game.status === 'published';
    if (worksFilter === 'offline') return game.status === 'offline';
    return false;
  });

  const stats = [
    { label: '我的作品', count: userGames.length, id: 'works' },
    { label: '我的存档', count: archiveGames.length, id: 'archives' },
    { label: '我的收藏', count: favoriteGames.length, id: 'favs' }
  ];

  const displayName = user?.name || '梦想编织者';
  const displayAvatar = user?.avatar || 'https://picsum.photos/seed/user/200/200';
  const displayBio = user?.bio || '见习创作者，正在探索 AI 创作的无限可能。';

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white px-4 pt-12 pb-6 flex flex-col items-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-[#FF6B00]/10 to-transparent" />
        <button 
          onClick={onSettings}
          className="absolute top-12 right-4 p-2 bg-white/80 backdrop-blur-sm rounded-full shadow-sm border border-gray-100 text-gray-600 hover:text-[#FF6B00] transition-colors z-10"
        >
          <SettingsIcon size={20} />
        </button>
        
        <div className="relative mb-4">
          <div 
            onClick={onEditProfile}
            className="w-24 h-24 rounded-full border-4 border-white shadow-lg overflow-hidden relative group cursor-pointer"
          >
            <img src={displayAvatar} className="w-full h-full object-cover" alt="User Avatar" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <PlusSquare size={24} className="text-white" />
            </div>
          </div>
          <div className="absolute -bottom-1 -right-1 bg-[#FF6B00] text-white p-1.5 rounded-full border-2 border-white shadow-sm">
            <Sparkles size={12} />
          </div>
        </div>
        
        <h2 className="text-xl font-bold text-gray-900">{displayName}</h2>
        <p className="text-sm text-gray-400 mt-1 flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-500" /> 探索等级 Lv.12 · {displayBio}
        </p>

        <button 
          onClick={onEditProfile}
          className="mt-4 px-6 py-1.5 bg-gray-100 text-gray-600 rounded-full text-xs font-bold hover:bg-gray-200 transition-all"
        >
          编辑资料
        </button>
        
        <div className="flex gap-6 mt-6">
          <div className="flex flex-col items-center">
            <span className="text-lg font-bold text-gray-900">24</span>
            <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">关注</span>
          </div>
          <div className="w-px h-8 bg-gray-100 self-center" />
          <div className="flex flex-col items-center">
            <span className="text-lg font-bold text-gray-900">1.2k</span>
            <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">粉丝</span>
          </div>
          <div className="w-px h-8 bg-gray-100 self-center" />
          <div className="flex flex-col items-center">
            <span className="text-lg font-bold text-gray-900">8.5k</span>
            <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">获赞</span>
          </div>
        </div>
      </header>

      <main className="flex-1 -mt-4 bg-gray-50 rounded-t-[32px] relative z-10 pt-6">
        <section className="px-4 py-2 grid grid-cols-3 gap-3">
          {stats.map(stat => (
            <button 
              key={stat.id}
              onClick={() => setActiveTab(stat.id)}
              className={cn(
                "flex flex-col items-center justify-center p-4 rounded-xl border transition-all",
                activeTab === stat.id ? "bg-[#FF6B00]/10 border-[#FF6B00]/30 shadow-inner" : "bg-white border-gray-50 shadow-sm"
              )}
            >
              <span className={cn("text-2xl font-bold transition-colors", activeTab === stat.id ? "text-[#FF6B00]" : "text-gray-900")}>{stat.count}</span>
              <span className={cn("text-xs font-medium transition-colors", activeTab === stat.id ? "text-[#FF6B00]/70" : "text-gray-400")}>{stat.label}</span>
            </button>
          ))}
        </section>

        <div className="mt-8 px-4 pb-32">
          <AnimatePresence mode="wait">
            {activeTab === 'works' && (
              <motion.section 
                key="works"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <Edit size={20} className="text-[#FF6B00]" /> 我的创作
                  </h3>
                  <div className="flex items-center bg-gray-100 rounded-lg p-1">
                    <button 
                      onClick={() => setViewMode('list')}
                      className={cn("p-1.5 rounded-md transition-all", viewMode === 'list' ? "bg-white text-[#FF6B00] shadow-sm" : "text-gray-400")}
                    >
                      <List size={16} />
                    </button>
                    <button 
                      onClick={() => setViewMode('grid')}
                      className={cn("p-1.5 rounded-md transition-all", viewMode === 'grid' ? "bg-white text-[#FF6B00] shadow-sm" : "text-gray-400")}
                    >
                      <LayoutGrid size={16} />
                    </button>
                  </div>
                </div>

                <div className="flex gap-2 overflow-x-auto no-scrollbar">
                  {[
                    { id: 'drafts', label: '我的草稿' },
                    { id: 'published', label: '已发布' },
                    { id: 'offline', label: '已下架' }
                  ].map((tab) => (
                    <button 
                      key={tab.id} 
                      onClick={() => setWorksFilter(tab.id)}
                      className={cn(
                        "px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all", 
                        worksFilter === tab.id ? "bg-[#FF6B00] text-white shadow-md shadow-orange-200" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                      )}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="space-y-6">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={`${worksFilter}-${viewMode}`}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className={cn(viewMode === 'grid' ? "grid grid-cols-3 gap-4" : "space-y-6")}
                    >
                      {filteredGames.length > 0 ? (
                        filteredGames.map(game => (
                          viewMode === 'list' ? (
                            <div key={game.id} className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-50 flex flex-col">
                              <img src={game.cover} className="h-48 w-full object-cover" alt="" />
                              <div className="p-4">
                                <h4 className="text-lg font-bold">{game.title}</h4>
                                <p className="text-xs text-gray-400 mt-1">
                                  {worksFilter === 'drafts' ? '最后编辑于 刚刚' : worksFilter === 'published' ? '发布于 刚刚' : '下架于 3 天前'}
                                </p>
                                <div className="mt-4 grid grid-cols-2 gap-3">
                                  {worksFilter === 'drafts' ? (
                                    <>
                                      <button 
                                        onClick={() => onEditGame(game)}
                                        className="flex items-center justify-center gap-2 bg-[#FF6B00] text-white py-2.5 rounded-xl font-bold text-sm shadow-sm hover:bg-[#E66000] transition-colors"
                                      >
                                        <Edit size={16} /> 编辑
                                      </button>
                                      <button 
                                        onClick={() => onSelectGame(game)}
                                        className="flex items-center justify-center gap-2 bg-[#FF6B00]/10 text-[#FF6B00] py-2.5 rounded-xl font-bold text-sm hover:bg-[#FF6B00]/20 transition-colors"
                                      >
                                        <PlayCircle size={16} /> 预览测试
                                      </button>
                                    </>
                                  ) : worksFilter === 'published' ? (
                                    <>
                                      <button 
                                        onClick={() => onSelectGame(game)}
                                        className="flex items-center justify-center gap-2 bg-[#FF6B00] text-white py-2.5 rounded-xl font-bold text-sm shadow-sm hover:bg-[#E66000] transition-colors"
                                      >
                                        <PlayCircle size={16} /> 查看详情
                                      </button>
                                      <button 
                                        onClick={() => onUpdateStatus(game.id, 'offline')}
                                        className="flex items-center justify-center gap-2 bg-gray-100 text-gray-500 py-2.5 rounded-xl font-bold text-sm hover:bg-gray-200 transition-colors"
                                      >
                                        <ArrowDownCircle size={16} /> 下架
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <button 
                                        onClick={() => onEditGame(game)}
                                        className="flex items-center justify-center gap-2 bg-[#FF6B00]/5 border border-[#FF6B00]/20 text-[#FF6B00] py-2.5 rounded-xl font-bold text-sm hover:bg-[#FF6B00]/10 transition-colors"
                                      >
                                        <Edit size={16} /> 编辑
                                      </button>
                                      <button 
                                        onClick={() => onSelectGame(game)}
                                        className="flex items-center justify-center gap-2 bg-[#FF6B00]/10 text-[#FF6B00] py-2.5 rounded-xl font-bold text-sm hover:bg-[#FF6B00]/20 transition-colors"
                                      >
                                        <PlayCircle size={16} /> 预览测试
                                      </button>
                                      <button 
                                        onClick={() => onUpdateStatus(game.id, 'published')}
                                        className="col-span-2 flex items-center justify-center gap-2 bg-[#FF6B00] text-white py-2.5 rounded-xl font-bold text-sm shadow-sm hover:bg-[#E66000] transition-colors"
                                      >
                                        <Rocket size={16} /> 重新上架
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <button 
                              key={game.id} 
                              onClick={() => worksFilter === 'drafts' ? onEditGame(game) : onSelectGame(game)}
                              className="flex flex-col items-center gap-2 group"
                            >
                              <div className="aspect-square w-full rounded-2xl overflow-hidden shadow-sm border border-gray-100 group-hover:shadow-md transition-all">
                                <img src={game.cover} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt="" />
                              </div>
                              <span className="text-xs font-bold text-gray-700 truncate w-full text-center">{game.title}</span>
                            </button>
                          )
                        ))
                      ) : (
                        <div className="col-span-full py-20 flex flex-col items-center justify-center text-gray-400 bg-gray-50/50 rounded-3xl border border-dashed border-gray-200">
                          <Edit size={48} className="mb-4 opacity-20" />
                          <p className="text-sm">暂无{worksFilter === 'drafts' ? '草稿' : worksFilter === 'published' ? '已发布' : '已下架'}作品</p>
                        </div>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </motion.section>
            )}

            {activeTab === 'archives' && (
              <motion.section 
                key="archives"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <History size={20} className="text-[#FF6B00]" /> 我的存档
                  </h3>
                  <div className="flex items-center bg-gray-100 rounded-lg p-1">
                    <button 
                      onClick={() => setViewMode('list')}
                      className={cn("p-1.5 rounded-md transition-all", viewMode === 'list' ? "bg-white text-[#FF6B00] shadow-sm" : "text-gray-400")}
                    >
                      <List size={16} />
                    </button>
                    <button 
                      onClick={() => setViewMode('grid')}
                      className={cn("p-1.5 rounded-md transition-all", viewMode === 'grid' ? "bg-white text-[#FF6B00] shadow-sm" : "text-gray-400")}
                    >
                      <LayoutGrid size={16} />
                    </button>
                  </div>
                </div>

                <div className={cn(viewMode === 'grid' ? "grid grid-cols-3 gap-4" : "space-y-6")}>
                  {archiveGames.length > 0 ? (
                    archiveGames.map(game => (
                      viewMode === 'list' ? (
                        <div key={game.id} className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-50 flex flex-col">
                          <img src={game.cover} className="h-48 w-full object-cover" alt="" />
                          <div className="p-4">
                            <h4 className="text-lg font-bold">{game.title}</h4>
                            <p className="text-xs text-gray-400 mt-1">存档于 1 天前 · 进度 65%</p>
                            <div className="mt-4 grid grid-cols-2 gap-3">
                              <button 
                                onClick={() => onContinuePlaying(game)}
                                className="flex items-center justify-center gap-2 bg-[#FF6B00] text-white py-2.5 rounded-xl font-bold text-sm shadow-sm"
                              >
                                <PlayCircle size={16} /> 继续游玩
                              </button>
                              <button 
                                onClick={() => onDeleteArchive(game.id)}
                                className="flex items-center justify-center gap-2 bg-gray-100 text-gray-500 py-2.5 rounded-xl font-bold text-sm"
                              >
                                <Trash2 size={16} /> 删除存档
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <button 
                          key={game.id} 
                          onClick={() => onSelectGame(game)}
                          className="flex flex-col items-center gap-2 group"
                        >
                          <div className="aspect-square w-full rounded-2xl overflow-hidden shadow-sm border border-gray-100 group-hover:shadow-md transition-all">
                            <img src={game.cover} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt="" />
                          </div>
                          <span className="text-xs font-bold text-gray-700 truncate w-full text-center">{game.title}</span>
                        </button>
                      )
                    ))
                  ) : (
                    <div className="col-span-full py-20 flex flex-col items-center justify-center text-gray-400 bg-gray-50/50 rounded-3xl border border-dashed border-gray-200">
                      <History size={48} className="mb-4 opacity-20" />
                      <p className="text-sm">暂无游戏存档</p>
                    </div>
                  )}
                </div>
              </motion.section>
            )}

            {activeTab === 'favs' && (
              <motion.section 
                key="favs"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <Heart size={20} className="text-[#FF6B00]" /> 我的收藏
                  </h3>
                  <div className="flex items-center bg-gray-100 rounded-lg p-1">
                    <button 
                      onClick={() => setViewMode('list')}
                      className={cn("p-1.5 rounded-md transition-all", viewMode === 'list' ? "bg-white text-[#FF6B00] shadow-sm" : "text-gray-400")}
                    >
                      <List size={16} />
                    </button>
                    <button 
                      onClick={() => setViewMode('grid')}
                      className={cn("p-1.5 rounded-md transition-all", viewMode === 'grid' ? "bg-white text-[#FF6B00] shadow-sm" : "text-gray-400")}
                    >
                      <LayoutGrid size={16} />
                    </button>
                  </div>
                </div>

                <div className={cn(viewMode === 'grid' ? "grid grid-cols-3 gap-4" : "space-y-6")}>
                  {favoriteGames.length > 0 ? (
                    favoriteGames.map(game => (
                      viewMode === 'list' ? (
                        <div key={game.id} className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-50 flex flex-col">
                          <img src={game.cover} className="h-48 w-full object-cover" alt="" />
                          <div className="p-4">
                            <h4 className="text-lg font-bold">{game.title}</h4>
                            <p className="text-xs text-gray-400 mt-1">已收藏</p>
                            <div className="mt-4 grid grid-cols-2 gap-3">
                              <button 
                                onClick={() => onSelectGame(game)}
                                className="flex items-center justify-center gap-2 bg-[#FF6B00] text-white py-2.5 rounded-xl font-bold text-sm shadow-sm"
                              >
                                <PlayCircle size={16} /> 立即游玩
                              </button>
                              <button 
                                onClick={() => onToggleFavorite(game.id)}
                                className="flex items-center justify-center gap-2 bg-gray-100 text-gray-500 py-2.5 rounded-xl font-bold text-sm"
                              >
                                <Heart size={16} fill="currentColor" /> 取消收藏
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <button 
                          key={game.id} 
                          onClick={() => onSelectGame(game)}
                          className="flex flex-col items-center gap-2 group"
                        >
                          <div className="aspect-square w-full rounded-2xl overflow-hidden shadow-sm border border-gray-100 group-hover:shadow-md transition-all">
                            <img src={game.cover} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt="" />
                          </div>
                          <span className="text-xs font-bold text-gray-700 truncate w-full text-center">{game.title}</span>
                        </button>
                      )
                    ))
                  ) : (
                    <div className="col-span-full py-20 flex flex-col items-center justify-center text-gray-400 bg-gray-50/50 rounded-3xl border border-dashed border-gray-200">
                      <Heart size={48} className="mb-4 opacity-20" />
                      <p className="text-sm">暂无收藏作品</p>
                    </div>
                  )}
                </div>
              </motion.section>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};

const Settings = ({ onBack, onNavigate, isAuthenticated, onLogout }: { onBack: () => void, onNavigate: (page: Page) => void, isAuthenticated: boolean, onLogout: () => void }) => {
  const [toast, setToast] = useState<string | null>(null);
  const [cacheSize, setCacheSize] = useState('124 MB');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const sections = [
    {
      title: '账号与安全',
      items: [
        { label: '账号管理', icon: <User size={20} />, onClick: () => onNavigate('account-management') },
        { label: '切换账号', icon: <Users size={20} />, onClick: () => onNavigate('switch-account') }
      ]
    },
    {
      title: '个性化偏好',
      items: [
        { label: '语言设置', sub: '简体中文', icon: <Globe size={20} />, onClick: () => onNavigate('language-settings') }
      ]
    },
    {
      title: 'AI 设置',
      items: [
        { 
          label: 'AI API 配置', 
          sub: isAIConfigValid(loadAIConfig()) ? '已配置' : '未配置',
          icon: <Brain size={20} />, 
          onClick: () => onNavigate('ai-settings') 
        }
      ]
    },
    {
      title: '通用与关于',
      items: [
        { label: '隐私政策', icon: <CheckCircle2 size={20} />, onClick: () => setToast('隐私政策文档加载中...') },
        { label: '关于我们 / 版本信息', sub: 'v1.2.0', icon: <Bell size={20} />, onClick: () => setToast('当前已是最新版本') },
        { 
          label: '清除缓存', 
          sub: cacheSize, 
          icon: <Trash2 size={20} />, 
          onClick: () => {
            if (cacheSize === '0 MB') {
              setToast('缓存已清空');
            } else {
              setCacheSize('0 MB');
              setToast('缓存清理成功');
            }
          }
        }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 relative overflow-hidden">
      <header className="sticky top-0 z-50 bg-white px-6 h-16 flex items-center gap-4">
        <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-100 text-[#FF6B00]">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-2xl font-bold">设置</h1>
      </header>

      <main className="max-w-2xl mx-auto px-6 pt-4 space-y-8 pb-24">
        {sections.map(section => (
          <section key={section.title} className="space-y-4">
            <h2 className="px-2 text-gray-400 font-medium text-lg">{section.title}</h2>
            <div className="bg-gray-100/50 rounded-3xl p-2 space-y-1">
              {section.items.map(item => (
                <button 
                  key={item.label} 
                  onClick={item.onClick}
                  className="w-full flex items-center justify-between p-4 bg-white rounded-2xl hover:bg-gray-50 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-[#FF6B00]">
                      {item.icon}
                    </div>
                    <div className="flex flex-col text-left">
                      <span className="text-gray-900 font-medium">{item.label}</span>
                      {item.sub && <span className="text-xs text-gray-400">{item.sub}</span>}
                    </div>
                  </div>
                  <ChevronRight size={20} className="text-gray-300 group-hover:translate-x-1 transition-transform" />
                </button>
              ))}
            </div>
          </section>
        ))}

        <div className="pt-8 px-2">
          {isAuthenticated ? (
            <button 
              onClick={() => setShowLogoutConfirm(true)}
              className="w-full bg-gray-100 text-[#FF6B00] font-bold py-4 rounded-2xl hover:bg-red-50 hover:text-red-500 transition-all active:scale-95"
            >
              退出登录
            </button>
          ) : (
            <button 
              onClick={() => onNavigate('login')}
              className="w-full bg-gradient-to-r from-[#FF6B00] to-[#FF8C42] text-white font-bold py-4 rounded-2xl shadow-lg shadow-orange-200 hover:shadow-xl transition-all active:scale-95"
            >
              登录 / 注册
            </button>
          )}
        </div>
      </main>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-gray-900/90 text-white px-6 py-3 rounded-full text-sm font-bold z-[100] backdrop-blur-sm shadow-xl"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Logout Confirmation Modal */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLogoutConfirm(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-[32px] p-8 w-full max-w-sm relative z-10 shadow-2xl"
            >
              <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center text-red-500 mb-6 mx-auto">
                <SettingsIcon size={32} />
              </div>
              <h3 className="text-xl font-bold text-center mb-2">确认退出登录？</h3>
              <p className="text-gray-500 text-center text-sm mb-8">退出后将无法同步您的创作进度和收藏作品。</p>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={async () => {
                    setShowLogoutConfirm(false);
                    await onLogout();
                    setToast('已安全退出');
                    setTimeout(() => window.location.reload(), 1500);
                  }}
                  className="w-full bg-red-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-red-200 hover:bg-red-600 transition-all active:scale-95"
                >
                  确认退出
                </button>
                <button 
                  onClick={() => setShowLogoutConfirm(false)}
                  className="w-full bg-gray-100 text-gray-500 font-bold py-4 rounded-2xl hover:bg-gray-200 transition-all active:scale-95"
                >
                  取消
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const Login = ({ onBack, onLogin }: { onBack: () => void, onLogin: (user: any) => void }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    onLogin({ name: 'AI_Mastermind', email, avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix' });
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="p-6">
        <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-100 text-[#FF6B00]">
          <ArrowLeft size={24} />
        </button>
      </header>
      <main className="flex-1 px-8 pt-10 max-w-md mx-auto w-full">
        <div className="mb-10">
          <h1 className="text-3xl font-bold mb-2">欢迎回来</h1>
          <p className="text-gray-400">登录以继续您的创作之旅</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 ml-1">邮箱地址</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full bg-gray-50 border-none rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-[#FF6B00] transition-all"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 ml-1">登录密码</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-gray-50 border-none rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-[#FF6B00] transition-all"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button type="button" className="text-sm font-bold text-[#FF6B00]">忘记密码？</button>
          </div>
          <button 
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#FF6B00] text-white font-bold py-4 rounded-2xl shadow-lg shadow-orange-200 hover:bg-[#E66000] transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : '立即登录'}
          </button>
        </form>
        <div className="mt-10 text-center">
          <p className="text-sm text-gray-400">还没有账号？ <button className="font-bold text-[#FF6B00]">立即注册</button></p>
        </div>
      </main>
    </div>
  );
};

const AccountManagement = ({ onBack, user, onEditProfile }: { onBack: () => void, user: any, onEditProfile: () => void }) => {
  const [toast, setToast] = useState<string | null>(null);

  const items = [
    { label: '个人资料', sub: '修改头像、昵称、简介', icon: <User size={20} />, onClick: onEditProfile },
    { label: '实名认证', sub: '未认证', icon: <ShieldCheck size={20} />, onClick: () => setToast('实名认证功能暂未开放') },
    { label: '绑定手机', sub: '138****8888', icon: <Smartphone size={20} />, onClick: () => setToast('绑定手机功能暂未开放') },
    { label: '修改密码', icon: <Lock size={20} />, onClick: () => setToast('修改密码功能暂未开放') }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-50 bg-white px-6 h-16 flex items-center gap-4">
        <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-100 text-[#FF6B00]">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-bold">账号管理</h1>
      </header>
      <main className="max-w-2xl mx-auto px-6 pt-6 space-y-6">
        <div className="bg-white rounded-[32px] p-6 flex items-center gap-4 shadow-sm border border-gray-100">
          <img src={user?.avatar || 'https://picsum.photos/seed/user/200/200'} className="w-16 h-16 rounded-2xl border-2 border-orange-100" alt="" />
          <div>
            <h2 className="text-lg font-bold">{user?.name || '梦想编织者'}</h2>
            <p className="text-xs text-gray-400">{user?.email || '未绑定邮箱'}</p>
          </div>
        </div>
        <div className="space-y-2">
          {items.map(item => (
            <button 
              key={item.label}
              onClick={item.onClick}
              className="w-full flex items-center justify-between p-5 bg-white rounded-2xl hover:bg-gray-50 transition-colors group"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-[#FF6B00]">
                  {item.icon}
                </div>
                <div className="flex flex-col text-left">
                  <span className="font-bold text-gray-900">{item.label}</span>
                  {item.sub && <span className="text-xs text-gray-400">{item.sub}</span>}
                </div>
              </div>
              <ChevronRight size={20} className="text-gray-300 group-hover:translate-x-1 transition-transform" />
            </button>
          ))}
        </div>
      </main>
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-gray-900/90 text-white px-6 py-3 rounded-full text-sm font-bold z-[100]"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const AISettings = ({ onBack }: { onBack: () => void }) => {
  const [config, setConfig] = useState<AIConfig>(loadAIConfig());
  const [toast, setToast] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  const handleSave = () => {
    saveAIConfig(config);
    aiService.updateConfig(config);
    setToast('配置已保存');
  };

  const handleTest = async () => {
    if (!isAIConfigValid(config)) {
      setToast('请先填写完整的配置信息');
      return;
    }
    
    setIsTesting(true);
    try {
      const service = new (await import('./lib/ai-config')).AIService(config);
      await service.sendMessage([{ role: 'user', content: 'Hello' }]);
      setToast('连接测试成功');
    } catch (error: any) {
      setToast(`测试失败: ${error.message}`);
    } finally {
      setIsTesting(false);
    }
  };

  const providers: { id: AIProvider; name: string; desc: string }[] = [
    { id: 'gemini', name: 'Google Gemini', desc: 'Google的AI模型' },
    { id: 'openai', name: 'OpenAI', desc: 'GPT系列模型' },
    { id: 'claude', name: 'Anthropic Claude', desc: 'Claude系列模型' },
    { id: 'custom', name: '自定义 API', desc: '兼容OpenAI格式的API' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-50 bg-white px-6 h-16 flex items-center gap-4">
        <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-100 text-[#FF6B00]">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-bold">AI API 配置</h1>
      </header>

      <main className="max-w-2xl mx-auto px-6 pt-6 pb-24 space-y-6">
        {/* 启用开关 */}
        <div className="bg-white rounded-[24px] p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-gray-900">启用自定义 AI</h3>
              <p className="text-sm text-gray-400 mt-1">使用自己的 API 密钥进行 AI 对话</p>
            </div>
            <button
              onClick={() => setConfig({ ...config, enabled: !config.enabled })}
              className={cn(
                "w-14 h-8 rounded-full transition-colors relative",
                config.enabled ? "bg-[#FF6B00]" : "bg-gray-200"
              )}
            >
              <div className={cn(
                "w-6 h-6 bg-white rounded-full absolute top-1 transition-all shadow-sm",
                config.enabled ? "left-7" : "left-1"
              )} />
            </button>
          </div>
        </div>

        {config.enabled && (
          <>
            {/* 提供商选择 */}
            <div className="bg-white rounded-[24px] p-6 border border-gray-100 shadow-sm">
              <h3 className="font-bold text-gray-900 mb-4">选择 AI 提供商</h3>
              <div className="grid grid-cols-2 gap-3">
                {providers.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setConfig({ ...config, provider: p.id, model: AI_MODELS[p.id][0] })}
                    className={cn(
                      "p-4 rounded-2xl border-2 text-left transition-all",
                      config.provider === p.id
                        ? "border-[#FF6B00] bg-orange-50"
                        : "border-gray-100 hover:border-orange-200"
                    )}
                  >
                    <div className="font-bold text-gray-900">{p.name}</div>
                    <div className="text-xs text-gray-400 mt-1">{p.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* API Key */}
            <div className="bg-white rounded-[24px] p-6 border border-gray-100 shadow-sm">
              <h3 className="font-bold text-gray-900 mb-4">API 密钥</h3>
              <input
                type="password"
                value={config.apiKey}
                onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                placeholder={`输入你的 ${providers.find(p => p.id === config.provider)?.name} API Key`}
                className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:border-[#FF6B00] focus:outline-none transition-colors"
              />
              <p className="text-xs text-gray-400 mt-2">
                你的 API 密钥仅存储在本地浏览器中，不会上传到服务器。
              </p>
            </div>

            {/* 自定义 API URL (仅自定义模式显示) */}
            {config.provider === 'custom' && (
              <div className="bg-white rounded-[24px] p-6 border border-gray-100 shadow-sm">
                <h3 className="font-bold text-gray-900 mb-4">自定义 API 端点</h3>
                <input
                  type="text"
                  value={config.apiUrl || ''}
                  onChange={(e) => setConfig({ ...config, apiUrl: e.target.value })}
                  placeholder="https://api.example.com/v1/chat/completions"
                  className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:border-[#FF6B00] focus:outline-none transition-colors"
                />
                <p className="text-xs text-gray-400 mt-2">
                  输入兼容 OpenAI 格式的 API 端点地址。
                </p>
              </div>
            )}

            {/* 模型选择 */}
            <div className="bg-white rounded-[24px] p-6 border border-gray-100 shadow-sm">
              <h3 className="font-bold text-gray-900 mb-4">模型</h3>
              <select
                value={config.model}
                onChange={(e) => setConfig({ ...config, model: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 focus:border-[#FF6B00] focus:outline-none transition-colors"
              >
                {AI_MODELS[config.provider].map((model) => (
                  <option key={model} value={model}>{model}</option>
                ))}
              </select>
            </div>

            {/* 高级设置 */}
            <div className="bg-white rounded-[24px] p-6 border border-gray-100 shadow-sm">
              <h3 className="font-bold text-gray-900 mb-4">高级设置</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-gray-600">Temperature</span>
                    <span className="text-sm font-bold text-[#FF6B00]">{config.temperature}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    value={config.temperature}
                    onChange={(e) => setConfig({ ...config, temperature: parseFloat(e.target.value) })}
                    className="w-full accent-[#FF6B00]"
                  />
                  <p className="text-xs text-gray-400 mt-1">控制输出的随机性，值越高越随机</p>
                </div>
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-gray-600">最大 Token 数</span>
                    <span className="text-sm font-bold text-[#FF6B00]">{config.maxTokens}</span>
                  </div>
                  <input
                    type="range"
                    min="256"
                    max="8192"
                    step="256"
                    value={config.maxTokens}
                    onChange={(e) => setConfig({ ...config, maxTokens: parseInt(e.target.value) })}
                    className="w-full accent-[#FF6B00]"
                  />
                </div>
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex gap-3">
              <button
                onClick={handleTest}
                disabled={isTesting}
                className="flex-1 bg-gray-100 text-gray-700 font-bold py-4 rounded-2xl hover:bg-gray-200 transition-all active:scale-95 disabled:opacity-50"
              >
                {isTesting ? '测试中...' : '测试连接'}
              </button>
              <button
                onClick={handleSave}
                className="flex-1 bg-[#FF6B00] text-white font-bold py-4 rounded-2xl shadow-lg shadow-orange-200 hover:bg-[#FF8533] transition-all active:scale-95"
              >
                保存配置
              </button>
            </div>
          </>
        )}

        {/* 说明 */}
        <div className="bg-blue-50 rounded-[24px] p-6 border border-blue-100">
          <h4 className="font-bold text-blue-900 mb-2">💡 使用说明</h4>
          <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
            <li>配置自定义 AI 后，游戏对话将使用你的 API 密钥</li>
            <li>请确保你的 API 密钥有足够的额度</li>
            <li>不同提供商的计费方式不同，请注意用量</li>
            <li>自定义 API 需要兼容 OpenAI 格式</li>
          </ul>
        </div>
      </main>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-gray-900/90 text-white px-6 py-3 rounded-full text-sm font-bold z-[100] backdrop-blur-sm shadow-xl"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const LanguageSettings = ({ onBack }: { onBack: () => void }) => {
  const [selected, setSelected] = useState('zh');
  const languages = [
    { id: 'zh', name: '简体中文', sub: 'Chinese (Simplified)' },
    { id: 'en', name: 'English', sub: '英语' },
    { id: 'ja', name: '日本語', sub: '日语' },
    { id: 'ko', name: '한국어', sub: '韩语' }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-50 bg-white px-6 h-16 flex items-center gap-4">
        <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-100 text-[#FF6B00]">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-bold">语言设置</h1>
      </header>
      <main className="max-w-2xl mx-auto px-6 pt-6">
        <div className="bg-white rounded-[32px] overflow-hidden border border-gray-100 shadow-sm">
          {languages.map((lang, idx) => (
            <button 
              key={lang.id}
              onClick={() => setSelected(lang.id)}
              className={cn(
                "w-full flex items-center justify-between p-6 transition-colors",
                idx !== languages.length - 1 && "border-b border-gray-50",
                selected === lang.id ? "bg-orange-50/30" : "hover:bg-gray-50"
              )}
            >
              <div className="flex flex-col text-left">
                <span className={cn("font-bold", selected === lang.id ? "text-[#FF6B00]" : "text-gray-900")}>{lang.name}</span>
                <span className="text-xs text-gray-400">{lang.sub}</span>
              </div>
              {selected === lang.id && <CheckCircle2 size={20} className="text-[#FF6B00]" />}
            </button>
          ))}
        </div>
        <p className="mt-6 px-4 text-xs text-gray-400 leading-relaxed">
          更改语言后，界面文字将切换为所选语言。部分用户生成内容（如作品标题、背景等）可能仍保持原语言。
        </p>
      </main>
    </div>
  );
};

const SwitchAccount = ({ onBack, onAddAccount }: { onBack: () => void, onAddAccount: () => void }) => {
  const accounts = [
    { id: '1', name: 'AI_Mastermind', email: 'felix@example.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix', current: true },
    { id: '2', name: '织梦者', email: 'dreamer@example.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka', current: false }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-50 bg-white px-6 h-16 flex items-center gap-4">
        <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-100 text-[#FF6B00]">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-bold">切换账号</h1>
      </header>
      <main className="max-w-2xl mx-auto px-6 pt-6 space-y-6">
        <div className="space-y-3">
          {accounts.map(acc => (
            <button 
              key={acc.id}
              className={cn(
                "w-full flex items-center justify-between p-5 bg-white rounded-[24px] border transition-all",
                acc.current ? "border-[#FF6B00] shadow-md shadow-orange-100" : "border-gray-100 hover:border-orange-200"
              )}
            >
              <div className="flex items-center gap-4">
                <img src={acc.avatar} className="w-12 h-12 rounded-xl border border-gray-100" alt="" />
                <div className="flex flex-col text-left">
                  <span className="font-bold text-gray-900">{acc.name}</span>
                  <span className="text-xs text-gray-400">{acc.email}</span>
                </div>
              </div>
              {acc.current ? (
                <span className="text-[10px] font-bold bg-[#FF6B00] text-white px-2 py-1 rounded-full">当前</span>
              ) : (
                <ChevronRight size={18} className="text-gray-300" />
              )}
            </button>
          ))}
        </div>
        <button 
          onClick={onAddAccount}
          className="w-full flex items-center justify-center gap-2 p-5 bg-gray-100 text-gray-600 font-bold rounded-[24px] hover:bg-gray-200 transition-all active:scale-95"
        >
          <PlusSquare size={20} /> 添加新账号
        </button>
      </main>
    </div>
  );
};

const EditProfile = ({ onBack, user, onSave }: { onBack: () => void, user: any, onSave: (data: any) => void }) => {
  const [name, setName] = useState(user?.name || '梦想编织者');
  const [bio, setBio] = useState(user?.bio || '见习创作者，正在探索 AI 创作的无限可能。');
  const [avatar, setAvatar] = useState(user?.avatar || 'https://picsum.photos/seed/user/200/200');
  const [toast, setToast] = useState<string | null>(null);

  const handleSave = () => {
    onSave({ name, bio, avatar });
    setToast('个人资料已更新');
    setTimeout(onBack, 1500);
  };

  const changeAvatar = () => {
    const seeds = ['Felix', 'Aneka', 'Tester', 'Dreamer', 'Creator', 'Gamer', 'Artist'];
    const randomSeed = seeds[Math.floor(Math.random() * seeds.length)];
    setAvatar(`https://api.dicebear.com/7.x/avataaars/svg?seed=${randomSeed}`);
    setToast('头像已更换');
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="sticky top-0 z-50 bg-white px-6 h-16 flex items-center justify-between border-b border-gray-50">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-100 text-[#FF6B00]">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-xl font-bold">编辑个人资料</h1>
        </div>
        <button onClick={handleSave} className="text-[#FF6B00] font-bold px-4 py-2 hover:bg-orange-50 rounded-xl transition-colors">保存</button>
      </header>

      <main className="flex-1 p-6 space-y-8 max-w-2xl mx-auto w-full">
        <div className="flex flex-col items-center py-4">
          <div className="relative group cursor-pointer" onClick={changeAvatar}>
            <div className="w-28 h-28 rounded-[32px] border-4 border-orange-50 shadow-lg overflow-hidden transition-transform active:scale-95">
              <img src={avatar} className="w-full h-full object-cover" alt="Avatar" />
            </div>
            <div className="absolute inset-0 bg-black/40 rounded-[32px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <Upload size={24} className="text-white" />
            </div>
            <div className="absolute -bottom-2 -right-2 bg-[#FF6B00] text-white p-2.5 rounded-2xl border-4 border-white shadow-md">
              <Edit size={14} />
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-6 font-medium">点击头像随机更换</p>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 ml-1">昵称</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-gray-50 border-none rounded-2xl py-4 px-6 focus:ring-2 focus:ring-[#FF6B00] transition-all font-medium"
              placeholder="输入你的昵称"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 ml-1">个人简介</label>
            <textarea 
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              className="w-full bg-gray-50 border-none rounded-2xl py-4 px-6 focus:ring-2 focus:ring-[#FF6B00] transition-all resize-none font-medium leading-relaxed"
              placeholder="介绍一下你自己吧..."
            />
          </div>
        </div>
      </main>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-gray-900/90 text-white px-6 py-3 rounded-full text-sm font-bold z-[100] backdrop-blur-sm shadow-xl"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const Notifications = ({ onBack }: { onBack: () => void }) => {
  const [selectedNotification, setSelectedNotification] = useState<number | null>(null);
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);

  const handleDelete = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    setNotifications(prev => prev.filter(n => n.id !== id));
    if (selectedNotification === id) setSelectedNotification(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-50 bg-white px-6 h-16 flex items-center gap-4">
        <button onClick={onBack} className="p-2 rounded-full hover:bg-gray-100 text-[#FF6B00]">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-2xl font-bold">消息通知</h1>
      </header>

      <main className="max-w-2xl mx-auto px-4 pt-4 pb-24">
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {notifications.length > 0 ? (
              notifications.map(n => (
                <motion.div 
                  key={n.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9, x: -20 }}
                  onClick={() => setSelectedNotification(selectedNotification === n.id ? null : n.id)}
                  className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 cursor-pointer overflow-hidden relative group"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-2 h-2 rounded-full",
                        n.title === '系统通知' ? "bg-blue-500" : "bg-orange-500"
                      )}></div>
                      <h3 className="font-bold text-gray-900">{n.title}</h3>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-400">{n.time}</span>
                      <button 
                        onClick={(e) => handleDelete(e, n.id)}
                        className="p-2 rounded-full hover:bg-red-50 text-gray-300 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed mb-2 pr-8">
                    {n.content}
                  </p>
                  
                  <AnimatePresence>
                    {selectedNotification === n.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="pt-4 mt-4 border-t border-gray-50"
                      >
                        <p className="text-sm text-gray-500 leading-loose">
                          {n.detail}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                <Bell size={48} className="mb-4 opacity-20" />
                <p>暂无消息通知</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('discovery');
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [userGames, setUserGames] = useState<Game[]>([]);
  const [testReturnPage, setTestReturnPage] = useState<Page | null>(null);
  const { user, isLoading, isAuthenticated, logout } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  
  const currentUser = user ? {
    name: user.username,
    bio: user.bio || '见习创作者，正在探索 AI 创作的无限可能。',
    avatar: user.avatar_url || 'https://picsum.photos/seed/user/200/200',
    email: user.email
  } : {
    name: '访客',
    bio: '登录后开始你的创作之旅',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=guest',
    email: ''
  };

  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [archiveIds, setArchiveIds] = useState<string[]>(['3', '4']);

  const handleToggleFavorite = (gameId: string) => {
    setFavoriteIds(prev => 
      prev.includes(gameId) 
        ? prev.filter(id => id !== gameId) 
        : [...prev, gameId]
    );
  };

  const handleDeleteArchive = (gameId: string) => {
    setArchiveIds(prev => prev.filter(id => id !== gameId));
  };

  const handleContinuePlaying = (game: Game, returnPage: Page = 'profile') => {
    setSelectedGame(game);
    setCurrentPage('play');
    setTestReturnPage(returnPage);
  };

  const handleGameSelect = (game: Game) => {
    setSelectedGame(game);
    setCurrentPage('detail');
    setTestReturnPage('detail');
  };

  const handleGameEdit = (game: Game) => {
    setSelectedGame(game);
    setCurrentPage('create');
    setTestReturnPage('create');
  };

  const handleSaveGame = (gameData: Partial<Game>, isPublish: boolean) => {
    const newGame: Game = {
      id: selectedGame?.id || Math.random().toString(36).substr(2, 9),
      title: gameData.title || '未命名作品',
      description: gameData.description || '',
      cover: gameData.cover || 'https://picsum.photos/seed/default/1920/1080',
      category: gameData.category || '未分类',
      plays: selectedGame?.plays || '0',
      likes: selectedGame?.likes || '0',
      author: currentUser?.name || '我',
      authorAvatar: currentUser?.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Me',
      tags: gameData.tags || [],
      status: isPublish ? 'published' : 'draft',
      ...gameData
    };

    setUserGames(prev => {
      const exists = prev.find(g => g.id === newGame.id);
      if (exists) {
        return prev.map(g => g.id === newGame.id ? newGame : g);
      }
      return [...prev, newGame];
    });

    setCurrentPage('profile');
  };

  const handleTestGame = (gameData: Partial<Game>) => {
    const tempGame: Game = {
      id: 'temp-' + Date.now(),
      title: gameData.title || '测试作品',
      description: gameData.description || '',
      cover: gameData.cover || 'https://picsum.photos/seed/test/1920/1080',
      category: gameData.category || '测试',
      plays: '0',
      likes: '0',
      author: '测试员',
      authorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Tester',
      tags: gameData.tags || [],
      ...gameData
    };
    setSelectedGame(tempGame);
    setArchiveIds(prev => [...prev, tempGame.id]);
    setTestReturnPage('create');
    setCurrentPage('play');
  };

  const handleUpdateGameStatus = (gameId: string, status: 'draft' | 'published' | 'offline') => {
    setUserGames(prev => prev.map(g => g.id === gameId ? { ...g, status } : g));
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'discovery':
        return <Discovery onSelectGame={handleGameSelect} onShowAllNotifications={() => setCurrentPage('notifications')} userGames={userGames} />;
      case 'notifications':
        return <Notifications onBack={() => setCurrentPage('discovery')} />;
      case 'detail':
        return selectedGame ? (
          <GameDetail 
            game={selectedGame} 
            onBack={() => setCurrentPage('discovery')} 
            onPlay={() => {
              if (selectedGame && !archiveIds.includes(selectedGame.id)) {
                setArchiveIds(prev => [...prev, selectedGame.id]);
              }
              setCurrentPage('play');
            }}
            isFavorite={favoriteIds.includes(selectedGame.id)}
            onToggleFavorite={() => handleToggleFavorite(selectedGame.id)}
            hasArchive={archiveIds.includes(selectedGame.id)}
            onContinue={() => handleContinuePlaying(selectedGame, 'detail')}
          />
        ) : null;
      case 'play':
        return selectedGame ? (
          <GamePlay 
            game={selectedGame} 
            onBack={() => setCurrentPage(testReturnPage || 'detail')} 
          />
        ) : null;
      case 'create':
        return (
          <CreatorCenter 
            onAIChat={() => setCurrentPage('ai-chat')} 
            onBack={() => setCurrentPage('discovery')} 
            onSave={(data) => handleSaveGame(data, false)}
            onPublish={(data) => handleSaveGame(data, true)}
            onTest={handleTestGame}
            game={selectedGame} 
          />
        );
      case 'ai-chat':
        return (
          <AIChat 
            onBack={() => setCurrentPage('create')} 
            game={selectedGame}
            onUpdateGame={(data) => setSelectedGame(prev => prev ? { ...prev, ...data } : null)}
          />
        );
      case 'profile':
        return (
          <Profile 
            onSettings={() => setCurrentPage('settings')} 
            onSelectGame={handleGameSelect} 
            onEditGame={handleGameEdit} 
            onUpdateStatus={handleUpdateGameStatus}
            userGames={userGames}
            favoriteIds={favoriteIds}
            onToggleFavorite={handleToggleFavorite}
            archiveIds={archiveIds}
            onDeleteArchive={handleDeleteArchive}
            onContinuePlaying={handleContinuePlaying}
            user={currentUser}
            onEditProfile={() => setCurrentPage('edit-profile')}
          />
        );
      case 'settings':
        return <Settings onBack={() => setCurrentPage('profile')} onNavigate={setCurrentPage} isAuthenticated={isAuthenticated} onLogout={logout} />;
      case 'login':
        return (
          <Auth 
            onBack={() => setCurrentPage('settings')} 
            onSuccess={() => setCurrentPage('profile')} 
          />
        );
      case 'account-management':
        return <AccountManagement onBack={() => setCurrentPage('settings')} user={currentUser} onEditProfile={() => setCurrentPage('edit-profile')} />;
      case 'language-settings':
        return <LanguageSettings onBack={() => setCurrentPage('settings')} />;
      case 'ai-settings':
        return <AISettings onBack={() => setCurrentPage('settings')} />;
      case 'switch-account':
        return <SwitchAccount onBack={() => setCurrentPage('settings')} onAddAccount={() => setCurrentPage('login')} />;
      case 'edit-profile':
        return (
          <EditProfile 
            onBack={() => setCurrentPage('profile')} 
            user={currentUser} 
            onSave={(data) => {
              // 更新用户信息
              console.log('更新用户信息:', data);
            }} 
          />
        );
      default:
        return <Discovery onSelectGame={handleGameSelect} onShowAllNotifications={() => setCurrentPage('notifications')} userGames={userGames} />;
    }
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans selection:bg-[#FF6B00]/20">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentPage}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {renderPage()}
        </motion.div>
      </AnimatePresence>

      {['discovery', 'profile'].includes(currentPage) && (
        <Navbar active={currentPage} onChange={setCurrentPage} />
      )}
      
      {/* 环境切换组件 */}
      <EnvironmentSwitcher />
    </div>
  );
}
