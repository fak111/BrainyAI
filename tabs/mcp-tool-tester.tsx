import React, { useState, useEffect } from "react";
import { mcpConfigManager, type MCPServiceConfig, type MCPToolConfig } from "~libs/mcp/MCPConfigManager";

const MCPToolTesterPage: React.FC = () => {
    const [services, setServices] = useState<MCPServiceConfig[]>([]);
    const [selectedServiceId, setSelectedServiceId] = useState<string>('');
    const [selectedTool, setSelectedTool] = useState<MCPToolConfig | null>(null);
    const [parameters, setParameters] = useState<Record<string, any>>({});
    const [testResults, setTestResults] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        setServices(mcpConfigManager.getAllServices());
        const unsubscribe = mcpConfigManager.onStatusUpdate(setServices);
        return unsubscribe;
    }, []);

    const selectedService = services.find(s => s.id === selectedServiceId);
    const runningServices = services.filter(s => s.status.isRunning);

    const handleServiceSelect = (serviceId: string) => {
        setSelectedServiceId(serviceId);
        setSelectedTool(null);
        setParameters({});
    };

    const handleToolSelect = (tool: MCPToolConfig) => {
        setSelectedTool(tool);
        // 设置默认参数
        const defaultParams: Record<string, any> = {};
        tool.parameters.forEach(param => {
            if (param.defaultValue !== undefined) {
                defaultParams[param.name] = param.defaultValue;
            }
        });
        setParameters(defaultParams);
    };

    const handleParameterChange = (paramName: string, value: any) => {
        setParameters(prev => ({ ...prev, [paramName]: value }));
    };

    const loadExample = (example: any) => {
        setParameters(example.parameters);
    };

    const executeTest = async () => {
        if (!selectedServiceId || !selectedTool) return;

        setIsLoading(true);
        const startTime = Date.now();

        try {
            const result = await mcpConfigManager.callTool(
                selectedServiceId,
                selectedTool.name,
                parameters,
                `Testing ${selectedTool.name} with parameters: ${JSON.stringify(parameters)}`
            );

            const testResult = {
                id: Date.now(),
                timestamp: new Date(),
                serviceName: selectedService?.displayName,
                toolName: selectedTool.displayName,
                parameters: { ...parameters },
                result,
                success: true,
                duration: Date.now() - startTime
            };

            setTestResults(prev => [testResult, ...prev.slice(0, 9)]); // 保留最近10次
        } catch (error) {
            const testResult = {
                id: Date.now(),
                timestamp: new Date(),
                serviceName: selectedService?.displayName,
                toolName: selectedTool.displayName,
                parameters: { ...parameters },
                error: error.message,
                success: false,
                duration: Date.now() - startTime
            };

            setTestResults(prev => [testResult, ...prev.slice(0, 9)]);
        } finally {
            setIsLoading(false);
        }
    };

    const clearResults = () => {
        setTestResults([]);
    };

    return (
        <div style={{
            padding: '20px',
            fontFamily: 'monospace',
            backgroundColor: '#1e1e1e',
            color: '#d4d4d4',
            minHeight: '100vh'
        }}>
            <h1 style={{ color: '#569cd6', marginBottom: '24px' }}>🧪 MCP工具测试器</h1>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                {/* 左侧：测试配置 */}
                <div>
                    <div style={{
                        backgroundColor: '#2d2d30',
                        border: '1px solid #3e3e42',
                        borderRadius: '8px',
                        padding: '20px',
                        marginBottom: '20px'
                    }}>
                        <h2 style={{ color: '#4ec9b0', marginBottom: '16px' }}>测试配置</h2>

                        {/* 服务选择 */}
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', color: '#d4d4d4' }}>
                                选择服务:
                            </label>
                            <select
                                value={selectedServiceId}
                                onChange={(e) => handleServiceSelect(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '8px',
                                    backgroundColor: '#1e1e1e',
                                    border: '1px solid #3e3e42',
                                    borderRadius: '4px',
                                    color: '#d4d4d4'
                                }}
                            >
                                <option value="">请选择服务...</option>
                                {runningServices.map(service => (
                                    <option key={service.id} value={service.id}>
                                        {service.displayName} ({service.tools.length} 工具)
                                    </option>
                                ))}
                            </select>
                            {runningServices.length === 0 && (
                                <small style={{ color: '#f87171' }}>没有运行中的服务</small>
                            )}
                        </div>

                        {/* 工具选择 */}
                        {selectedService && (
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', color: '#d4d4d4' }}>
                                    选择工具:
                                </label>
                                <div style={{ display: 'grid', gap: '8px' }}>
                                    {selectedService.tools.map(tool => (
                                        <button
                                            key={tool.name}
                                            onClick={() => handleToolSelect(tool)}
                                            style={{
                                                padding: '12px',
                                                backgroundColor: selectedTool?.name === tool.name ? '#0e639c' : '#1e1e1e',
                                                border: '1px solid #3e3e42',
                                                borderRadius: '4px',
                                                color: '#d4d4d4',
                                                cursor: 'pointer',
                                                textAlign: 'left'
                                            }}
                                        >
                                            <div style={{ fontWeight: 'bold' }}>{tool.displayName}</div>
                                            <div style={{ fontSize: '12px', color: '#808080' }}>{tool.description}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 参数配置 */}
                        {selectedTool && (
                            <div style={{ marginBottom: '16px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', color: '#d4d4d4' }}>
                                    参数配置:
                                </label>

                                {selectedTool.parameters.map(param => (
                                    <div key={param.name} style={{ marginBottom: '12px' }}>
                                        <label style={{
                                            display: 'block',
                                            marginBottom: '4px',
                                            color: '#d4d4d4',
                                            fontSize: '14px'
                                        }}>
                                            {param.name}
                                            {param.required && <span style={{ color: '#f87171' }}>*</span>}
                                        </label>
                                        <input
                                            type={param.type === 'number' ? 'number' : 'text'}
                                            value={parameters[param.name] || ''}
                                            onChange={(e) => handleParameterChange(
                                                param.name,
                                                param.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value
                                            )}
                                            placeholder={param.description}
                                            style={{
                                                width: '100%',
                                                padding: '8px',
                                                backgroundColor: '#1e1e1e',
                                                border: '1px solid #3e3e42',
                                                borderRadius: '4px',
                                                color: '#d4d4d4'
                                            }}
                                        />
                                        <small style={{ color: '#808080', fontSize: '12px' }}>
                                            {param.description}
                                        </small>
                                    </div>
                                ))}

                                {/* 示例按钮 */}
                                {selectedTool.examples.length > 0 && (
                                    <div style={{ marginTop: '16px' }}>
                                        <div style={{ marginBottom: '8px', color: '#4ec9b0', fontSize: '14px' }}>
                                            快速示例:
                                        </div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                            {selectedTool.examples.map((example, index) => (
                                                <button
                                                    key={index}
                                                    onClick={() => loadExample(example)}
                                                    style={{
                                                        padding: '6px 12px',
                                                        backgroundColor: '#4c4c4c',
                                                        color: '#d4d4d4',
                                                        border: 'none',
                                                        borderRadius: '4px',
                                                        cursor: 'pointer',
                                                        fontSize: '12px'
                                                    }}
                                                    title={example.description}
                                                >
                                                    {example.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* 执行按钮 */}
                                <div style={{ marginTop: '20px' }}>
                                    <button
                                        onClick={executeTest}
                                        disabled={isLoading || !selectedTool}
                                        style={{
                                            width: '100%',
                                            padding: '12px',
                                            backgroundColor: isLoading || !selectedTool ? '#666' : '#0e639c',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '4px',
                                            cursor: isLoading || !selectedTool ? 'not-allowed' : 'pointer',
                                            fontSize: '16px',
                                            fontWeight: 'bold'
                                        }}
                                    >
                                        {isLoading ? '执行中...' : '🚀 执行测试'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* 右侧：测试结果 */}
                <div>
                    <div style={{
                        backgroundColor: '#2d2d30',
                        border: '1px solid #3e3e42',
                        borderRadius: '8px',
                        padding: '20px'
                    }}>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '16px'
                        }}>
                            <h2 style={{ color: '#4ec9b0', margin: 0 }}>测试结果</h2>
                            {testResults.length > 0 && (
                                <button
                                    onClick={clearResults}
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
                                    清空
                                </button>
                            )}
                        </div>

                        {testResults.length === 0 ? (
                            <div style={{
                                textAlign: 'center',
                                padding: '40px',
                                color: '#808080'
                            }}>
                                还没有执行任何测试
                            </div>
                        ) : (
                            <div style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                                {testResults.map(result => (
                                    <div
                                        key={result.id}
                                        style={{
                                            backgroundColor: '#1e1e1e',
                                            border: `1px solid ${result.success ? '#4ade80' : '#f87171'}`,
                                            borderRadius: '4px',
                                            padding: '12px',
                                            marginBottom: '12px'
                                        }}
                                    >
                                        <div style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            marginBottom: '8px'
                                        }}>
                                            <div>
                                                <strong style={{ color: result.success ? '#4ade80' : '#f87171' }}>
                                                    {result.success ? '✅' : '❌'} {result.toolName}
                                                </strong>
                                                <small style={{ color: '#808080', marginLeft: '8px' }}>
                                                    {result.serviceName}
                                                </small>
                                            </div>
                                            <div style={{ fontSize: '12px', color: '#808080' }}>
                                                {result.timestamp.toLocaleTimeString()} ({result.duration}ms)
                                            </div>
                                        </div>

                                        <div style={{ marginBottom: '8px' }}>
                                            <strong style={{ color: '#4ec9b0' }}>参数:</strong>
                                            <pre style={{
                                                margin: '4px 0',
                                                fontSize: '12px',
                                                color: '#d4d4d4',
                                                backgroundColor: '#0d1117',
                                                padding: '8px',
                                                borderRadius: '4px',
                                                overflow: 'auto'
                                            }}>
                                                {JSON.stringify(result.parameters, null, 2)}
                                            </pre>
                                        </div>

                                        <div>
                                            <strong style={{ color: result.success ? '#4ade80' : '#f87171' }}>
                                                {result.success ? '结果:' : '错误:'}
                                            </strong>
                                            <pre style={{
                                                margin: '4px 0',
                                                fontSize: '12px',
                                                color: result.success ? '#d4d4d4' : '#f87171',
                                                backgroundColor: '#0d1117',
                                                padding: '8px',
                                                borderRadius: '4px',
                                                overflow: 'auto',
                                                maxHeight: '200px'
                                            }}>
                                                {result.success
                                                    ? JSON.stringify(result.result, null, 2)
                                                    : result.error
                                                }
                                            </pre>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MCPToolTesterPage;
