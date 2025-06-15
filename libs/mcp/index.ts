/**
 * MCP (Model Context Protocol) 模块入口
 * 导出所有主要的 MCP 功能和类型
 */

// 核心类
export { MCPClient } from './MCPClient';
export { MCPProcessManager } from './MCPProcessManager';
export { MCPToolRegistry, MCP_SERVER_TEMPLATES, mcpToolRegistry } from './MCPToolRegistry';

// 类型定义
export type {
    MCPServerConfig,
    MCPConfiguration,
    MCPServerStatus,
    MCPTool,
    MCPToolCall,
    MCPToolResult,
    MCPResource,
    MCPEvent,
    MCPEventType,
    MCPServerTemplate
} from './types';

// 错误类和常量
export { MCPError, MCP_ERROR_CODES } from './types';

// 消息类型
export type {
    MCPProcessRequest,
    MCPProcessResponse
} from '../../background/messages/mcp/process-management';

/**
 * MCP 功能快速访问接口
 */
export class MCP {
    private static manager: MCPProcessManager | null = null;

    /**
     * 获取全局 MCP 管理器实例
     */
    static getManager(): MCPProcessManager {
        if (!this.manager) {
            this.manager = new MCPProcessManager();
        }
        return this.manager;
    }

    /**
     * 快速启动服务器
     */
    static async startServer(name: string, config: MCPServerConfig): Promise<void> {
        return this.getManager().startServer(name, config);
    }

    /**
     * 快速停止服务器
     */
    static async stopServer(name: string): Promise<void> {
        return this.getManager().stopServer(name);
    }

    /**
     * 快速调用工具
     */
    static async callTool(serverName: string, toolName: string, args: any = {}): Promise<any> {
        const result = await this.getManager().callTool(serverName, toolName, args);
        if (result.success) {
            return result.result;
        } else {
            throw new Error(result.error || 'Tool call failed');
        }
    }

    /**
     * 获取所有可用工具
     */
    static async getAllTools(): Promise<MCPTool[]> {
        return this.getManager().listAllTools();
    }

    /**
     * 获取服务器状态
     */
    static getServerStatus(name: string): MCPServerStatus {
        return this.getManager().getServerStatus(name);
    }

    /**
     * 获取工具注册表
     */
    static getToolRegistry(): MCPToolRegistry {
        return mcpToolRegistry;
    }

    /**
     * 清理所有资源
     */
    static async cleanup(): Promise<void> {
        if (this.manager) {
            await this.manager.stopAllServers();
            this.manager = null;
        }
        mcpToolRegistry.clearAllTools();
    }
}

// 默认导出
export default MCP;
