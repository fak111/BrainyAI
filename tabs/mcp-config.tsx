import React, { useState, useEffect } from "react";
import { mcpConfigManager, type MCPServiceConfig } from "~libs/mcp/MCPConfigManager";

// 预设配置模板
const CONFIG_TEMPLATES = {
    weather: {
        name: "weather",
        displayName: "Weather Service",
        description: "Get weather forecasts and alerts",
        category: "weather" as const,
        command: "uv",
        args: ["--directory", "/Users/zhangbeibei/code/github/try/weather", "run", "weather.py"],
        env: {},
        tools: [
            { name: "get_forecast", displayName: "Get Forecast", description: "Get weather forecast for coordinates" },
            { name: "get_alerts", displayName: "Get Alerts", description: "Get weather alerts for a state" }
        ]
    },
    filesystem: {
        name: "filesystem",
        displayName: "File System",
        description: "Read and write files on the local filesystem",
        category: "development" as const,
        command: "npx",
        args: ["-y", "@modelcontextprotocol/server-filesystem", "/path/to/allowed/files"],
        env: {},
        tools: [
            { name: "read_file", displayName: "Read File", description: "Read contents of a file" },
            { name: "write_file", displayName: "Write File", description: "Write contents to a file" },
            { name: "list_directory", displayName: "List Directory", description: "List files in a directory" }
        ]
    },
    "knowledge-vault": {
        name: "knowledge-vault",
        displayName: "Knowledge Vault",
        description: "Access and search through knowledge base",
        category: "ai" as const,
        command: "python",
        args: ["-m", "knowledge_vault.server"],
        env: {},
        tools: [
            { name: "search", displayName: "Search", description: "Search knowledge base" },
            { name: "retrieve", displayName: "Retrieve", description: "Retrieve specific documents" }
        ]
    }
};

const MCPConfigPage: React.FC = () => {
    const [services, setServices] = useState<MCPServiceConfig[]>([]);
    const [selectedService, setSelectedService] = useState<string>("");
    const [jsonConfig, setJsonConfig] = useState<string>("");
    const [isValidJson, setIsValidJson] = useState<boolean>(true);
    const [loading, setLoading] = useState<boolean>(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null);

    useEffect(() => {
        // 加载现有服务
        setServices(mcpConfigManager.getAllServices());

        // 订阅服务状态更新
        const unsubscribe = mcpConfigManager.onStatusUpdate(setServices);
        return unsubscribe;
    }, []);

    // 验证JSON格式
    const validateJson = (jsonStr: string) => {
        if (!jsonStr.trim()) {
            setIsValidJson(true);
            return;
        }

        try {
            JSON.parse(jsonStr);
            setIsValidJson(true);
        } catch {
            setIsValidJson(false);
        }
    };

    // 处理JSON输入变化
    const handleJsonChange = (value: string) => {
        setJsonConfig(value);
        validateJson(value);
    };

    // 加载预设模板
    const loadTemplate = (templateKey: string) => {
        const template = CONFIG_TEMPLATES[templateKey];
        if (template) {
            const config = {
                mcpServers: {
                    [template.name]: {
                        command: template.command,
                        args: template.args,
                        env: template.env
                    }
                }
            };
            setJsonConfig(JSON.stringify(config, null, 2));
            setSelectedService(templateKey);
            setIsValidJson(true);
        }
    };

    // 添加服务
    const handleAddService = async () => {
        if (!jsonConfig.trim()) {
            setMessage({ type: 'error', text: '请输入配置JSON' });
            return;
        }

        if (!isValidJson) {
            setMessage({ type: 'error', text: 'JSON格式不正确' });
            return;
        }

        setLoading(true);
        try {
            const config = JSON.parse(jsonConfig);

            // 解析MCP配置
            if (!config.mcpServers) {
                throw new Error('配置中缺少 mcpServers 字段');
            }

            const serverEntries = Object.entries(config.mcpServers);
            if (serverEntries.length === 0) {
                throw new Error('至少需要配置一个MCP服务');
            }

            // 添加每个服务
            for (const [name, serverConfig] of serverEntries) {
                const template = CONFIG_TEMPLATES[name] || {
                    name,
                    displayName: name.charAt(0).toUpperCase() + name.slice(1),
                    description: `MCP service: ${name}`,
                    category: 'other' as const,
                    tools: []
                };

                const serviceConfig: Omit<MCPServiceConfig, 'id' | 'status' | 'stats'> = {
                    ...template,
                    command: serverConfig.command,
                    args: serverConfig.args || [],
                    env: serverConfig.env || {},
                    tags: [name, 'imported']
                };

                await mcpConfigManager.addService(serviceConfig);
            }

            setMessage({ type: 'success', text: `成功添加 ${serverEntries.length} 个服务` });
            setJsonConfig('');
            setSelectedService('');

        } catch (error) {
            setMessage({ type: 'error', text: `添加失败: ${error.message}` });
        } finally {
            setLoading(false);
        }
    };

    // 启动服务
    const handleStartService = async (serviceId: string) => {
        try {
            await mcpConfigManager.startService(serviceId);
            setMessage({ type: 'success', text: '服务启动成功' });
        } catch (error) {
            setMessage({ type: 'error', text: `启动失败: ${error.message}` });
        }
    };

    // 停止服务
    const handleStopService = async (serviceId: string) => {
        try {
            await mcpConfigManager.stopService(serviceId);
            setMessage({ type: 'success', text: '服务已停止' });
        } catch (error) {
            setMessage({ type: 'error', text: `停止失败: ${error.message}` });
        }
    };

    // 删除服务
    const handleRemoveService = async (serviceId: string) => {
        if (confirm('确定要删除这个服务吗？')) {
            try {
                await mcpConfigManager.removeService(serviceId);
                setMessage({ type: 'success', text: '服务已删除' });
            } catch (error) {
                setMessage({ type: 'error', text: `删除失败: ${error.message}` });
            }
        }
    };

    // 清除消息
    useEffect(() => {
        if (message) {
            const timer = setTimeout(() => setMessage(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [message]);

    return (
        <div style={{
            padding: '20px',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            backgroundColor: '#f8f9fa',
            minHeight: '100vh',
            color: '#1f2937'
        }}>
            {/* 头部 */}
            <div style={{ marginBottom: '32px' }}>
                <h1 style={{
                    fontSize: '24px',
                    fontWeight: '600',
                    margin: '0 0 8px 0',
                    color: '#111827'
                }}>
                    Model Context Protocol
                </h1>
                <p style={{
                    color: '#6b7280',
                    margin: 0,
                    fontSize: '14px'
                }}>
                    Claude can receive information like prompts and attachments from specialized servers using Model Context Protocol. Learn more
                </p>
            </div>

            <div style={{ display: 'flex', gap: '24px' }}>
                {/* 左侧：服务列表 */}
                <div style={{ flex: '0 0 300px' }}>
                    <div style={{
                        backgroundColor: 'white',
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb',
                        overflow: 'hidden'
                    }}>
                        {/* 服务列表头部 */}
                        <div style={{
                            padding: '16px',
                            borderBottom: '1px solid #e5e7eb',
                            backgroundColor: '#f9fafb'
                        }}>
                            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '500' }}>
                                已配置服务
                            </h3>
                        </div>

                        {/* 服务列表 */}
                        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                            {services.length === 0 ? (
                                <div style={{
                                    padding: '32px 16px',
                                    textAlign: 'center',
                                    color: '#9ca3af',
                                    fontSize: '14px'
                                }}>
                                    还没有配置任何服务
                                </div>
                            ) : (
                                services.map(service => (
                                    <div
                                        key={service.id}
                                        style={{
                                            padding: '12px 16px',
                                            borderBottom: '1px solid #f3f4f6',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between'
                                        }}
                                    >
                                        <div style={{ flex: 1 }}>
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                marginBottom: '4px'
                                            }}>
                                                <span style={{ fontWeight: '500', fontSize: '14px' }}>
                                                    {service.displayName}
                                                </span>
                                                <span style={{
                                                    padding: '2px 6px',
                                                    borderRadius: '4px',
                                                    fontSize: '10px',
                                                    fontWeight: '500',
                                                    backgroundColor: service.status.isRunning ? '#10b981' : '#6b7280',
                                                    color: 'white'
                                                }}>
                                                    {service.status.isRunning ? 'running' : 'stopped'}
                                                </span>
                                            </div>
                                            <div style={{
                                                fontSize: '12px',
                                                color: '#6b7280'
                                            }}>
                                                {service.command}
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', gap: '4px' }}>
                                            {service.status.isRunning ? (
                                                <button
                                                    onClick={() => handleStopService(service.id)}
                                                    style={{
                                                        padding: '4px 8px',
                                                        fontSize: '12px',
                                                        border: 'none',
                                                        borderRadius: '4px',
                                                        backgroundColor: '#ef4444',
                                                        color: 'white',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    停止
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => handleStartService(service.id)}
                                                    style={{
                                                        padding: '4px 8px',
                                                        fontSize: '12px',
                                                        border: 'none',
                                                        borderRadius: '4px',
                                                        backgroundColor: '#10b981',
                                                        color: 'white',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    启动
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleRemoveService(service.id)}
                                                style={{
                                                    padding: '4px 8px',
                                                    fontSize: '12px',
                                                    border: '1px solid #d1d5db',
                                                    borderRadius: '4px',
                                                    backgroundColor: 'white',
                                                    color: '#6b7280',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                删除
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* 右侧：配置区域 */}
                <div style={{ flex: 1 }}>
                    <div style={{
                        backgroundColor: 'white',
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb',
                        padding: '24px'
                    }}>
                        {/* 快速模板 */}
                        <div style={{ marginBottom: '24px' }}>
                            <h3 style={{
                                margin: '0 0 12px 0',
                                fontSize: '16px',
                                fontWeight: '500'
                            }}>
                                快速开始
                            </h3>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                {Object.entries(CONFIG_TEMPLATES).map(([key, template]) => (
                                    <button
                                        key={key}
                                        onClick={() => loadTemplate(key)}
                                        style={{
                                            padding: '8px 12px',
                                            fontSize: '14px',
                                            border: '1px solid #d1d5db',
                                            borderRadius: '6px',
                                            backgroundColor: selectedService === key ? '#3b82f6' : 'white',
                                            color: selectedService === key ? 'white' : '#374151',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s'
                                        }}
                                    >
                                        {template.displayName}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* JSON配置输入 */}
                        <div style={{ marginBottom: '24px' }}>
                            <label style={{
                                display: 'block',
                                marginBottom: '8px',
                                fontSize: '14px',
                                fontWeight: '500',
                                color: '#374151'
                            }}>
                                MCP配置 (JSON格式)
                            </label>
                            <textarea
                                value={jsonConfig}
                                onChange={(e) => handleJsonChange(e.target.value)}
                                placeholder={`{
  "mcpServers": {
    "weather": {
      "command": "uv",
      "args": ["--directory", "/path/to/weather", "run", "weather.py"],
      "env": {}
    }
  }
}`}
                                style={{
                                    width: '100%',
                                    height: '300px',
                                    padding: '12px',
                                    fontSize: '13px',
                                    fontFamily: 'Monaco, Consolas, monospace',
                                    border: `1px solid ${isValidJson ? '#d1d5db' : '#ef4444'}`,
                                    borderRadius: '6px',
                                    backgroundColor: '#f9fafb',
                                    resize: 'vertical',
                                    outline: 'none'
                                }}
                            />
                            {!isValidJson && (
                                <div style={{
                                    marginTop: '4px',
                                    fontSize: '12px',
                                    color: '#ef4444'
                                }}>
                                    JSON格式不正确
                                </div>
                            )}
                        </div>

                        {/* 操作按钮 */}
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button
                                onClick={handleAddService}
                                disabled={loading || !isValidJson || !jsonConfig.trim()}
                                style={{
                                    padding: '10px 20px',
                                    fontSize: '14px',
                                    fontWeight: '500',
                                    border: 'none',
                                    borderRadius: '6px',
                                    backgroundColor: loading || !isValidJson || !jsonConfig.trim() ? '#9ca3af' : '#3b82f6',
                                    color: 'white',
                                    cursor: loading || !isValidJson || !jsonConfig.trim() ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                {loading ? '添加中...' : '添加服务'}
                            </button>

                            <button
                                onClick={() => {
                                    setJsonConfig('');
                                    setSelectedService('');
                                    setIsValidJson(true);
                                }}
                                style={{
                                    padding: '10px 20px',
                                    fontSize: '14px',
                                    fontWeight: '500',
                                    border: '1px solid #d1d5db',
                                    borderRadius: '6px',
                                    backgroundColor: 'white',
                                    color: '#374151',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                清空
                            </button>
                        </div>

                        {/* 消息提示 */}
                        {message && (
                            <div style={{
                                marginTop: '16px',
                                padding: '12px',
                                borderRadius: '6px',
                                fontSize: '14px',
                                backgroundColor: message.type === 'success' ? '#d1fae5' :
                                    message.type === 'error' ? '#fee2e2' : '#dbeafe',
                                color: message.type === 'success' ? '#065f46' :
                                    message.type === 'error' ? '#991b1b' : '#1e40af',
                                border: `1px solid ${message.type === 'success' ? '#a7f3d0' :
                                    message.type === 'error' ? '#fecaca' : '#bfdbfe'}`
                            }}>
                                {message.text}
                            </div>
                        )}
                    </div>

                    {/* 使用说明 */}
                    <div style={{
                        marginTop: '24px',
                        padding: '16px',
                        backgroundColor: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        fontSize: '14px',
                        color: '#64748b'
                    }}>
                        <h4 style={{ margin: '0 0 8px 0', color: '#475569' }}>使用说明：</h4>
                        <ul style={{ margin: 0, paddingLeft: '20px' }}>
                            <li>选择预设模板或直接输入MCP配置JSON</li>
                            <li>配置格式需要包含 <code>mcpServers</code> 字段</li>
                            <li>每个服务需要指定 <code>command</code> 和 <code>args</code></li>
                            <li>添加后可以直接启动和管理服务</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MCPConfigPage;
