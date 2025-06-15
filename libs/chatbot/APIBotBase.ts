import { BotBase } from './BotBase';
import { type IBot, type BotConstructorParams, type BotCompletionParams } from './IBot';
import { type ModelConfig } from './ModelConfigManager';
import { Logger } from '~utils/logger';

export interface APIBotConstructorParams extends BotConstructorParams {
    modelConfig: ModelConfig;
}

/**
 * API模式Bot的基类
 * 为所有API模式的Bot提供统一的接口和基础功能
 */
export abstract class APIBotBase extends BotBase implements IBot {
    protected modelConfig: ModelConfig;

    // 静态属性，用于在模型列表中显示
    static botName: string;
    static logoSrc: string;
    static loginUrl = '';
    static requireLogin = false;
    static supportUploadPDF = false;
    static supportUploadImage = false;
    static desc = '';
    static maxTokenLimit = 4000;
    static paidModel = true; // API模式通常是付费的
    static newModel = true;
    static supportMCPTools = true; // API模式支持MCP工具

    constructor(params: APIBotConstructorParams) {
        super(params);
        this.modelConfig = params.modelConfig;

        // 动态设置静态属性
        (this.constructor as any).botName = this.modelConfig.name;
        (this.constructor as any).logoSrc = this.modelConfig.logoSrc;
        (this.constructor as any).maxTokenLimit = this.modelConfig.maxTokens;
        (this.constructor as any).desc = this.modelConfig.description || `API模式: ${this.modelConfig.model}`;
    }

    // 实现IBot接口的方法
    getBotName(): string {
        return this.modelConfig.name;
    }

    getLogoSrc(): string {
        return this.modelConfig.logoSrc || '';
    }

    getLoginUrl(): string {
        return '';
    }

    getRequireLogin(): boolean {
        return false;
    }

    getSupportUploadPDF(): boolean {
        return false; // 暂时不支持，后续可以扩展
    }

    getSupportUploadImage(): boolean {
        return false; // 暂时不支持，后续可以扩展
    }

    getMaxTokenLimit(): number {
        return this.modelConfig.maxTokens;
    }

    getPaidModel(): boolean {
        return true;
    }

    getNewModel(): boolean {
        return true;
    }

    // 静态方法
    static async checkIsLogin(): Promise<[null, boolean]> {
        return [null, true]; // API模式不需要登录
    }

    static async checkModelCanUse(): Promise<boolean> {
        return true; // API模式只要配置正确就可以使用
    }

    // 需要子类实现的抽象方法
    abstract startAuth(): Promise<boolean>;
    abstract completion(params: BotCompletionParams): Promise<void>;
    abstract startCaptcha(): Promise<boolean>;
    abstract uploadFile(file: File): Promise<string>;

    // 默认的支持类型
    supportedUploadTypes: string[] = [];

    /**
     * 获取模型配置
     */
    getModelConfig(): ModelConfig {
        return this.modelConfig;
    }

    /**
     * 检查是否支持MCP工具
     */
    supportsMCPTools(): boolean {
        return this.modelConfig.supportsMCP;
    }

    /**
     * 验证API配置
     */
    protected validateConfig(): void {
        if (!this.modelConfig.apiKey) {
            throw new Error('API Key is required for API mode');
        }

        if (!this.modelConfig.model) {
            throw new Error('Model identifier is required');
        }
    }

    /**
     * 获取API请求头
     */
    protected getApiHeaders(): Record<string, string> {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json'
        };

        switch (this.modelConfig.provider) {
            case 'openai':
                headers['Authorization'] = `Bearer ${this.modelConfig.apiKey}`;
                break;
            case 'claude':
                headers['x-api-key'] = this.modelConfig.apiKey;
                headers['anthropic-version'] = '2023-06-01';
                break;
            case 'gemini':
                // Gemini通常在URL中传递API key
                break;
            default:
                headers['Authorization'] = `Bearer ${this.modelConfig.apiKey}`;
        }

        return headers;
    }

    /**
     * 获取API基础URL
     */
    protected getApiBaseUrl(): string {
        if (this.modelConfig.baseUrl) {
            return this.modelConfig.baseUrl;
        }

        // 默认URL
        switch (this.modelConfig.provider) {
            case 'openai':
                return 'https://api.openai.com/v1';
            case 'claude':
                return 'https://api.anthropic.com';
            case 'gemini':
                return 'https://generativelanguage.googleapis.com/v1';
            default:
                throw new Error(`Unknown provider: ${this.modelConfig.provider}`);
        }
    }

    /**
     * 处理API错误
     */
    protected handleApiError(error: any): Error {
        Logger.error('API request failed:', error);

        if (error.response) {
            const status = error.response.status;
            const data = error.response.data;

            switch (status) {
                case 401:
                    return new Error('API密钥无效或已过期');
                case 403:
                    return new Error('API访问被拒绝，请检查权限');
                case 429:
                    return new Error('API请求频率超限，请稍后重试');
                case 500:
                    return new Error('API服务器内部错误');
                default:
                    return new Error(data?.error?.message || `API请求失败 (${status})`);
            }
        }

        if (error.code === 'NETWORK_ERROR') {
            return new Error('网络连接失败，请检查网络设置');
        }

        return new Error(error.message || 'API请求失败');
    }
}

/**
 * 创建API模式Bot的工厂函数
 */
export function createAPIBot(modelConfig: ModelConfig, conversationId: string): APIBotBase {
    // 根据provider创建对应的Bot实例
    switch (modelConfig.provider) {
        case 'openai':
            const { OpenAIAPIBot } = require('./openai/OpenAIAPIBot');
            return new OpenAIAPIBot({ globalConversationId: conversationId, modelConfig });
        case 'claude':
            // 这里应该返回ClaudeAPIBot实例
            // return new ClaudeAPIBot({ globalConversationId: conversationId, modelConfig });
            throw new Error('Claude API Bot not implemented yet');
        case 'gemini':
            // 这里应该返回GeminiAPIBot实例
            // return new GeminiAPIBot({ globalConversationId: conversationId, modelConfig });
            throw new Error('Gemini API Bot not implemented yet');
        default:
            throw new Error(`Unsupported provider: ${modelConfig.provider}`);
    }
}
