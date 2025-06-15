import { APIBotBase, type APIBotConstructorParams } from '../APIBotBase';
import { type BotCompletionParams } from '../IBot';
import { ConversationResponse, ResponseMessageType } from '~libs/open-ai/open-ai-interface';
import { Logger } from '~utils/logger';

interface OpenAIMessage {
    role: 'system' | 'user' | 'assistant' | 'tool';
    content: string;
    tool_calls?: any[];
    tool_call_id?: string;
}

interface OpenAICompletionRequest {
    model: string;
    messages: OpenAIMessage[];
    temperature?: number;
    max_tokens?: number;
    stream?: boolean;
    tools?: any[];
    tool_choice?: string | object;
}

export class OpenAIAPIBot extends APIBotBase {
    private messages: OpenAIMessage[] = [];

    constructor(params: APIBotConstructorParams) {
        super(params);
        this.validateConfig();
    }

    async startAuth(): Promise<boolean> {
        // API模式不需要认证流程
        return true;
    }

    async startCaptcha(): Promise<boolean> {
        // API模式不需要验证码
        return true;
    }

    async uploadFile(file: File): Promise<string> {
        // 暂时不支持文件上传
        throw new Error('File upload not supported yet');
    }

    async completion(params: BotCompletionParams): Promise<void> {
        const { prompt, rid, cb } = params;

        try {
            // 添加用户消息到对话历史
            this.messages.push({
                role: 'user',
                content: prompt
            });

            // 构建请求
            const requestBody: OpenAICompletionRequest = {
                model: this.modelConfig.model,
                messages: this.messages,
                temperature: this.modelConfig.temperature,
                max_tokens: this.modelConfig.maxTokens,
                stream: true
            };

            // 如果支持MCP工具，添加工具定义
            if (this.modelConfig.supportsMCP) {
                // TODO: 从MCP服务获取可用工具
                // requestBody.tools = await this.getMCPTools();
                // requestBody.tool_choice = 'auto';
            }

            const response = await this.makeStreamRequest(requestBody, rid, cb);

        } catch (error) {
            Logger.error('OpenAI API completion failed:', error);
            const apiError = this.handleApiError(error);

            cb(rid, {
                error: true,
                errorMessage: apiError.message,
                conversationId: this.conversationId,
                messageId: rid
            });
        }
    }

    private async makeStreamRequest(
        requestBody: OpenAICompletionRequest,
        rid: string,
        cb: (rid: string, response: ConversationResponse) => void
    ): Promise<void> {
        const url = `${this.getApiBaseUrl()}/chat/completions`;
        const headers = this.getApiHeaders();

        Logger.log('Making OpenAI API request:', { url, model: requestBody.model });

        const response = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw {
                response: {
                    status: response.status,
                    data: errorData
                }
            };
        }

        if (!response.body) {
            throw new Error('Response body is null');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let fullContent = '';
        let toolCalls: any[] = [];

        try {
            while (true) {
                const { done, value } = await reader.read();

                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.trim() === '') continue;
                    if (line.trim() === 'data: [DONE]') continue;

                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));
                            const delta = data.choices?.[0]?.delta;

                            if (delta?.content) {
                                fullContent += delta.content;

                                // 发送增量响应
                                cb(rid, new ConversationResponse({
                                    conversation_id: this.conversationId,
                                    message_id: rid,
                                    message_text: fullContent,
                                    message_type: ResponseMessageType.GENERATING
                                }));
                            }

                            // 处理工具调用
                            if (delta?.tool_calls) {
                                toolCalls = this.mergeToolCalls(toolCalls, delta.tool_calls);
                            }

                            // 检查是否完成
                            if (data.choices?.[0]?.finish_reason) {
                                const finishReason = data.choices[0].finish_reason;

                                if (finishReason === 'tool_calls' && toolCalls.length > 0) {
                                    // 处理工具调用
                                    await this.handleToolCalls(toolCalls, rid, cb);
                                } else {
                                    // 添加助手消息到历史
                                    this.messages.push({
                                        role: 'assistant',
                                        content: fullContent,
                                        tool_calls: toolCalls.length > 0 ? toolCalls : undefined
                                    });

                                    // 发送最终响应
                                    cb(rid, new ConversationResponse({
                                        conversation_id: this.conversationId,
                                        message_id: rid,
                                        message_text: fullContent,
                                        message_type: ResponseMessageType.DONE
                                    }));
                                }
                                return;
                            }
                        } catch (parseError) {
                            Logger.error('Failed to parse SSE data:', parseError, line);
                        }
                    }
                }
            }
        } finally {
            reader.releaseLock();
        }
    }

    private mergeToolCalls(existing: any[], newCalls: any[]): any[] {
        const merged = [...existing];

        for (const newCall of newCalls) {
            const existingIndex = merged.findIndex(call => call.index === newCall.index);

            if (existingIndex >= 0) {
                // 合并现有的工具调用
                const existingCall = merged[existingIndex];
                if (newCall.function?.arguments) {
                    existingCall.function.arguments = (existingCall.function.arguments || '') + newCall.function.arguments;
                }
                if (newCall.function?.name) {
                    existingCall.function.name = newCall.function.name;
                }
            } else {
                // 添加新的工具调用
                merged.push({
                    id: newCall.id,
                    type: newCall.type || 'function',
                    function: {
                        name: newCall.function?.name || '',
                        arguments: newCall.function?.arguments || ''
                    },
                    index: newCall.index
                });
            }
        }

        return merged;
    }

    private async handleToolCalls(
        toolCalls: any[],
        rid: string,
        cb: (rid: string, response: ConversationResponse) => void
    ): Promise<void> {
        Logger.log('Handling tool calls:', toolCalls);

        // 添加助手消息（包含工具调用）
        this.messages.push({
            role: 'assistant',
            content: '',
            tool_calls: toolCalls
        });

        // 通知用户正在执行工具
        cb(rid, new ConversationResponse({
            conversation_id: this.conversationId,
            message_id: rid,
            message_text: '🔧 正在执行工具调用...',
            message_type: ResponseMessageType.GENERATING
        }));

        // 执行工具调用
        const toolResults = await Promise.all(
            toolCalls.map(async (toolCall) => {
                try {
                    // TODO: 集成MCP工具调用
                    // const result = await this.executeMCPTool(toolCall.function.name, JSON.parse(toolCall.function.arguments));
                    const result = { success: true, message: 'Tool execution not implemented yet' };

                    return {
                        tool_call_id: toolCall.id,
                        role: 'tool' as const,
                        content: JSON.stringify(result)
                    };
                } catch (error) {
                    Logger.error('Tool execution failed:', error);
                    return {
                        tool_call_id: toolCall.id,
                        role: 'tool' as const,
                        content: JSON.stringify({ error: error.message })
                    };
                }
            })
        );

        // 添加工具结果到消息历史
        this.messages.push(...toolResults);

        // 继续对话以获取最终响应
        const followUpRequest: OpenAICompletionRequest = {
            model: this.modelConfig.model,
            messages: this.messages,
            temperature: this.modelConfig.temperature,
            max_tokens: this.modelConfig.maxTokens,
            stream: true
        };

        await this.makeStreamRequest(followUpRequest, rid, cb);
    }

    // TODO: 集成MCP工具
    private async getMCPTools(): Promise<any[]> {
        // 这里应该从MCP服务获取可用工具
        return [];
    }

    private async executeMCPTool(toolName: string, args: any): Promise<any> {
        // 这里应该调用MCP工具
        throw new Error('MCP tool execution not implemented yet');
    }
}
