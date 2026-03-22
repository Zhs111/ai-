export interface UserProfile {
  id: string;
  email: string;
  username: string;
  avatar_url?: string;
  bio?: string;
  created_at: string;
  updated_at: string;
}

export interface Game {
  id: string;
  title: string;
  description: string;
  cover: string;
  category: string;
  plays: number;
  likes: number;
  author_id: string;
  author_username: string;
  author_avatar: string;
  tags: string[];
  plot?: string;
  gameplay?: string;
  player_identity?: string;
  game_goal?: string;
  status: 'draft' | 'published' | 'offline';
  npcs?: GameNPC[];
  custom_rules?: { name: string; type: string; desc: string }[];
  created_at: string;
  updated_at: string;
}

export interface GameNPC {
  id: string;
  game_id: string;
  name: string;
  avatar: string;
  card_image?: string;
  description: string;
  personality: string;
  relationship: string;
  background: string;
}

export interface AuthResponse {
  user: UserProfile | null;
  session: any;
  error?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}
