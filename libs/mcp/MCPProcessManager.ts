/**
 * MCP 进程管理器
 * 负责管理 MCP 服务器进程的生命周期
 */

import { MCPClient } from './MCPClient';
import {
    MCPServerConfig,
    MCPServerStatus,
    MCPTool,
    MCPToolCall,
    MCPToolResult,
    MCPResource,
    MCPError,
    MCP_ERROR_CODES,
    MCPEvent,
    MCPEventType
} from './types';
import { Logger } from '~utils/logger';

export class MCPProcessManager {
    private clients = new Map<string, MCPClient>();
    private serverStatuses = new Map<string, MCPServerStatus>();
    private eventListeners = new Map<string, ((event: MCPEvent) => void)[]>();
    private healthCheckInterval: NodeJS.Timeout | null = null;

    constructor() {
        // 启动健康检查
        this.startHealthCheck();
    }

    /**
     * 启动 MCP 服务器
     */
    async startServer(serverName: string, config: MCPServerConfig): Promise<void> {
        try {
            Logger.log(`[MCP] Starting server: ${serverName}`);

            // 更新状态为启动中
            this.updateServerStatus(serverName, {
                name: serverName,
                status: 'starting',
                startTime: Date.now()
            });

            // 创建客户端
            const client = new MCPClient(serverName, config);

            // 连接到服务器
            await client.connect();

            // 保存客户端
            this.clients.set(serverName, client);

            // 获取服务器信息和工具列表
            const [serverInfo, tools] = await Promise.all([
                client.getServerInfo().catch(() => null),
                client.listTools().catch(() => [])
            ]);

            // 更新状态为运行中
            this.updateServerStatus(serverName, {
                name: serverName,
                status: 'running',
                startTime: Date.now(),
                toolCount: tools.length,
                serverInfo: serverInfo ? {
                    name: serverInfo.serverInfo?.name || serverName,
                    version: serverInfo.serverInfo?.version || 'unknown',
                    protocolVersion: serverInfo.protocolVersion || 'unknown'
                } : undefined
            });

            // 触发事件
            this.emitEvent('server_started', serverName, {
                config,
                toolCount: tools.length,
                serverInfo
            });

            Logger.log(`[MCP] Server ${serverName} started successfully with ${tools.length} tools`);
        } catch (error) {
            Logger.error(`[MCP] Failed to start server ${serverName}:`, error);

            // 更新状态为错误
            this.updateServerStatus(serverName, {
                name: serverName,
                status: 'error',
                error: String(error)
            });

            // 触发事件
            this.emitEvent('server_error', serverName, { error: String(error) });

            throw new MCPError(
                `Failed to start MCP server ${serverName}: ${error}`,
                MCP_ERROR_CODES.SERVER_START_FAILED,
                serverName,
                error as Error
            );
        }
    }

    /**
     * 停止 MCP 服务器
     */
    async stopServer(serverName: string): Promise<void> {
        try {
            Logger.log(`[MCP] Stopping server: ${serverName}`);

            // 更新状态为停止中
            this.updateServerStatus(serverName, {
                name: serverName,
                status: 'stopping'
            });

            const client = this.clients.get(serverName);
            if (client) {
                await client.disconnect();
                this.clients.delete(serverName);
            }

            // 更新状态为已停止
            this.updateServerStatus(serverName, {
                name: serverName,
                status: 'stopped'
            });

            // 触发事件
            this.emitEvent('server_stopped', serverName, {});

            Logger.log(`[MCP] Server ${serverName} stopped successfully`);
        } catch (error) {
            Logger.error(`[MCP] Error stopping server ${serverName}:`, error);

            // 更新状态为错误
            this.updateServerStatus(serverName, {
                name: serverName,
                status: 'error',
                error: String(error)
            });

            throw new MCPError(
                `Failed to stop MCP server ${serverName}: ${error}`,
                MCP_ERROR_CODES.SERVER_START_FAILED,
                serverName,
                error as Error
            );
        }
    }

    /**
     * 重启 MCP 服务器
     */
    async restartServer(serverName: string, config: MCPServerConfig): Promise<void> {
        Logger.log(`[MCP] Restarting server: ${serverName}`);

        try {
            // 先停止
            if (this.clients.has(serverName)) {
                await this.stopServer(serverName);
            }

            // 等待一小段时间
            await new Promise(resolve => setTimeout(resolve, 1000));

            // 再启动
            await this.startServer(serverName, config);

            Logger.log(`[MCP] Server ${serverName} restarted successfully`);
        } catch (error) {
            Logger.error(`[MCP] Failed to restart server ${serverName}:`, error);
            throw error;
        }
    }

    /**
     * 获取服务器状态
     */
    getServerStatus(serverName: string): MCPServerStatus {
        return this.serverStatuses.get(serverName) || {
            name: serverName,
            status: 'stopped'
        };
    }

    /**
     * 获取所有服务器状态
     */
    getAllServerStatuses(): MCPServerStatus[] {
        return Array.from(this.serverStatuses.values());
    }

    /**
     * 列出指定服务器的工具
     */
    async listTools(serverName: string): Promise<MCPTool[]> {
        const client = this.clients.get(serverName);
        if (!client) {
            throw new MCPError(
                `Server ${serverName} is not running`,
                MCP_ERROR_CODES.SERVER_CONNECTION_FAILED,
                serverName
            );
        }

        return await client.listTools();
    }

    /**
     * 列出所有服务器的工具
     */
    async listAllTools(): Promise<MCPTool[]> {
        const allTools: MCPTool[] = [];

        for (const [serverName, client] of this.clients) {
            try {
                const tools = await client.listTools();
                allTools.push(...tools);
            } catch (error) {
                Logger.error(`[MCP] Failed to list tools for server ${serverName}:`, error);
            }
        }

        return allTools;
    }

    /**
     * 调用工具
     */
    async callTool(serverName: string, toolName: string, args: any, callId?: string): Promise<MCPToolResult> {
        const client = this.clients.get(serverName);
        if (!client) {
            throw new MCPError(
                `Server ${serverName} is not running`,
                MCP_ERROR_CODES.SERVER_CONNECTION_FAILED,
                serverName
            );
        }

        const toolCall: MCPToolCall = {
            toolName,
            args,
            serverName,
            callId
        };

        // 触发工具调用开始事件
        this.emitEvent('tool_call_started', serverName, { toolCall });

        try {
            const result = await client.callTool(toolCall);

            // 触发工具调用完成事件
            this.emitEvent('tool_call_completed', serverName, { toolCall, result });

            return result;
        } catch (error) {
            // 触发工具调用失败事件
            this.emitEvent('tool_call_failed', serverName, { toolCall, error: String(error) });
            throw error;
        }
    }

    /**
     * 列出服务器资源
     */
    async listResources(serverName: string): Promise<MCPResource[]> {
        const client = this.clients.get(serverName);
        if (!client) {
            throw new MCPError(
                `Server ${serverName} is not running`,
                MCP_ERROR_CODES.SERVER_CONNECTION_FAILED,
                serverName
            );
        }

        return await client.listResources();
    }

    /**
     * 读取资源
     */
    async readResource(serverName: string, uri: string): Promise<any> {
        const client = this.clients.get(serverName);
        if (!client) {
            throw new MCPError(
                `Server ${serverName} is not running`,
                MCP_ERROR_CODES.SERVER_CONNECTION_FAILED,
                serverName
            );
        }

        return await client.readResource(uri);
    }

    /**
     * 停止所有服务器
     */
    async stopAllServers(): Promise<void> {
        Logger.log('[MCP] Stopping all servers...');

        const stopPromises = Array.from(this.clients.keys()).map(serverName =>
            this.stopServer(serverName).catch(error =>
                Logger.error(`Failed to stop server ${serverName}:`, error)
            )
        );

        await Promise.all(stopPromises);

        // 停止健康检查
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = null;
        }

        Logger.log('[MCP] All servers stopped');
    }

    /**
     * 检查服务器健康状态
     */
    private async checkServerHealth(serverName: string): Promise<void> {
        const client = this.clients.get(serverName);
        if (!client) return;

        try {
            if (!client.isConnected()) {
                // 连接丢失，更新状态
                this.updateServerStatus(serverName, {
                    name: serverName,
                    status: 'error',
                    error: 'Connection lost'
                });

                this.emitEvent('server_error', serverName, { error: 'Connection lost' });
            }
        } catch (error) {
            Logger.error(`[MCP] Health check failed for server ${serverName}:`, error);
        }
    }

    /**
     * 启动健康检查
     */
    private startHealthCheck(): void {
        this.healthCheckInterval = setInterval(async () => {
            for (const serverName of this.clients.keys()) {
                await this.checkServerHealth(serverName);
            }
        }, 30000); // 每30秒检查一次
    }

    /**
     * 更新服务器状态
     */
    private updateServerStatus(serverName: string, status: Partial<MCPServerStatus>): void {
        const currentStatus = this.serverStatuses.get(serverName) || {
            name: serverName,
            status: 'stopped'
        };

        const newStatus = { ...currentStatus, ...status };
        this.serverStatuses.set(serverName, newStatus);
    }

    /**
     * 触发事件
     */
    private emitEvent(type: MCPEventType, serverName: string, data: any): void {
        const event: MCPEvent = {
            type,
            serverName,
            timestamp: Date.now(),
            data
        };

        // 触发全局监听器
        const globalListeners = this.eventListeners.get('*') || [];
        globalListeners.forEach(listener => {
            try {
                listener(event);
            } catch (error) {
                Logger.error('[MCP] Error in global event listener:', error);
            }
        });

        // 触发特定服务器监听器
        const serverListeners = this.eventListeners.get(serverName) || [];
        serverListeners.forEach(listener => {
            try {
                listener(event);
            } catch (error) {
                Logger.error(`[MCP] Error in server ${serverName} event listener:`, error);
            }
        });
    }

    /**
     * 添加事件监听器
     */
    addEventListener(serverName: string | '*', listener: (event: MCPEvent) => void): void {
        const listeners = this.eventListeners.get(serverName) || [];
        listeners.push(listener);
        this.eventListeners.set(serverName, listeners);
    }

    /**
     * 移除事件监听器
     */
    removeEventListener(serverName: string | '*', listener: (event: MCPEvent) => void): void {
        const listeners = this.eventListeners.get(serverName) || [];
        const index = listeners.indexOf(listener);
        if (index > -1) {
            listeners.splice(index, 1);
            this.eventListeners.set(serverName, listeners);
        }
    }
}
