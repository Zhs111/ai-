// AI配置管理模块
// 支持用户自定义AI API配置

export type AIProvider = 'gemini' | 'openai' | 'claude' | 'custom';

export interface AIConfig {
  provider: AIProvider;
  apiKey: string;
  apiUrl?: string;  // 自定义API端点
  model: string;
  temperature: number;
  maxTokens: number;
  enabled: boolean;
}

// 默认配置
export const DEFAULT_AI_CONFIG: AIConfig = {
  provider: 'gemini',
  apiKey: '',
  model: 'gemini-1.5-flash',
  temperature: 0.7,
  maxTokens: 2048,
  enabled: false,
};

// 预设模型列表
export const AI_MODELS: Record<AIProvider, string[]> = {
  gemini: ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-2.0-flash-exp'],
  openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  claude: ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229', 'claude-3-haiku-20240307'],
  custom: ['custom-model'],
};

// 默认API端点
export const DEFAULT_API_URLS: Record<AIProvider, string> = {
  gemini: 'https://generativelanguage.googleapis.com/v1beta/models',
  openai: 'https://api.openai.com/v1/chat/completions',
  claude: 'https://api.anthropic.com/v1/messages',
  custom: '',
};

// 从localStorage加载配置
export function loadAIConfig(): AIConfig {
  try {
    const saved = localStorage.getItem('ai_config');
    if (saved) {
      return { ...DEFAULT_AI_CONFIG, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.error('Failed to load AI config:', e);
  }
  return DEFAULT_AI_CONFIG;
}

// 保存配置到localStorage
export function saveAIConfig(config: AIConfig): void {
  try {
    localStorage.setItem('ai_config', JSON.stringify(config));
  } catch (e) {
    console.error('Failed to save AI config:', e);
  }
}

// 检查配置是否有效
export function isAIConfigValid(config: AIConfig): boolean {
  if (!config.enabled) return false;
  if (!config.apiKey) return false;
  if (config.provider === 'custom' && !config.apiUrl) return false;
  return true;
}

// AI服务类
export class AIService {
  private config: AIConfig;

  constructor(config?: AIConfig) {
    this.config = config || loadAIConfig();
  }

  updateConfig(config: AIConfig) {
    this.config = config;
  }

  // 发送消息到AI
  async sendMessage(messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>): Promise<string> {
    if (!isAIConfigValid(this.config)) {
      throw new Error('AI配置无效，请在设置中配置API密钥');
    }

    switch (this.config.provider) {
      case 'gemini':
        return this.sendToGemini(messages);
      case 'openai':
        return this.sendToOpenAI(messages);
      case 'claude':
        return this.sendToClaude(messages);
      case 'custom':
        return this.sendToCustom(messages);
      default:
        throw new Error('不支持的AI提供商');
    }
  }

  private async sendToGemini(messages: Array<{ role: string; content: string }>): Promise<string> {
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey: this.config.apiKey });

    // 转换消息格式
    const contents = messages.map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    }));

    const response = await ai.models.generateContent({
      model: this.config.model,
      contents,
      config: {
        temperature: this.config.temperature,
        maxOutputTokens: this.config.maxTokens,
      },
    });

    return response.text || '无响应';
  }

  private async sendToOpenAI(messages: Array<{ role: string; content: string }>): Promise<string> {
    const response = await fetch(DEFAULT_API_URLS.openai, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model,
        messages,
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'OpenAI API请求失败');
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '无响应';
  }

  private async sendToClaude(messages: Array<{ role: string; content: string }>): Promise<string> {
    const systemMessage = messages.find(m => m.role === 'system');
    const userMessages = messages.filter(m => m.role !== 'system');

    const response = await fetch(DEFAULT_API_URLS.claude, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: userMessages.map(m => ({
          role: m.role,
          content: m.content,
        })),
        system: systemMessage?.content,
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Claude API请求失败');
    }

    const data = await response.json();
    return data.content[0]?.text || '无响应';
  }

  private async sendToCustom(messages: Array<{ role: string; content: string }>): Promise<string> {
    if (!this.config.apiUrl) {
      throw new Error('自定义API需要配置API端点URL');
    }

    const response = await fetch(this.config.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model,
        messages,
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || error.message || '自定义API请求失败');
    }

    const data = await response.json();
    // 尝试多种可能的响应格式
    return data.choices?.[0]?.message?.content 
      || data.content?.[0]?.text 
      || data.response 
      || data.text 
      || JSON.stringify(data);
  }
}

// 导出单例
export const aiService = new AIService();
