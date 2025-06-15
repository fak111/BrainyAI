/**
 * MCP 进程管理后台消息处理器
 * 处理来自前端的 MCP 相关请求
 */

import type { PlasmoMessaging } from "@plasmohq/messaging";
import { MCPProcessManager } from "~libs/mcp/MCPProcessManager";
import { MCPServerConfig } from "~libs/mcp/types";
import { Logger } from "~utils/logger";

// 全局 MCP 进程管理器实例
let mcpManager: MCPProcessManager | null = null;

// 确保管理器初始化
function ensureMCPManager(): MCPProcessManager {
    if (!mcpManager) {
        mcpManager = new MCPProcessManager();

        // 监听全局事件
        mcpManager.addEventListener('*', (event) => {
            Logger.log(`[MCP Event] ${event.type} for server ${event.serverName}:`, event.data);
        });
    }
    return mcpManager;
}

export interface MCPProcessRequest {
    action: 'start' | 'stop' | 'restart' | 'status' | 'list-status' | 'list-tools' | 'call-tool';
    serverName?: string;
    config?: MCPServerConfig;
    toolName?: string;
    args?: any;
    callId?: string;
}

export interface MCPProcessResponse {
    success: boolean;
    data?: any;
    error?: string;
}

const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
    const { action, serverName, config, toolName, args, callId }: MCPProcessRequest = req.body;

    try {
        const manager = ensureMCPManager();
        let result: any = null;

        switch (action) {
            case 'start':
                if (!serverName || !config) {
                    throw new Error('serverName and config are required for start action');
                }
                await manager.startServer(serverName, config);
                result = { message: `Server ${serverName} started successfully` };
                break;

            case 'stop':
                if (!serverName) {
                    throw new Error('serverName is required for stop action');
                }
                await manager.stopServer(serverName);
                result = { message: `Server ${serverName} stopped successfully` };
                break;

            case 'restart':
                if (!serverName || !config) {
                    throw new Error('serverName and config are required for restart action');
                }
                await manager.restartServer(serverName, config);
                result = { message: `Server ${serverName} restarted successfully` };
                break;

            case 'status':
                if (!serverName) {
                    throw new Error('serverName is required for status action');
                }
                result = manager.getServerStatus(serverName);
                break;

            case 'list-status':
                result = manager.getAllServerStatuses();
                break;

            case 'list-tools':
                if (serverName) {
                    result = await manager.listTools(serverName);
                } else {
                    result = await manager.listAllTools();
                }
                break;

            case 'call-tool':
                if (!serverName || !toolName) {
                    throw new Error('serverName and toolName are required for call-tool action');
                }
                result = await manager.callTool(serverName, toolName, args || {}, callId);
                break;

            default:
                throw new Error(`Unknown action: ${action}`);
        }

        const response: MCPProcessResponse = {
            success: true,
            data: result
        };

        res.send(response);
    } catch (error) {
        Logger.error(`[MCP] Message handler error for action ${action}:`, error);

        const response: MCPProcessResponse = {
            success: false,
            error: String(error)
        };

        res.send(response);
    }
};

export default handler;

// 确保在插件卸载时清理资源
if (globalThis.addEventListener) {
    globalThis.addEventListener('beforeunload', async () => {
        if (mcpManager) {
            Logger.log('[MCP] Cleaning up MCP manager on unload...');
            await mcpManager.stopAllServers();
        }
    });
}
