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

export default function General() {
    const [services, setServices] = useState<MCPServiceConfig[]>([]);
    const [selectedService, setSelectedService] = useState<string>("");
    const [jsonConfig, setJsonConfig] = useState<string>("");
    const [isValidJson, setIsValidJson] = useState<boolean>(true);
    const [loading, setLoading] = useState<boolean>(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null);
    const [showConfigEditor, setShowConfigEditor] = useState<boolean>(false);

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
            setShowConfigEditor(false);

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
        <div className="bg-white min-h-screen">
            {/* 头部标题 */}
            <div className="px-8 py-6 border-b border-gray-200">
                <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
            </div>

            <div className="px-8 py-6">
                {/* Model Context Protocol 部分 */}
                <div className="mb-8">
                    <h2 className="text-lg font-medium text-gray-900 mb-2">Model Context Protocol</h2>
                    <p className="text-sm text-gray-600 mb-6">
                        Claude can receive information like prompts and attachments from specialized servers using Model Context Protocol.
                        <a href="#" className="text-blue-600 hover:text-blue-800 ml-1">Learn more</a>
                    </p>

                    {/* 服务列表 */}
                    <div className="space-y-4 mb-6">
                        {services.map(service => (
                            <div key={service.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-1">
                                        <span className="font-medium text-gray-900">{service.displayName}</span>
                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${service.status.isRunning
                                            ? 'bg-green-100 text-green-800'
                                            : 'bg-gray-100 text-gray-800'
                                            }`}>
                                            {service.status.isRunning ? 'running' : 'stopped'}
                                        </span>
                                    </div>
                                    <div className="text-sm text-gray-600">
                                        <div className="mb-1">Command</div>
                                        <div className="font-mono text-xs bg-gray-50 px-2 py-1 rounded">
                                            {service.command}
                                        </div>
                                    </div>
                                    <div className="text-sm text-gray-600 mt-2">
                                        <div className="mb-1">Arguments</div>
                                        <div className="font-mono text-xs bg-gray-50 px-2 py-1 rounded">
                                            {service.args ? service.args.join(' ') : 'No arguments'}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 ml-4">
                                    {service.status.isRunning ? (
                                        <button
                                            onClick={() => handleStopService(service.id)}
                                            className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                                        >
                                            Stop
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => handleStartService(service.id)}
                                            className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                                        >
                                            Start
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleRemoveService(service.id)}
                                        className="p-2 text-gray-400 hover:text-red-600"
                                        title="Delete service"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* 添加配置按钮 */}
                    {!showConfigEditor && (
                        <button
                            onClick={() => setShowConfigEditor(true)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            Edit Config
                        </button>
                    )}

                    {/* 配置编辑器 */}
                    {showConfigEditor && (
                        <div className="border border-gray-200 rounded-lg p-6 bg-gray-50">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-medium text-gray-900">MCP Configuration</h3>
                                <button
                                    onClick={() => {
                                        setShowConfigEditor(false);
                                        setJsonConfig('');
                                        setSelectedService('');
                                        setIsValidJson(true);
                                    }}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            {/* 快速模板 */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Quick Templates
                                </label>
                                <div className="flex gap-2 flex-wrap">
                                    {Object.entries(CONFIG_TEMPLATES).map(([key, template]) => (
                                        <button
                                            key={key}
                                            onClick={() => loadTemplate(key)}
                                            className={`px-3 py-1 text-sm border rounded-md transition-colors ${selectedService === key
                                                ? 'bg-blue-600 text-white border-blue-600'
                                                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                                                }`}
                                        >
                                            {template.displayName}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* JSON配置输入 */}
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Configuration (JSON)
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
                                    className={`w-full h-64 p-3 font-mono text-sm border rounded-lg resize-none ${isValidJson ? 'border-gray-300' : 'border-red-300'
                                        } focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                                />
                                {!isValidJson && (
                                    <p className="mt-1 text-sm text-red-600">Invalid JSON format</p>
                                )}
                            </div>

                            {/* 操作按钮 */}
                            <div className="flex gap-3">
                                <button
                                    onClick={handleAddService}
                                    disabled={loading || !isValidJson || !jsonConfig.trim()}
                                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${loading || !isValidJson || !jsonConfig.trim()
                                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                        : 'bg-blue-600 text-white hover:bg-blue-700'
                                        }`}
                                >
                                    {loading ? 'Adding...' : 'Add Service'}
                                </button>
                                <button
                                    onClick={() => {
                                        setJsonConfig('');
                                        setSelectedService('');
                                        setIsValidJson(true);
                                    }}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    Clear
                                </button>
                            </div>
                        </div>
                    )}

                    {/* 消息提示 */}
                    {message && (
                        <div className={`mt-4 p-3 rounded-lg text-sm ${message.type === 'success'
                            ? 'bg-green-100 text-green-800 border border-green-200'
                            : message.type === 'error'
                                ? 'bg-red-100 text-red-800 border border-red-200'
                                : 'bg-blue-100 text-blue-800 border border-blue-200'
                            }`}>
                            {message.text}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
