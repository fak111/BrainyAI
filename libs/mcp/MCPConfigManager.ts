/**
 * MCP配置管理器
 * 负责管理所有MCP服务的配置、状态监控和操作
 */

import { BrowserMCPClient, type BrowserMCPServerConfig } from './BrowserMCPClient';
import { Logger } from '~utils/logger';

export interface MCPServiceConfig extends BrowserMCPServerConfig {
    id: string;
    displayName: string;
    description?: string;
    enabled: boolean;
    autoStart: boolean;
    category: 'weather' | 'data' | 'ai' | 'productivity' | 'development' | 'other';
    tags: string[];
    // 启动命令配置
    command: string;
    args: string[];
    env?: Record<string, string>;
    cwd?: string;
    // 工具配置
    tools: MCPToolConfig[];
    // 状态信息
    status: MCPServiceStatus;
    // 统计信息
    stats: MCPServiceStats;
}

export interface MCPToolConfig {
    name: string;
    displayName: string;
    description: string;
    parameters: MCPParameterConfig[];
    examples: MCPToolExample[];
}

export interface MCPParameterConfig {
    name: string;
    type: 'string' | 'number' | 'boolean' | 'object' | 'array';
    required: boolean;
    description: string;
    defaultValue?: any;
    validation?: {
        min?: number;
        max?: number;
        pattern?: string;
        enum?: string[];
    };
}

export interface MCPToolExample {
    name: string;
    description: string;
    parameters: Record<string, any>;
    expectedResult?: string;
}

export interface MCPServiceStatus {
    isRunning: boolean;
    isConnected: boolean;
    lastStartTime?: Date;
    lastError?: string;
    health: 'healthy' | 'warning' | 'error' | 'unknown';
}

export interface MCPServiceStats {
    totalCalls: number;
    successfulCalls: number;
    failedCalls: number;
    averageResponseTime: number;
    lastCallTime?: Date;
}

export class MCPConfigManager {
    private services: Map<string, MCPServiceConfig> = new Map();
    private clients: Map<string, BrowserMCPClient> = new Map();
    private statusUpdateCallbacks: Set<(services: MCPServiceConfig[]) => void> = new Set();
    private storageKey = 'mcp-services-config';
    private proxyUrl = 'http://localhost:3001';

    constructor() {
        this.loadConfigurations();
        this.initializeDefaultServices();
        // 定期检查服务状态
        setInterval(() => this.checkAllServicesStatus(), 30000);
    }

    /**
     * 初始化默认服务配置
     */
    private initializeDefaultServices() {
        const weatherService: MCPServiceConfig = {
            id: 'weather',
            name: 'weather',
            displayName: '天气服务',
            description: '提供天气预报和天气警报功能',
            url: this.proxyUrl,
            type: 'http',
            enabled: true,
            autoStart: false,
            category: 'weather',
            tags: ['weather', 'forecast', 'alerts', 'nws'],
            command: 'uv',
            args: [
                '--directory',
                '/Users/zhangbeibei/code/github/try/weather',
                'run',
                'weather.py'
            ],
            cwd: '/Users/zhangbeibei/code/github/try/weather',
            tools: [
                {
                    name: 'get_forecast',
                    displayName: '获取天气预报',
                    description: '根据经纬度坐标获取详细的天气预报信息',
                    parameters: [
                        {
                            name: 'latitude',
                            type: 'number',
                            required: true,
                            description: '纬度坐标 (-90 到 90)',
                            validation: { min: -90, max: 90 }
                        },
                        {
                            name: 'longitude',
                            type: 'number',
                            required: true,
                            description: '经度坐标 (-180 到 180)',
                            validation: { min: -180, max: 180 }
                        }
                    ],
                    examples: [
                        {
                            name: 'Sacramento天气',
                            description: '获取Sacramento, CA的天气预报',
                            parameters: { latitude: 38.5816, longitude: -121.4944 },
                            expectedResult: '7天详细天气预报信息'
                        },
                        {
                            name: '纽约天气',
                            description: '获取纽约市的天气预报',
                            parameters: { latitude: 40.7128, longitude: -74.0060 }
                        }
                    ]
                },
                {
                    name: 'get_alerts',
                    displayName: '获取天气警报',
                    description: '获取指定美国州的当前天气警报信息',
                    parameters: [
                        {
                            name: 'state',
                            type: 'string',
                            required: true,
                            description: '美国州代码 (如: CA, NY, TX)',
                            validation: { pattern: '^[A-Z]{2}$' }
                        }
                    ],
                    examples: [
                        {
                            name: '加州警报',
                            description: '获取加利福尼亚州的天气警报',
                            parameters: { state: 'CA' },
                            expectedResult: '当前生效的天气警报列表'
                        }
                    ]
                }
            ],
            status: {
                isRunning: false,
                isConnected: false,
                health: 'unknown'
            },
            stats: {
                totalCalls: 0,
                successfulCalls: 0,
                failedCalls: 0,
                averageResponseTime: 0
            }
        };

        this.services.set('weather', weatherService);
    }

    /**
     * 添加服务配置
     */
    addService(config: Omit<MCPServiceConfig, 'id' | 'status' | 'stats'>): string {
        const id = this.generateServiceId(config.name);
        const fullConfig: MCPServiceConfig = {
            ...config,
            id,
            status: {
                isRunning: false,
                isConnected: false,
                health: 'unknown'
            },
            stats: {
                totalCalls: 0,
                successfulCalls: 0,
                failedCalls: 0,
                averageResponseTime: 0
            }
        };

        this.services.set(id, fullConfig);
        this.saveConfigurations();
        this.notifyStatusUpdate();

        Logger.log(`[MCPConfigManager] Added service: ${id}`);
        return id;
    }

    /**
     * 更新服务配置
     */
    updateService(id: string, updates: Partial<MCPServiceConfig>): boolean {
        const service = this.services.get(id);
        if (!service) {
            Logger.log(`[MCPConfigManager] Service not found: ${id}`);
            return false;
        }

        const updatedService = { ...service, ...updates };
        this.services.set(id, updatedService);
        this.saveConfigurations();
        this.notifyStatusUpdate();

        Logger.log(`[MCPConfigManager] Updated service: ${id}`);
        return true;
    }

    /**
     * 删除服务
     */
    async removeService(id: string): Promise<boolean> {
        const service = this.services.get(id);
        if (!service) return false;

        // 先停止服务
        if (service.status.isRunning) {
            await this.stopService(id);
        }

        this.services.delete(id);
        this.clients.delete(id);
        this.saveConfigurations();
        this.notifyStatusUpdate();

        Logger.log(`[MCPConfigManager] Removed service: ${id}`);
        return true;
    }

    /**
     * 获取所有服务配置
     */
    getAllServices(): MCPServiceConfig[] {
        return Array.from(this.services.values());
    }

    /**
     * 获取特定服务配置
     */
    getService(id: string): MCPServiceConfig | undefined {
        return this.services.get(id);
    }

    /**
     * 启动服务
     */
    async startService(id: string): Promise<boolean> {
        const service = this.services.get(id);
        if (!service) {
            Logger.error(`[MCPConfigManager] Service not found: ${id}`);
            return false;
        }

        if (service.status.isRunning) {
            Logger.log(`[MCPConfigManager] Service already running: ${id}`);
            return true;
        }

        try {
            Logger.log(`[MCPConfigManager] Starting service: ${id}`);

            // 创建客户端
            const client = new BrowserMCPClient(service.name, {
                name: service.name,
                url: service.url,
                type: service.type
            });

            // 连接到代理服务器
            await client.connect();

            // 如果有启动命令，则启动MCP服务
            if (service.command) {
                await client.startMCPService(
                    service.command,
                    service.args,
                    service.cwd
                );
            }

            this.clients.set(id, client);

            // 更新状态
            this.updateServiceStatus(id, {
                isRunning: true,
                isConnected: true,
                lastStartTime: new Date(),
                health: 'healthy',
                lastError: undefined
            });

            Logger.log(`[MCPConfigManager] Service started successfully: ${id}`);
            return true;

        } catch (error) {
            Logger.error(`[MCPConfigManager] Failed to start service ${id}:`, error);

            this.updateServiceStatus(id, {
                isRunning: false,
                isConnected: false,
                health: 'error',
                lastError: error instanceof Error ? error.message : 'Unknown error'
            });

            return false;
        }
    }

    /**
     * 停止服务
     */
    async stopService(id: string): Promise<boolean> {
        const service = this.services.get(id);
        const client = this.clients.get(id);

        if (!service) {
            Logger.error(`[MCPConfigManager] Service not found: ${id}`);
            return false;
        }

        try {
            Logger.log(`[MCPConfigManager] Stopping service: ${id}`);

            if (client) {
                await client.stopMCPService();
                this.clients.delete(id);
            }

            this.updateServiceStatus(id, {
                isRunning: false,
                isConnected: false,
                health: 'unknown'
            });

            Logger.log(`[MCPConfigManager] Service stopped: ${id}`);
            return true;

        } catch (error) {
            Logger.error(`[MCPConfigManager] Failed to stop service ${id}:`, error);
            return false;
        }
    }

    /**
     * 调用工具
     */
    async callTool(serviceId: string, toolName: string, parameters: any, prompt?: string): Promise<any> {
        const service = this.services.get(serviceId);
        const client = this.clients.get(serviceId);

        if (!service || !client) {
            throw new Error(`Service not available: ${serviceId}`);
        }

        const startTime = Date.now();

        try {
            Logger.log(`[MCPConfigManager] Calling tool ${toolName} on service ${serviceId}`);

            const result = await client.callTool(toolName, parameters, prompt);

            // 更新统计信息
            const responseTime = Date.now() - startTime;
            this.updateServiceStats(serviceId, {
                totalCalls: service.stats.totalCalls + 1,
                successfulCalls: service.stats.successfulCalls + 1,
                averageResponseTime: this.calculateAverageResponseTime(
                    service.stats.averageResponseTime,
                    service.stats.totalCalls,
                    responseTime
                ),
                lastCallTime: new Date()
            });

            this.updateServiceStatus(serviceId, { health: 'healthy' });

            Logger.log(`[MCPConfigManager] Tool call successful: ${toolName}`);
            return result;

        } catch (error) {
            // 更新错误统计
            this.updateServiceStats(serviceId, {
                totalCalls: service.stats.totalCalls + 1,
                failedCalls: service.stats.failedCalls + 1,
                lastCallTime: new Date()
            });

            this.updateServiceStatus(serviceId, {
                health: 'error',
                lastError: error instanceof Error ? error.message : 'Tool call failed'
            });

            Logger.error(`[MCPConfigManager] Tool call failed: ${toolName}`, error);
            throw error;
        }
    }

    /**
     * 检查所有服务状态
     */
    private async checkAllServicesStatus() {
        for (const [id, service] of this.services) {
            if (service.enabled && service.status.isRunning) {
                await this.checkServiceHealth(id);
            }
        }
    }

    /**
     * 检查单个服务健康状态
     */
    private async checkServiceHealth(id: string): Promise<void> {
        try {
            // 这里可以实现健康检查逻辑
            // 比如调用代理服务器的健康检查端点
            const response = await fetch(`${this.proxyUrl}/health`);
            const isHealthy = response.ok;

            this.updateServiceStatus(id, {
                health: isHealthy ? 'healthy' : 'warning'
            });

        } catch (error) {
            this.updateServiceStatus(id, {
                health: 'error',
                lastError: 'Health check failed'
            });
        }
    }

    /**
     * 更新服务状态
     */
    private updateServiceStatus(id: string, status: Partial<MCPServiceStatus>) {
        const service = this.services.get(id);
        if (service) {
            service.status = { ...service.status, ...status };
            this.notifyStatusUpdate();
        }
    }

    /**
     * 更新服务统计信息
     */
    private updateServiceStats(id: string, stats: Partial<MCPServiceStats>) {
        const service = this.services.get(id);
        if (service) {
            service.stats = { ...service.stats, ...stats };
            this.notifyStatusUpdate();
        }
    }

    /**
     * 计算平均响应时间
     */
    private calculateAverageResponseTime(currentAvg: number, totalCalls: number, newTime: number): number {
        return (currentAvg * totalCalls + newTime) / (totalCalls + 1);
    }

    /**
     * 生成服务ID
     */
    private generateServiceId(name: string): string {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substr(2, 5);
        return `${name}-${timestamp}-${random}`;
    }

    /**
     * 注册状态更新回调
     */
    onStatusUpdate(callback: (services: MCPServiceConfig[]) => void): () => void {
        this.statusUpdateCallbacks.add(callback);
        return () => this.statusUpdateCallbacks.delete(callback);
    }

    /**
     * 通知状态更新
     */
    private notifyStatusUpdate() {
        const services = this.getAllServices();
        this.statusUpdateCallbacks.forEach(callback => {
            try {
                callback(services);
            } catch (error) {
                Logger.error('[MCPConfigManager] Status update callback error:', error);
            }
        });
    }

    /**
     * 保存配置到本地存储
     */
    private saveConfigurations() {
        try {
            const configs = Array.from(this.services.values());
            localStorage.setItem(this.storageKey, JSON.stringify(configs));
        } catch (error) {
            Logger.error('[MCPConfigManager] Failed to save configurations:', error);
        }
    }

    /**
     * 从本地存储加载配置
     */
    private loadConfigurations() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                const configs: MCPServiceConfig[] = JSON.parse(stored);
                configs.forEach(config => {
                    this.services.set(config.id, config);
                });
                Logger.log(`[MCPConfigManager] Loaded ${configs.length} service configurations`);
            }
        } catch (error) {
            Logger.error('[MCPConfigManager] Failed to load configurations:', error);
        }
    }

    /**
     * 导出配置
     */
    exportConfigurations(): string {
        const configs = this.getAllServices();
        return JSON.stringify(configs, null, 2);
    }

    /**
     * 导入配置
     */
    importConfigurations(jsonConfig: string): number {
        try {
            const configs: MCPServiceConfig[] = JSON.parse(jsonConfig);
            let imported = 0;

            configs.forEach(config => {
                // 重新生成ID以避免冲突
                const newId = this.generateServiceId(config.name);
                config.id = newId;

                // 重置状态
                config.status = {
                    isRunning: false,
                    isConnected: false,
                    health: 'unknown'
                };

                this.services.set(newId, config);
                imported++;
            });

            this.saveConfigurations();
            this.notifyStatusUpdate();

            Logger.log(`[MCPConfigManager] Imported ${imported} service configurations`);
            return imported;

        } catch (error) {
            Logger.error('[MCPConfigManager] Failed to import configurations:', error);
            throw new Error('Invalid configuration format');
        }
    }
}

// 单例实例
export const mcpConfigManager = new MCPConfigManager();
