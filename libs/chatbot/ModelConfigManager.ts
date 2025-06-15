import { Storage } from "@plasmohq/storage";
import { Logger } from "~utils/logger";

export interface ModelConfig {
    id: string;
    name: string;
    provider: 'openai' | 'claude' | 'gemini' | 'custom';
    mode: 'web' | 'api';
    apiKey?: string;
    baseUrl?: string;
    model: string;
    supportsMCP: boolean;
    maxTokens: number;
    temperature: number;
    description?: string;
    logoSrc?: string;
    createdAt: Date;
    updatedAt: Date;
}

export class ModelConfigManager {
    private storage: Storage;
    private static instance: ModelConfigManager;
    private configs: Map<string, ModelConfig> = new Map();
    private readonly STORAGE_KEY = 'api_model_configs';

    private constructor() {
        this.storage = new Storage();
        this.loadConfigs();
    }

    static getInstance(): ModelConfigManager {
        if (!ModelConfigManager.instance) {
            ModelConfigManager.instance = new ModelConfigManager();
        }
        return ModelConfigManager.instance;
    }

    /**
     * 从存储加载配置
     */
    private async loadConfigs(): Promise<void> {
        try {
            const stored = await this.storage.get<ModelConfig[]>(this.STORAGE_KEY);
            if (stored && Array.isArray(stored)) {
                this.configs.clear();
                stored.forEach(config => {
                    // 确保日期对象正确转换
                    config.createdAt = new Date(config.createdAt);
                    config.updatedAt = new Date(config.updatedAt);
                    this.configs.set(config.id, config);
                });
                Logger.log('Loaded API model configs:', this.configs.size);
            }
        } catch (error) {
            Logger.error('Failed to load model configs:', error);
        }
    }

    /**
     * 保存配置到存储
     */
    private async saveConfigs(): Promise<void> {
        try {
            const configArray = Array.from(this.configs.values());
            await this.storage.set(this.STORAGE_KEY, configArray);
            Logger.log('Saved API model configs:', configArray.length);
        } catch (error) {
            Logger.error('Failed to save model configs:', error);
            throw error;
        }
    }

    /**
     * 添加新的模型配置
     */
    async addConfig(config: Omit<ModelConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<ModelConfig> {
        const id = this.generateId();
        const now = new Date();

        const newConfig: ModelConfig = {
            ...config,
            id,
            createdAt: now,
            updatedAt: now,
            // 设置默认值
            maxTokens: config.maxTokens || 4000,
            temperature: config.temperature || 0.7,
            supportsMCP: config.supportsMCP ?? true,
            logoSrc: config.logoSrc || this.getDefaultLogoSrc(config.provider)
        };

        // 验证配置
        await this.validateConfig(newConfig);

        this.configs.set(id, newConfig);
        await this.saveConfigs();

        Logger.log('Added new model config:', newConfig.name);
        return newConfig;
    }

    /**
     * 获取模型配置
     */
    async getConfig(id: string): Promise<ModelConfig | null> {
        return this.configs.get(id) || null;
    }

    /**
     * 获取所有配置
     */
    async listConfigs(): Promise<ModelConfig[]> {
        return Array.from(this.configs.values()).sort((a, b) =>
            b.updatedAt.getTime() - a.updatedAt.getTime()
        );
    }

    /**
     * 更新模型配置
     */
    async updateConfig(id: string, updates: Partial<Omit<ModelConfig, 'id' | 'createdAt'>>): Promise<ModelConfig> {
        const existing = this.configs.get(id);
        if (!existing) {
            throw new Error(`Model config not found: ${id}`);
        }

        const updated: ModelConfig = {
            ...existing,
            ...updates,
            id, // 确保ID不被修改
            createdAt: existing.createdAt, // 确保创建时间不被修改
            updatedAt: new Date()
        };

        // 验证更新后的配置
        await this.validateConfig(updated);

        this.configs.set(id, updated);
        await this.saveConfigs();

        Logger.log('Updated model config:', updated.name);
        return updated;
    }

    /**
     * 删除模型配置
     */
    async deleteConfig(id: string): Promise<boolean> {
        const config = this.configs.get(id);
        if (!config) {
            return false;
        }

        this.configs.delete(id);
        await this.saveConfigs();

        Logger.log('Deleted model config:', config.name);
        return true;
    }

    /**
     * 验证模型配置
     */
    async validateConfig(config: ModelConfig): Promise<boolean> {
        // 基本字段验证
        if (!config.name?.trim()) {
            throw new Error('Model name is required');
        }

        if (!config.provider) {
            throw new Error('Provider is required');
        }

        if (!config.model?.trim()) {
            throw new Error('Model identifier is required');
        }

        // API模式需要API Key
        if (config.mode === 'api' && !config.apiKey?.trim()) {
            throw new Error('API Key is required for API mode');
        }

        // 检查名称是否重复
        const existing = Array.from(this.configs.values()).find(
            c => c.id !== config.id && c.name.toLowerCase() === config.name.toLowerCase()
        );
        if (existing) {
            throw new Error('Model name already exists');
        }

        // 验证数值范围
        if (config.maxTokens < 1 || config.maxTokens > 200000) {
            throw new Error('Max tokens must be between 1 and 200000');
        }

        if (config.temperature < 0 || config.temperature > 2) {
            throw new Error('Temperature must be between 0 and 2');
        }

        // 如果提供了baseUrl，验证URL格式
        if (config.baseUrl && !this.isValidUrl(config.baseUrl)) {
            throw new Error('Invalid base URL format');
        }

        return true;
    }

    /**
     * 测试API连接
     */
    async testConnection(config: ModelConfig): Promise<{ success: boolean; error?: string }> {
        if (config.mode !== 'api') {
            return { success: true };
        }

        try {
            // 这里应该根据不同的provider实现具体的连接测试
            // 暂时返回成功，后续可以扩展
            Logger.log('Testing connection for:', config.name);

            // TODO: 实现具体的API连接测试
            // 例如调用一个简单的API来验证key是否有效

            return { success: true };
        } catch (error) {
            Logger.error('Connection test failed:', error);
            return {
                success: false,
                error: error.message || 'Connection test failed'
            };
        }
    }

    /**
     * 生成唯一ID
     */
    private generateId(): string {
        return `api_model_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * 获取默认Logo
     */
    private getDefaultLogoSrc(provider: string): string {
        const logoMap = {
            'openai': 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJMMTMuMDkgOC4yNkwyMCA5TDEzLjA5IDE1Ljc0TDEyIDIyTDEwLjkxIDE1Ljc0TDQgOUwxMC45MSA4LjI2TDEyIDJaIiBmaWxsPSIjMDBBNjdFIi8+Cjwvc3ZnPgo=',
            'claude': 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJMMTMuMDkgOC4yNkwyMCA5TDEzLjA5IDE1Ljc0TDEyIDIyTDEwLjkxIDE1Ljc0TDQgOUwxMC45MSA4LjI2TDEyIDJaIiBmaWxsPSIjRkY2QzM3Ii8+Cjwvc3ZnPgo=',
            'gemini': 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJMMTMuMDkgOC4yNkwyMCA5TDEzLjA5IDE1Ljc0TDEyIDIyTDEwLjkxIDE1Ljc0TDQgOUwxMC45MSA4LjI2TDEyIDJaIiBmaWxsPSIjNDI4NUY0Ii8+Cjwvc3ZnPgo=',
            'custom': 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJMMTMuMDkgOC4yNkwyMCA5TDEzLjA5IDE1Ljc0TDEyIDIyTDEwLjkxIDE1Ljc0TDQgOUwxMC45MSA4LjI2TDEyIDJaIiBmaWxsPSIjNkI3Mjg0Ii8+Cjwvc3ZnPgo='
        };
        return logoMap[provider] || logoMap['custom'];
    }

    /**
     * 验证URL格式
     */
    private isValidUrl(url: string): boolean {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * 获取预设模板
     */
    getPresetTemplates(): Partial<ModelConfig>[] {
        return [
            {
                name: 'GPT-4',
                provider: 'openai',
                mode: 'api',
                model: 'gpt-4',
                baseUrl: 'https://api.openai.com/v1',
                maxTokens: 8000,
                temperature: 0.7,
                supportsMCP: true,
                description: 'OpenAI GPT-4 model with tool calling support'
            },
            {
                name: 'GPT-3.5 Turbo',
                provider: 'openai',
                mode: 'api',
                model: 'gpt-3.5-turbo',
                baseUrl: 'https://api.openai.com/v1',
                maxTokens: 4000,
                temperature: 0.7,
                supportsMCP: true,
                description: 'OpenAI GPT-3.5 Turbo with tool calling support'
            },
            {
                name: 'Claude 3 Haiku',
                provider: 'claude',
                mode: 'api',
                model: 'claude-3-haiku-20240307',
                baseUrl: 'https://api.anthropic.com',
                maxTokens: 4000,
                temperature: 0.7,
                supportsMCP: true,
                description: 'Anthropic Claude 3 Haiku model'
            },
            {
                name: 'Gemini Pro',
                provider: 'gemini',
                mode: 'api',
                model: 'gemini-pro',
                baseUrl: 'https://generativelanguage.googleapis.com/v1',
                maxTokens: 4000,
                temperature: 0.7,
                supportsMCP: false,
                description: 'Google Gemini Pro model'
            }
        ];
    }
}

export const modelConfigManager = ModelConfigManager.getInstance();
