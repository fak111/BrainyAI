/**
 * 浏览器兼容的 MCP 客户端封装
 * 使用 HTTP 或 WebSocket 传输而不是 stdio
 */

// import { Client } from '@modelcontextprotocol/sdk/client'; // 不在浏览器环境中使用
import {
    MCPServerConfig,
    MCPTool,
    MCPToolCall,
    MCPToolResult,
    MCPResource,
    MCPError,
    MCP_ERROR_CODES
} from './types';
import { Logger } from '~utils/logger';

// 浏览器兼容的服务器配置
export interface BrowserMCPServerConfig {
    name: string;
    url: string; // HTTP端点或WebSocket URL
    type: 'http' | 'websocket';
    timeout?: number;
    headers?: Record<string, string>;
}

export class BrowserMCPClient {
    // private client: Client | null = null; // 不在浏览器环境中使用
    private connected = false;
    private serverName: string;
    private config: BrowserMCPServerConfig;

    constructor(serverName: string, config: BrowserMCPServerConfig) {
        this.serverName = serverName;
        this.config = config;
    }

    /**
     * 连接到 MCP 服务器（通过HTTP代理）
     */
    async connect(): Promise<void> {
        try {
            Logger.log(`[BrowserMCP] Connecting to server: ${this.serverName} via ${this.config.type}`);

            if (this.config.type === 'http') {
                // 测试连接到代理服务器
                const response = await fetch(`${this.config.url}/health`);
                if (response.ok) {
                    this.connected = true;
                    Logger.log(`[BrowserMCP] Successfully connected to proxy server`);
                } else {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
            } else {
                throw new Error(`Unsupported connection type: ${this.config.type}`);
            }

        } catch (error) {
            Logger.error(`[BrowserMCP] Failed to connect to server ${this.serverName}:`, error);
            throw new MCPError(
                `Failed to connect to MCP server: ${error}`,
                MCP_ERROR_CODES.SERVER_CONNECTION_FAILED,
                this.serverName,
                error as Error
            );
        }
    }

    /**
     * 断开连接
     */
    async disconnect(): Promise<void> {
        this.connected = false;
        Logger.log(`[BrowserMCP] Disconnected from server: ${this.serverName}`);
    }

    /**
     * 检查连接状态
     */
    isConnected(): boolean {
        return this.connected;
    }

    /**
     * 通过 HTTP API 调用工具（临时方案）
     */
    async callToolViaHTTP(toolCall: MCPToolCall): Promise<MCPToolResult> {
        const startTime = Date.now();

        try {
            Logger.log(`[BrowserMCP] Calling tool ${toolCall.toolName} via HTTP on server ${this.serverName}`, toolCall.args);

            const response = await fetch(`${this.config.url}/tools/call`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...this.config.headers
                },
                body: JSON.stringify({
                    name: toolCall.toolName,
                    arguments: toolCall.args || {}
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            const duration = Date.now() - startTime;

            const result: MCPToolResult = {
                callId: toolCall.callId,
                success: true,
                data: data,
                duration,
                timestamp: Date.now()
            };

            Logger.log(`[BrowserMCP] Tool call successful in ${duration}ms:`, result);
            return result;

        } catch (error) {
            const duration = Date.now() - startTime;
            Logger.error(`[BrowserMCP] Tool call failed for ${toolCall.toolName}:`, error);

            throw new MCPError(
                `Tool call failed: ${error}`,
                MCP_ERROR_CODES.TOOL_CALL_FAILED,
                this.serverName,
                error as Error
            );
        }
    }

    /**
     * 通过 HTTP API 获取工具列表
     */
    async listToolsViaHTTP(): Promise<MCPTool[]> {
        try {
            const response = await fetch(`${this.config.url}/tools/list`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    ...this.config.headers
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            const tools: MCPTool[] = data.tools?.map((tool: any) => ({
                name: tool.name,
                description: tool.description,
                inputSchema: tool.inputSchema,
                serverName: this.serverName
            })) || [];

            Logger.log(`[BrowserMCP] Listed ${tools.length} tools from server: ${this.serverName}`, tools);
            return tools;
        } catch (error) {
            Logger.error(`[BrowserMCP] Failed to list tools for ${this.serverName}:`, error);
            throw new MCPError(
                `Failed to list tools: ${error}`,
                MCP_ERROR_CODES.TOOL_CALL_FAILED,
                this.serverName,
                error as Error
            );
        }
    }

    /**
     * 获取服务器名称
     */
    getServerName(): string {
        return this.serverName;
    }

    /**
     * 启动MCP服务（通过代理服务器）
     */
    async startMCPService(command: string, args: string[], cwd?: string): Promise<void> {
        try {
            const response = await fetch(`${this.config.url}/mcp/start`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    serverName: this.serverName,
                    command,
                    args,
                    cwd
                })
            });

            const result = await response.json();
            if (!result.success) {
                throw new Error(result.error);
            }

            Logger.log(`[BrowserMCP] MCP service started: ${this.serverName}`);
        } catch (error) {
            Logger.error(`[BrowserMCP] Failed to start MCP service:`, error);
            throw new MCPError(
                `Failed to start MCP service: ${error}`,
                MCP_ERROR_CODES.SERVER_START_FAILED,
                this.serverName,
                error as Error
            );
        }
    }

    /**
     * 调用MCP工具（增强版）
     */
    async callTool(toolName: string, args: any = {}, prompt?: string): Promise<any> {
        try {
            Logger.log(`[BrowserMCP] Calling tool ${toolName} with args:`, args);

            const response = await fetch(`${this.config.url}/mcp/call`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    serverName: this.serverName,
                    toolName,
                    args,
                    prompt
                })
            });

            const result = await response.json();
            if (!result.success) {
                throw new Error(result.error);
            }

            Logger.log(`[BrowserMCP] Tool call successful:`, result);
            return result.result;

        } catch (error) {
            Logger.error(`[BrowserMCP] Tool call failed:`, error);
            throw new MCPError(
                `Tool call failed: ${error}`,
                MCP_ERROR_CODES.TOOL_CALL_FAILED,
                this.serverName,
                error as Error
            );
        }
    }

    /**
     * 停止MCP服务
     */
    async stopMCPService(): Promise<void> {
        try {
            const response = await fetch(`${this.config.url}/mcp/stop`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    serverName: this.serverName
                })
            });

            const result = await response.json();
            if (!result.success) {
                throw new Error(result.error);
            }

            Logger.log(`[BrowserMCP] MCP service stopped: ${this.serverName}`);
        } catch (error) {
            Logger.error(`[BrowserMCP] Failed to stop MCP service:`, error);
            throw error;
        }
    }

    /**
     * 获取配置
     */
    getConfig(): BrowserMCPServerConfig {
        return this.config;
    }
}
