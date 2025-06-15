/**
 * MCP 客户端封装
 * 负责与 MCP 服务器的通信和协议处理
 * 注意：此实现依赖Node.js功能，在浏览器环境中不可用
 */

// 注意：这些导入在浏览器环境中无法使用，因为它们依赖Node.js的stdio和进程功能
// import { Client } from '@modelcontextprotocol/sdk/client';
// import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio';
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

// 注意：这个类在浏览器环境中无法使用，请使用 BrowserMCPClient 代替
// MCPClient依赖Node.js的stdio和进程功能，在浏览器扩展中无法运行
export class MCPClient {
    private connected = false;
    private serverName: string;
    private config: MCPServerConfig;

    constructor(serverName: string, config: MCPServerConfig) {
        this.serverName = serverName;
        this.config = config;
        // 在浏览器环境中，这个类不应该被实例化
        Logger.warn(`[MCP] MCPClient is not supported in browser environment. Use BrowserMCPClient instead.`);
    }

    /**
     * 连接到 MCP 服务器
     * 注意：在浏览器环境中此方法不可用
     */
    async connect(): Promise<void> {
            throw new MCPError(
            'MCPClient.connect() is not supported in browser environment. Use BrowserMCPClient instead.',
                MCP_ERROR_CODES.SERVER_CONNECTION_FAILED,
            this.serverName
            );
    }

    /**
     * 断开连接
     */
    async disconnect(): Promise<void> {
        Logger.warn(`[MCP] MCPClient.disconnect() is not supported in browser environment.`);
    }

    /**
     * 检查连接状态
     */
    isConnected(): boolean {
        return false;
    }

    /**
     * 获取服务器信息
     */
    async getServerInfo(): Promise<any> {
            throw new MCPError(
            'MCPClient methods are not supported in browser environment.',
                MCP_ERROR_CODES.SERVER_CONNECTION_FAILED,
                this.serverName
            );
    }

    /**
     * 列出可用工具
     */
    async listTools(): Promise<MCPTool[]> {
            throw new MCPError(
            'MCPClient methods are not supported in browser environment.',
            MCP_ERROR_CODES.TOOL_CALL_FAILED,
                this.serverName
            );
    }

    /**
     * 调用工具
     */
    async callTool(toolCall: MCPToolCall): Promise<MCPToolResult> {
            throw new MCPError(
            'MCPClient methods are not supported in browser environment.',
            MCP_ERROR_CODES.TOOL_CALL_FAILED,
                this.serverName
            );
    }

    /**
     * 列出可用资源
     */
    async listResources(): Promise<MCPResource[]> {
            throw new MCPError(
            'MCPClient methods are not supported in browser environment.',
                MCP_ERROR_CODES.SERVER_CONNECTION_FAILED,
                this.serverName
            );
    }

    /**
     * 读取资源内容
     */
    async readResource(uri: string): Promise<any> {
            throw new MCPError(
            'MCPClient methods are not supported in browser environment.',
                MCP_ERROR_CODES.SERVER_CONNECTION_FAILED,
                this.serverName
            );
    }

    /**
     * 获取服务器名称
     */
    getServerName(): string {
        return this.serverName;
    }

    /**
     * 获取服务器配置
     */
    getConfig(): MCPServerConfig {
        return this.config;
    }
}
