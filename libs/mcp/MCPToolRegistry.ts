/**
 * MCP 工具注册表
 * 管理和查找可用的 MCP 工具
 */

import { MCPTool, MCPServerTemplate } from './types';
import { Logger } from '~utils/logger';

export class MCPToolRegistry {
    private tools = new Map<string, MCPTool>();
    private serverTools = new Map<string, MCPTool[]>();

    /**
     * 注册工具
     */
    registerTool(tool: MCPTool): void {
        const toolKey = `${tool.serverName}:${tool.name}`;
        this.tools.set(toolKey, tool);

        // 按服务器分组
        const serverName = tool.serverName || 'unknown';
        const serverTools = this.serverTools.get(serverName) || [];

        // 去重
        const existingIndex = serverTools.findIndex(t => t.name === tool.name);
        if (existingIndex >= 0) {
            serverTools[existingIndex] = tool;
        } else {
            serverTools.push(tool);
        }

        this.serverTools.set(serverName, serverTools);

        Logger.log(`[MCP Registry] Registered tool: ${toolKey}`);
    }

    /**
     * 批量注册工具
     */
    registerTools(tools: MCPTool[]): void {
        tools.forEach(tool => this.registerTool(tool));
    }

    /**
     * 获取工具
     */
    getTool(serverName: string, toolName: string): MCPTool | undefined {
        const toolKey = `${serverName}:${toolName}`;
        return this.tools.get(toolKey);
    }

    /**
     * 获取所有工具
     */
    getAllTools(): MCPTool[] {
        return Array.from(this.tools.values());
    }

    /**
     * 获取指定服务器的工具
     */
    getServerTools(serverName: string): MCPTool[] {
        return this.serverTools.get(serverName) || [];
    }

    /**
     * 搜索工具
     */
    searchTools(query: string): MCPTool[] {
        const queryLower = query.toLowerCase();
        return this.getAllTools().filter(tool =>
            tool.name.toLowerCase().includes(queryLower) ||
            (tool.description && tool.description.toLowerCase().includes(queryLower))
        );
    }

    /**
     * 按功能分类工具
     */
    getToolsByCategory(): Record<string, MCPTool[]> {
        const categories: Record<string, MCPTool[]> = {
            'filesystem': [],
            'network': [],
            'data': [],
            'system': [],
            'other': []
        };

        this.getAllTools().forEach(tool => {
            const category = this.categorizeToolByName(tool.name);
            categories[category].push(tool);
        });

        return categories;
    }

    /**
     * 根据工具名称推断分类
     */
    private categorizeToolByName(toolName: string): string {
        const name = toolName.toLowerCase();

        if (name.includes('file') || name.includes('dir') || name.includes('path') ||
            name.includes('read') || name.includes('write') || name.includes('list')) {
            return 'filesystem';
        }

        if (name.includes('http') || name.includes('fetch') || name.includes('request') ||
            name.includes('url') || name.includes('api')) {
            return 'network';
        }

        if (name.includes('json') || name.includes('csv') || name.includes('data') ||
            name.includes('parse') || name.includes('format')) {
            return 'data';
        }

        if (name.includes('system') || name.includes('process') || name.includes('env') ||
            name.includes('exec') || name.includes('command')) {
            return 'system';
        }

        return 'other';
    }

    /**
     * 清空指定服务器的工具
     */
    clearServerTools(serverName: string): void {
        const serverTools = this.serverTools.get(serverName) || [];

        // 从总工具列表中删除
        serverTools.forEach(tool => {
            const toolKey = `${serverName}:${tool.name}`;
            this.tools.delete(toolKey);
        });

        // 清空服务器工具列表
        this.serverTools.delete(serverName);

        Logger.log(`[MCP Registry] Cleared ${serverTools.length} tools for server: ${serverName}`);
    }

    /**
     * 清空所有工具
     */
    clearAllTools(): void {
        this.tools.clear();
        this.serverTools.clear();
        Logger.log('[MCP Registry] Cleared all tools');
    }

    /**
     * 获取统计信息
     */
    getStats(): {
        totalTools: number;
        serverCount: number;
        toolsByServer: Record<string, number>;
        toolsByCategory: Record<string, number>;
    } {
        const toolsByServer: Record<string, number> = {};
        this.serverTools.forEach((tools, serverName) => {
            toolsByServer[serverName] = tools.length;
        });

        const categories = this.getToolsByCategory();
        const toolsByCategory: Record<string, number> = {};
        Object.entries(categories).forEach(([category, tools]) => {
            toolsByCategory[category] = tools.length;
        });

        return {
            totalTools: this.tools.size,
            serverCount: this.serverTools.size,
            toolsByServer,
            toolsByCategory
        };
    }
}

/**
 * 预设 MCP 服务器模板
 */
export const MCP_SERVER_TEMPLATES: MCPServerTemplate[] = [
    {
        name: 'filesystem',
        description: 'File system operations - read, write, list files and directories',
        icon: '📁',
        config: {
            command: 'npx',
            args: ['-y', '@modelcontextprotocol/server-filesystem', '/path/to/allowed/directory'],
            env: {}
        },
        envDescription: {
            'FILESYSTEM_ROOT': 'Root directory for file operations (optional, defaults to current directory)'
        },
        examples: [
            'List files in directory',
            'Read file contents',
            'Write to file',
            'Create/delete directories'
        ]
    },
    {
        name: 'promptx',
        description: 'Advanced prompt engineering and template management',
        icon: '🎯',
        config: {
            command: 'npx',
            args: ['-y', '-f', 'dpml-prompt@snapshot', 'mcp-server'],
            env: {
                'PROMPTX_WORKSPACE': '/your/custom/workspace/path'
            }
        },
        envDescription: {
            'PROMPTX_WORKSPACE': 'Custom workspace path (optional, system will auto-detect)'
        },
        examples: [
            'Role-based prompt generation',
            'Memory and recall management',
            'Learning resource integration',
            'Professional skill activation'
        ]
    },
    {
        name: 'web-search',
        description: 'Web search and content extraction capabilities',
        icon: '🔍',
        config: {
            command: 'npx',
            args: ['-y', '@modelcontextprotocol/server-brave-search'],
            env: {
                'BRAVE_API_KEY': 'your-brave-api-key'
            }
        },
        envDescription: {
            'BRAVE_API_KEY': 'API key for Brave Search (required)'
        },
        examples: [
            'Search the web',
            'Extract content from URLs',
            'Get latest news',
            'Research topics'
        ]
    },
    {
        name: 'memory',
        description: 'Persistent memory and knowledge management',
        icon: '🧠',
        config: {
            command: 'npx',
            args: ['-y', '@modelcontextprotocol/server-memory'],
            env: {}
        },
        envDescription: {},
        examples: [
            'Store information',
            'Retrieve memories',
            'Knowledge graphs',
            'Context persistence'
        ]
    },
    {
        name: 'time',
        description: 'Time and date utilities',
        icon: '⏰',
        config: {
            command: 'npx',
            args: ['-y', '@modelcontextprotocol/server-time'],
            env: {}
        },
        envDescription: {},
        examples: [
            'Get current time',
            'Format dates',
            'Time zone conversions',
            'Date calculations'
        ]
    }
];

// 全局工具注册表实例
export const mcpToolRegistry = new MCPToolRegistry();
