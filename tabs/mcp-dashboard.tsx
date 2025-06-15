import React, { useState, useEffect } from "react";
import { mcpConfigManager, type MCPServiceConfig } from "~libs/mcp/MCPConfigManager";

const MCPDashboardPage: React.FC = () => {
    const [services, setServices] = useState<MCPServiceConfig[]>([]);
    const [stats, setStats] = useState({
        totalServices: 0,
        runningServices: 0,
        totalCalls: 0,
        successRate: 0,
        averageResponseTime: 0
    });

    useEffect(() => {
        setServices(mcpConfigManager.getAllServices());
        const unsubscribe = mcpConfigManager.onStatusUpdate((updatedServices) => {
            setServices(updatedServices);
            calculateStats(updatedServices);
        });

        calculateStats(mcpConfigManager.getAllServices());
        return unsubscribe;
    }, []);

    const calculateStats = (serviceList: MCPServiceConfig[]) => {
        const totalServices = serviceList.length;
        const runningServices = serviceList.filter(s => s.status.isRunning).length;
        const totalCalls = serviceList.reduce((sum, s) => sum + s.stats.totalCalls, 0);
        const successfulCalls = serviceList.reduce((sum, s) => sum + s.stats.successfulCalls, 0);
        const successRate = totalCalls > 0 ? Math.round((successfulCalls / totalCalls) * 100) : 0;
        const totalResponseTime = serviceList.reduce((sum, s) => sum + (s.stats.averageResponseTime * s.stats.totalCalls), 0);
        const averageResponseTime = totalCalls > 0 ? Math.round(totalResponseTime / totalCalls) : 0;

        setStats({
            totalServices,
            runningServices,
            totalCalls,
            successRate,
            averageResponseTime
        });
    };

    const navigateToPage = (page: string) => {
        const extensionId = chrome.runtime.id;
        const url = `chrome-extension://${extensionId}/tabs/${page}.html`;
        chrome.tabs.create({ url });
    };

    const quickStart = async (serviceId: string) => {
        try {
            await mcpConfigManager.startService(serviceId);
        } catch (error) {
            console.error('Failed to start service:', error);
        }
    };

    const quickStop = async (serviceId: string) => {
        try {
            await mcpConfigManager.stopService(serviceId);
        } catch (error) {
            console.error('Failed to stop service:', error);
        }
    };

    const healthyServices = services.filter(s => s.status.health === 'healthy').length;
    const errorServices = services.filter(s => s.status.health === 'error').length;

    return (
        <div style={{
            padding: '20px',
            fontFamily: 'monospace',
            backgroundColor: '#1e1e1e',
            color: '#d4d4d4',
            minHeight: '100vh'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '32px' }}>
                <h1 style={{ color: '#569cd6', margin: 0 }}>🎛️ MCP控制面板</h1>
                <div style={{ marginLeft: 'auto', fontSize: '14px', color: '#808080' }}>
                    Phase 2: 配置管理系统
                </div>
            </div>

            {/* 总览统计 */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '20px',
                marginBottom: '32px'
            }}>
                <div style={{
                    backgroundColor: '#2d2d30',
                    border: '1px solid #3e3e42',
                    borderRadius: '8px',
                    padding: '20px',
                    textAlign: 'center'
                }}>
                    <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#569cd6' }}>
                        {stats.totalServices}
                    </div>
                    <div style={{ color: '#d4d4d4', marginTop: '8px' }}>总服务数</div>
                </div>

                <div style={{
                    backgroundColor: '#2d2d30',
                    border: '1px solid #3e3e42',
                    borderRadius: '8px',
                    padding: '20px',
                    textAlign: 'center'
                }}>
                    <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#4ade80' }}>
                        {stats.runningServices}
                    </div>
                    <div style={{ color: '#d4d4d4', marginTop: '8px' }}>运行中</div>
                </div>

                <div style={{
                    backgroundColor: '#2d2d30',
                    border: '1px solid #3e3e42',
                    borderRadius: '8px',
                    padding: '20px',
                    textAlign: 'center'
                }}>
                    <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#fbbf24' }}>
                        {stats.totalCalls}
                    </div>
                    <div style={{ color: '#d4d4d4', marginTop: '8px' }}>总调用次数</div>
                </div>

                <div style={{
                    backgroundColor: '#2d2d30',
                    border: '1px solid #3e3e42',
                    borderRadius: '8px',
                    padding: '20px',
                    textAlign: 'center'
                }}>
                    <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#4ec9b0' }}>
                        {stats.successRate}%
                    </div>
                    <div style={{ color: '#d4d4d4', marginTop: '8px' }}>成功率</div>
                </div>

                <div style={{
                    backgroundColor: '#2d2d30',
                    border: '1px solid #3e3e42',
                    borderRadius: '8px',
                    padding: '20px',
                    textAlign: 'center'
                }}>
                    <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#a78bfa' }}>
                        {stats.averageResponseTime}ms
                    </div>
                    <div style={{ color: '#d4d4d4', marginTop: '8px' }}>平均响应时间</div>
                </div>
            </div>

            {/* 快速操作面板 */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '20px',
                marginBottom: '32px'
            }}>
                {/* 服务管理 */}
                <div style={{
                    backgroundColor: '#2d2d30',
                    border: '1px solid #3e3e42',
                    borderRadius: '8px',
                    padding: '20px'
                }}>
                    <h3 style={{ color: '#4ec9b0', marginTop: 0 }}>🔧 服务管理</h3>
                    <p style={{ color: '#808080', fontSize: '14px', marginBottom: '16px' }}>
                        管理所有MCP服务的配置、启动、停止和监控
                    </p>
                    <button
                        onClick={() => navigateToPage('mcp-manager')}
                        style={{
                            width: '100%',
                            padding: '12px',
                            backgroundColor: '#0e639c',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '14px'
                        }}
                    >
                        打开服务管理器
                    </button>
                </div>

                {/* 工具测试 */}
                <div style={{
                    backgroundColor: '#2d2d30',
                    border: '1px solid #3e3e42',
                    borderRadius: '8px',
                    padding: '20px'
                }}>
                    <h3 style={{ color: '#4ec9b0', marginTop: 0 }}>🧪 工具测试</h3>
                    <p style={{ color: '#808080', fontSize: '14px', marginBottom: '16px' }}>
                        测试MCP工具的功能，调试参数和查看响应结果
                    </p>
                    <button
                        onClick={() => navigateToPage('mcp-tool-tester')}
                        style={{
                            width: '100%',
                            padding: '12px',
                            backgroundColor: '#14a085',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '14px'
                        }}
                    >
                        打开工具测试器
                    </button>
                </div>

                {/* 天气服务测试 */}
                <div style={{
                    backgroundColor: '#2d2d30',
                    border: '1px solid #3e3e42',
                    borderRadius: '8px',
                    padding: '20px'
                }}>
                    <h3 style={{ color: '#4ec9b0', marginTop: 0 }}>🌤️ 天气服务</h3>
                    <p style={{ color: '#808080', fontSize: '14px', marginBottom: '16px' }}>
                        专门的天气MCP服务测试页面
                    </p>
                    <button
                        onClick={() => navigateToPage('weather-test')}
                        style={{
                            width: '100%',
                            padding: '12px',
                            backgroundColor: '#a14085',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '14px'
                        }}
                    >
                        打开天气测试器
                    </button>
                </div>
            </div>

            {/* 服务状态概览 */}
            <div style={{
                backgroundColor: '#2d2d30',
                border: '1px solid #3e3e42',
                borderRadius: '8px',
                padding: '20px'
            }}>
                <h3 style={{ color: '#4ec9b0', marginTop: 0, marginBottom: '20px' }}>📊 服务状态概览</h3>

                {services.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#808080', padding: '40px' }}>
                        还没有配置任何MCP服务
                    </div>
                ) : (
                    <div style={{ display: 'grid', gap: '12px' }}>
                        {services.map(service => (
                            <div
                                key={service.id}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '12px',
                                    backgroundColor: '#1e1e1e',
                                    border: '1px solid #3e3e42',
                                    borderRadius: '4px'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{
                                        width: '8px',
                                        height: '8px',
                                        borderRadius: '50%',
                                        backgroundColor: service.status.isRunning ?
                                            (service.status.health === 'healthy' ? '#4ade80' : '#fbbf24') :
                                            '#6b7280'
                                    }} />

                                    <div>
                                        <div style={{ fontWeight: 'bold', color: '#d4d4d4' }}>
                                            {service.displayName}
                                        </div>
                                        <div style={{ fontSize: '12px', color: '#808080' }}>
                                            {service.tools.length} 工具 ·
                                            {service.stats.totalCalls} 次调用 ·
                                            {service.stats.totalCalls > 0 ? Math.round((service.stats.successfulCalls / service.stats.totalCalls) * 100) : 0}% 成功率
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: '8px' }}>
                                    {service.status.isRunning ? (
                                        <button
                                            onClick={() => quickStop(service.id)}
                                            style={{
                                                padding: '4px 8px',
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
                                            onClick={() => quickStart(service.id)}
                                            style={{
                                                padding: '4px 8px',
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

                                    <span style={{
                                        padding: '4px 8px',
                                        backgroundColor: service.status.health === 'healthy' ? '#4ade80' :
                                            service.status.health === 'error' ? '#f87171' : '#6b7280',
                                        color: 'white',
                                        borderRadius: '4px',
                                        fontSize: '12px'
                                    }}>
                                        {service.status.health === 'healthy' ? '健康' :
                                            service.status.health === 'error' ? '错误' :
                                                service.status.health === 'warning' ? '警告' : '未知'}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* 健康度指标 */}
            {services.length > 0 && (
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '16px',
                    marginTop: '24px'
                }}>
                    <div style={{
                        backgroundColor: '#2d2d30',
                        border: '1px solid #3e3e42',
                        borderRadius: '8px',
                        padding: '16px',
                        textAlign: 'center'
                    }}>
                        <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#4ade80' }}>
                            {healthyServices}
                        </div>
                        <div style={{ color: '#d4d4d4', marginTop: '4px', fontSize: '14px' }}>健康服务</div>
                    </div>

                    <div style={{
                        backgroundColor: '#2d2d30',
                        border: '1px solid #3e3e42',
                        borderRadius: '8px',
                        padding: '16px',
                        textAlign: 'center'
                    }}>
                        <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#fbbf24' }}>
                            {services.length - healthyServices - errorServices}
                        </div>
                        <div style={{ color: '#d4d4d4', marginTop: '4px', fontSize: '14px' }}>未知状态</div>
                    </div>

                    <div style={{
                        backgroundColor: '#2d2d30',
                        border: '1px solid #3e3e42',
                        borderRadius: '8px',
                        padding: '16px',
                        textAlign: 'center'
                    }}>
                        <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#f87171' }}>
                            {errorServices}
                        </div>
                        <div style={{ color: '#d4d4d4', marginTop: '4px', fontSize: '14px' }}>错误服务</div>
                    </div>
                </div>
            )}

            {/* 底部信息 */}
            <div style={{
                marginTop: '32px',
                padding: '16px',
                backgroundColor: '#2d2d30',
                border: '1px solid #3e3e42',
                borderRadius: '8px',
                fontSize: '12px',
                color: '#808080',
                textAlign: 'center'
            }}>
                MCP (Model Context Protocol) 配置管理系统 · Phase 2 ·
                代理服务器: http://localhost:3001 ·
                更新时间: {new Date().toLocaleString()}
            </div>
        </div>
    );
};

export default MCPDashboardPage;
