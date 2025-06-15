import React, { useState, useEffect } from "react";
import { mcpConfigManager, type MCPServiceConfig } from "~libs/mcp/MCPConfigManager";

// 组件：服务状态指示器
const ServiceStatusBadge: React.FC<{ status: MCPServiceConfig['status'] }> = ({ status }) => {
    const getStatusColor = () => {
        if (status.isRunning && status.health === 'healthy') return '#4ade80'; // green
        if (status.isRunning && status.health === 'warning') return '#fbbf24'; // yellow
        if (status.health === 'error') return '#f87171'; // red
        return '#6b7280'; // gray
    };

    const getStatusText = () => {
        if (status.isRunning) return status.health === 'healthy' ? '运行中' : '有警告';
        return '已停止';
    };

    return (
        <span style={{
            padding: '2px 8px',
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: 'bold',
            backgroundColor: getStatusColor(),
            color: 'white'
        }}>
            {getStatusText()}
        </span>
    );
};

// 组件：服务卡片
const ServiceCard: React.FC<{
    service: MCPServiceConfig;
    onStart: (id: string) => void;
    onStop: (id: string) => void;
    onConfigure: (id: string) => void;
    onTest: (id: string) => void;
    onRemove: (id: string) => void;
}> = ({ service, onStart, onStop, onConfigure, onTest, onRemove }) => {
    return (
        <div style={{
            backgroundColor: '#2d2d30',
            border: '1px solid #3e3e42',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '12px'
        }}>
            {/* 头部 */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div>
                    <h3 style={{ margin: '0 0 4px 0', color: '#569cd6' }}>{service.displayName}</h3>
                    <p style={{ margin: '0 0 8px 0', color: '#d4d4d4', fontSize: '14px' }}>{service.description}</p>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <ServiceStatusBadge status={service.status} />
                        <span style={{
                            padding: '2px 6px',
                            backgroundColor: '#4ec9b0',
                            color: 'white',
                            borderRadius: '4px',
                            fontSize: '10px'
                        }}>
                            {service.category.toUpperCase()}
                        </span>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    {service.status.isRunning ? (
                        <button
                            onClick={() => onStop(service.id)}
                            style={{
                                padding: '6px 12px',
                                backgroundColor: '#a14040',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '12px'
                            }}
                        >
                            停止
                        </button>
                    ) : (
                        <button
                            onClick={() => onStart(service.id)}
                            style={{
                                padding: '6px 12px',
                                backgroundColor: '#0e639c',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '12px'
                            }}
                        >
                            启动
                        </button>
                    )}
                    <button
                        onClick={() => onTest(service.id)}
                        disabled={!service.status.isRunning}
                        style={{
                            padding: '6px 12px',
                            backgroundColor: service.status.isRunning ? '#14a085' : '#666',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: service.status.isRunning ? 'pointer' : 'not-allowed',
                            fontSize: '12px'
                        }}
                    >
                        测试
                    </button>
                    <button
                        onClick={() => onConfigure(service.id)}
                        style={{
                            padding: '6px 12px',
                            backgroundColor: '#666',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px'
                        }}
                    >
                        配置
                    </button>
                    <button
                        onClick={() => onRemove(service.id)}
                        style={{
                            padding: '6px 12px',
                            backgroundColor: '#dc2626',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px'
                        }}
                    >
                        删除
                    </button>
                </div>
            </div>

            {/* 工具列表 */}
            <div style={{ marginBottom: '12px' }}>
                <h4 style={{ margin: '0 0 8px 0', color: '#4ec9b0', fontSize: '14px' }}>可用工具 ({service.tools.length})</h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {service.tools.map(tool => (
                        <span
                            key={tool.name}
                            style={{
                                padding: '4px 8px',
                                backgroundColor: '#4c4c4c',
                                color: '#d4d4d4',
                                borderRadius: '4px',
                                fontSize: '12px'
                            }}
                            title={tool.description}
                        >
                            {tool.displayName}
                        </span>
                    ))}
                </div>
            </div>

            {/* 统计信息 */}
            <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#808080' }}>
                <span>总调用: {service.stats.totalCalls}</span>
                <span>成功率: {service.stats.totalCalls > 0 ? Math.round((service.stats.successfulCalls / service.stats.totalCalls) * 100) : 0}%</span>
                <span>平均响应: {Math.round(service.stats.averageResponseTime)}ms</span>
                {service.stats.lastCallTime && (
                    <span>最后调用: {service.stats.lastCallTime.toLocaleTimeString()}</span>
                )}
            </div>

            {/* 错误信息 */}
            {service.status.lastError && (
                <div style={{
                    marginTop: '12px',
                    padding: '8px',
                    backgroundColor: '#7c2d12',
                    borderRadius: '4px',
                    fontSize: '12px',
                    color: '#fed7d7'
                }}>
                    错误: {service.status.lastError}
                </div>
            )}
        </div>
    );
};

// 组件：服务测试对话框
const ServiceTestDialog: React.FC<{
    service: MCPServiceConfig | null;
    onClose: () => void;
    onTest: (serviceId: string, toolName: string, parameters: any) => void;
}> = ({ service, onClose, onTest }) => {
    const [selectedTool, setSelectedTool] = useState<string>('');
    const [parameters, setParameters] = useState<Record<string, any>>({});
    const [testResult, setTestResult] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);

    if (!service) return null;

    const handleToolSelect = (toolName: string) => {
        setSelectedTool(toolName);
        setParameters({});
        setTestResult(null);

        // 设置默认参数
        const tool = service.tools.find(t => t.name === toolName);
        if (tool) {
            const defaultParams: Record<string, any> = {};
            tool.parameters.forEach(param => {
                if (param.defaultValue !== undefined) {
                    defaultParams[param.name] = param.defaultValue;
                }
            });
            setParameters(defaultParams);
        }
    };

    const handleParameterChange = (paramName: string, value: any) => {
        setParameters(prev => ({ ...prev, [paramName]: value }));
    };

    const handleTest = async () => {
        if (!selectedTool) return;

        setIsLoading(true);
        try {
            const result = await mcpConfigManager.callTool(service.id, selectedTool, parameters);
            setTestResult(result);
        } catch (error) {
            setTestResult({ error: error.message });
        } finally {
            setIsLoading(false);
        }
    };

    const selectedToolConfig = service.tools.find(t => t.name === selectedTool);

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
        }}>
            <div style={{
                backgroundColor: '#1e1e1e',
                border: '1px solid #3e3e42',
                borderRadius: '8px',
                padding: '24px',
                maxWidth: '600px',
                maxHeight: '80vh',
                overflow: 'auto',
                width: '90%'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h2 style={{ color: '#569cd6', margin: 0 }}>测试 {service.displayName}</h2>
                    <button
                        onClick={onClose}
                        style={{
                            backgroundColor: 'transparent',
                            border: 'none',
                            color: '#d4d4d4',
                            fontSize: '20px',
                            cursor: 'pointer'
                        }}
                    >
                        ×
                    </button>
                </div>

                {/* 工具选择 */}
                <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '8px', color: '#4ec9b0' }}>选择工具:</label>
                    <select
                        value={selectedTool}
                        onChange={(e) => handleToolSelect(e.target.value)}
                        style={{
                            width: '100%',
                            padding: '8px',
                            backgroundColor: '#2d2d30',
                            border: '1px solid #3e3e42',
                            borderRadius: '4px',
                            color: '#d4d4d4'
                        }}
                    >
                        <option value="">请选择工具...</option>
                        {service.tools.map(tool => (
                            <option key={tool.name} value={tool.name}>
                                {tool.displayName} - {tool.description}
                            </option>
                        ))}
                    </select>
                </div>

                {/* 参数配置 */}
                {selectedToolConfig && (
                    <div style={{ marginBottom: '20px' }}>
                        <h3 style={{ color: '#4ec9b0', margin: '0 0 12px 0' }}>参数配置:</h3>
                        {selectedToolConfig.parameters.map(param => (
                            <div key={param.name} style={{ marginBottom: '12px' }}>
                                <label style={{ display: 'block', marginBottom: '4px', color: '#d4d4d4' }}>
                                    {param.name} {param.required && <span style={{ color: '#f87171' }}>*</span>}
                                </label>
                                <input
                                    type={param.type === 'number' ? 'number' : 'text'}
                                    value={parameters[param.name] || ''}
                                    onChange={(e) => handleParameterChange(param.name, param.type === 'number' ? parseFloat(e.target.value) : e.target.value)}
                                    placeholder={param.description}
                                    style={{
                                        width: '100%',
                                        padding: '8px',
                                        backgroundColor: '#2d2d30',
                                        border: '1px solid #3e3e42',
                                        borderRadius: '4px',
                                        color: '#d4d4d4'
                                    }}
                                />
                                <small style={{ color: '#808080' }}>{param.description}</small>
                            </div>
                        ))}

                        {/* 示例按钮 */}
                        {selectedToolConfig.examples.length > 0 && (
                            <div style={{ marginTop: '12px' }}>
                                <span style={{ color: '#4ec9b0', fontSize: '14px' }}>快速示例: </span>
                                {selectedToolConfig.examples.map(example => (
                                    <button
                                        key={example.name}
                                        onClick={() => setParameters(example.parameters)}
                                        style={{
                                            padding: '4px 8px',
                                            backgroundColor: '#4c4c4c',
                                            color: '#d4d4d4',
                                            border: 'none',
                                            borderRadius: '4px',
                                            cursor: 'pointer',
                                            fontSize: '12px',
                                            marginRight: '8px'
                                        }}
                                        title={example.description}
                                    >
                                        {example.name}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* 测试按钮 */}
                <div style={{ marginBottom: '20px' }}>
                    <button
                        onClick={handleTest}
                        disabled={!selectedTool || isLoading}
                        style={{
                            padding: '10px 20px',
                            backgroundColor: selectedTool && !isLoading ? '#0e639c' : '#666',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: selectedTool && !isLoading ? 'pointer' : 'not-allowed',
                            fontSize: '14px'
                        }}
                    >
                        {isLoading ? '测试中...' : '执行测试'}
                    </button>
                </div>

                {/* 测试结果 */}
                {testResult && (
                    <div style={{
                        padding: '12px',
                        backgroundColor: '#2d2d30',
                        border: '1px solid #3e3e42',
                        borderRadius: '4px'
                    }}>
                        <h4 style={{ color: '#4ec9b0', margin: '0 0 8px 0' }}>测试结果:</h4>
                        <pre style={{
                            margin: 0,
                            color: testResult.error ? '#f87171' : '#d4d4d4',
                            fontSize: '12px',
                            whiteSpace: 'pre-wrap',
                            maxHeight: '200px',
                            overflow: 'auto'
                        }}>
                            {JSON.stringify(testResult, null, 2)}
                        </pre>
                    </div>
                )}
            </div>
        </div>
    );
};

// 主组件
const MCPManagerPage: React.FC = () => {
    const [services, setServices] = useState<MCPServiceConfig[]>([]);
    const [filter, setFilter] = useState<string>('all');
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [testingService, setTestingService] = useState<MCPServiceConfig | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // 加载服务列表
        setServices(mcpConfigManager.getAllServices());

        // 订阅更新
        const unsubscribe = mcpConfigManager.onStatusUpdate(setServices);
        return unsubscribe;
    }, []);

    const filteredServices = services.filter(service => {
        const matchesFilter = filter === 'all' ||
            (filter === 'running' && service.status.isRunning) ||
            (filter === 'stopped' && !service.status.isRunning) ||
            (filter === service.category);

        const matchesSearch = service.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            service.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            service.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));

        return matchesFilter && matchesSearch;
    });

    const handleStart = async (id: string) => {
        setLoading(true);
        try {
            await mcpConfigManager.startService(id);
        } finally {
            setLoading(false);
        }
    };

    const handleStop = async (id: string) => {
        setLoading(true);
        try {
            await mcpConfigManager.stopService(id);
        } finally {
            setLoading(false);
        }
    };

    const handleConfigure = (id: string) => {
        // TODO: 实现配置对话框
        console.log('Configure service:', id);
    };

    const handleTest = (id: string) => {
        const service = services.find(s => s.id === id);
        if (service) {
            setTestingService(service);
        }
    };

    const handleRemove = async (id: string) => {
        if (confirm('确定要删除这个服务吗？')) {
            await mcpConfigManager.removeService(id);
        }
    };

    const handleTestTool = async (serviceId: string, toolName: string, parameters: any) => {
        try {
            return await mcpConfigManager.callTool(serviceId, toolName, parameters);
        } catch (error) {
            throw error;
        }
    };

    const runningCount = services.filter(s => s.status.isRunning).length;
    const totalCalls = services.reduce((sum, s) => sum + s.stats.totalCalls, 0);

    return (
        <div style={{
            padding: '20px',
            fontFamily: 'monospace',
            backgroundColor: '#1e1e1e',
            color: '#d4d4d4',
            minHeight: '100vh'
        }}>
            <h1 style={{ color: '#569cd6', marginBottom: '24px' }}>🔧 MCP服务管理器</h1>

            {/* 统计面板 */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '16px',
                marginBottom: '24px'
            }}>
                <div style={{
                    backgroundColor: '#2d2d30',
                    padding: '16px',
                    borderRadius: '8px',
                    textAlign: 'center'
                }}>
                    <h3 style={{ margin: '0 0 8px 0', color: '#4ec9b0' }}>总服务</h3>
                    <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{services.length}</div>
                </div>
                <div style={{
                    backgroundColor: '#2d2d30',
                    padding: '16px',
                    borderRadius: '8px',
                    textAlign: 'center'
                }}>
                    <h3 style={{ margin: '0 0 8px 0', color: '#4ade80' }}>运行中</h3>
                    <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{runningCount}</div>
                </div>
                <div style={{
                    backgroundColor: '#2d2d30',
                    padding: '16px',
                    borderRadius: '8px',
                    textAlign: 'center'
                }}>
                    <h3 style={{ margin: '0 0 8px 0', color: '#fbbf24' }}>总调用</h3>
                    <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{totalCalls}</div>
                </div>
            </div>

            {/* 过滤和搜索 */}
            <div style={{
                display: 'flex',
                gap: '16px',
                marginBottom: '24px',
                flexWrap: 'wrap',
                alignItems: 'center'
            }}>
                <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    style={{
                        padding: '8px',
                        backgroundColor: '#2d2d30',
                        border: '1px solid #3e3e42',
                        borderRadius: '4px',
                        color: '#d4d4d4'
                    }}
                >
                    <option value="all">所有服务</option>
                    <option value="running">运行中</option>
                    <option value="stopped">已停止</option>
                    <option value="weather">天气</option>
                    <option value="data">数据</option>
                    <option value="ai">AI</option>
                    <option value="productivity">生产力</option>
                    <option value="development">开发</option>
                    <option value="other">其他</option>
                </select>

                <input
                    type="text"
                    placeholder="搜索服务..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                        padding: '8px',
                        backgroundColor: '#2d2d30',
                        border: '1px solid #3e3e42',
                        borderRadius: '4px',
                        color: '#d4d4d4',
                        minWidth: '200px'
                    }}
                />

                <button
                    onClick={() => {/* TODO: 添加服务对话框 */ }}
                    style={{
                        padding: '8px 16px',
                        backgroundColor: '#0e639c',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                    }}
                >
                    + 添加服务
                </button>
            </div>

            {/* 服务列表 */}
            <div>
                {filteredServices.length === 0 ? (
                    <div style={{
                        textAlign: 'center',
                        padding: '40px',
                        color: '#808080'
                    }}>
                        {searchTerm ? '没有找到匹配的服务' : '还没有配置任何服务'}
                    </div>
                ) : (
                    filteredServices.map(service => (
                        <ServiceCard
                            key={service.id}
                            service={service}
                            onStart={handleStart}
                            onStop={handleStop}
                            onConfigure={handleConfigure}
                            onTest={handleTest}
                            onRemove={handleRemove}
                        />
                    ))
                )}
            </div>

            {/* 测试对话框 */}
            <ServiceTestDialog
                service={testingService}
                onClose={() => setTestingService(null)}
                onTest={handleTestTool}
            />
        </div>
    );
};

export default MCPManagerPage;
