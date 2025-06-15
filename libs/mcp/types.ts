/**
 * MCP (Model Context Protocol) Types
 * 定义 MCP 相关的数据结构和接口
 */

export interface MCPServerConfig {
    /** 启动命令 (如 npx, python, node) */
    command: string;
    /** 命令参数 */
    args: string[];
    /** 环境变量 */
    env?: Record<string, string>;
    /** 是否自动启动 */
    autoStart?: boolean;
    /** 连接超时时间 (毫秒) */
    timeout?: number;
    /** 工作目录 */
    cwd?: string;
}

export interface MCPConfiguration {
    /** MCP 服务器配置 */
    mcpServers: Record<string, MCPServerConfig>;
    /** 全局设置 */
    globalSettings: {
        /** 开机自动启动 */
        autoStartOnBoot: boolean;
        /** 工具调用确认 */
        toolCallConfirmation: boolean;
        /** 最大并发调用数 */
        maxConcurrentCalls: number;
        /** 日志级别 */
        logLevel: 'error' | 'warn' | 'info' | 'debug';
    };
}

export interface MCPServerStatus {
    /** 服务器名称 */
    name: string;
    /** 运行状态 */
    status: 'stopped' | 'starting' | 'running' | 'error' | 'stopping';
    /** 进程 ID */
    pid?: number;
    /** 启动时间 */
    startTime?: number;
    /** 错误信息 */
    error?: string;
    /** 可用工具数量 */
    toolCount?: number;
    /** 服务器信息 */
    serverInfo?: {
        name: string;
        version: string;
        protocolVersion: string;
    };
}

export interface MCPTool {
    /** 工具名称 */
    name: string;
    /** 工具描述 */
    description?: string;
    /** 输入 schema */
    inputSchema: any;
    /** 所属服务器 */
    serverName?: string;
}

export interface MCPToolCall {
    /** 工具名称 */
    toolName: string;
    /** 调用参数 */
    args: any;
    /** 所属服务器 */
    serverName: string;
    /** 调用 ID */
    callId?: string;
}

export interface MCPToolResult {
    /** 调用 ID */
    callId?: string;
    /** 是否成功 */
    success: boolean;
    /** 结果数据 */
    result?: any;
    /** 错误信息 */
    error?: string;
    /** 执行时间 (毫秒) */
    duration?: number;
}

export interface MCPResource {
    /** 资源 URI */
    uri: string;
    /** 资源名称 */
    name?: string;
    /** 资源描述 */
    description?: string;
    /** MIME 类型 */
    mimeType?: string;
}

/** 事件类型 */
export type MCPEventType =
    | 'server_started'
    | 'server_stopped'
    | 'server_error'
    | 'tool_call_started'
    | 'tool_call_completed'
    | 'tool_call_failed';

export interface MCPEvent {
    type: MCPEventType;
    serverName: string;
    timestamp: number;
    data?: any;
}

/** 预设 MCP 服务器模板 */
export interface MCPServerTemplate {
    /** 模板名称 */
    name: string;
    /** 模板描述 */
    description: string;
    /** 模板图标 */
    icon?: string;
    /** 服务器配置 */
    config: MCPServerConfig;
    /** 所需环境变量说明 */
    envDescription?: Record<string, string>;
    /** 使用示例 */
    examples?: string[];
}

/** 错误类型 */
export class MCPError extends Error {
    constructor(
        message: string,
        public code: string,
        public serverName?: string,
        public originalError?: Error
    ) {
        super(message);
        this.name = 'MCPError';
    }
}

export const MCP_ERROR_CODES = {
    SERVER_START_FAILED: 'SERVER_START_FAILED',
    SERVER_CONNECTION_FAILED: 'SERVER_CONNECTION_FAILED',
    TOOL_CALL_FAILED: 'TOOL_CALL_FAILED',
    INVALID_CONFIG: 'INVALID_CONFIG',
    PERMISSION_DENIED: 'PERMISSION_DENIED',
    TIMEOUT: 'TIMEOUT',
} as const;
