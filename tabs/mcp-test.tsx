import React, { useState } from "react";
import { sendToBackground } from "@plasmohq/messaging";
import type { MCPTestRequest, MCPTestResponse } from "~background/messages/mcp-test";

const MCPTestPage: React.FC = () => {
    const [testResults, setTestResults] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [testSummary, setTestSummary] = useState<{
        total: number;
        passed: number;
        failed: number;
    } | null>(null);

    const runTest = async (action: MCPTestRequest["action"], testName: string) => {
        setIsLoading(true);
        setTestResults(prev => [...prev, `\n🔄 开始执行 ${testName}...`]);

        try {
            const response = await sendToBackground<MCPTestRequest, MCPTestResponse>({
                name: "mcp-test",
                body: { action }
            });

            if (response.success) {
                setTestResults(prev => [...prev, ...response.results]);
                setTestResults(prev => [...prev, `✅ ${testName} 完成`]);
            } else {
                setTestResults(prev => [...prev, `❌ ${testName} 失败:`]);
                if (response.errors) {
                    setTestResults(prev => [...prev, ...response.errors]);
                }
            }

            return response.success;
        } catch (error) {
            const errorMsg = `❌ ${testName} 执行错误: ${error.message}`;
            setTestResults(prev => [...prev, errorMsg]);
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    const runAllTests = async () => {
        setTestResults([]);
        setTestSummary(null);
        setTestResults(['🧪 开始执行 Phase 1 MCP 完整测试套件...']);

        const tests = [
            { action: 'run_import_test' as const, name: '模块导入测试' },
            { action: 'run_functionality_test' as const, name: '功能测试' },
            { action: 'run_error_test' as const, name: '错误处理测试' }
        ];

        let passed = 0;
        let failed = 0;

        for (const test of tests) {
            const success = await runTest(test.action, test.name);
            if (success) {
                passed++;
            } else {
                failed++;
            }
        }

        setTestSummary({
            total: tests.length,
            passed,
            failed
        });

        setTestResults(prev => [
            ...prev,
            '\n📊 Phase 1 测试总结:',
            `✅ 通过: ${passed}`,
            `❌ 失败: ${failed}`,
            `📈 成功率: ${((passed / tests.length) * 100).toFixed(1)}%`,
            '\n🎉 Phase 1 基础架构测试完成!'
        ]);
    };

    const clearResults = () => {
        setTestResults([]);
        setTestSummary(null);
    };

    return (
        <div style={{
            padding: '20px',
            fontFamily: 'monospace',
            backgroundColor: '#1e1e1e',
            color: '#d4d4d4',
            minHeight: '100vh'
        }}>
            <h1 style={{ color: '#569cd6' }}>🧪 Phase 1: MCP 基础架构测试</h1>

            <div style={{ marginBottom: '20px' }}>
                <h2 style={{ color: '#4ec9b0' }}>测试控制台</h2>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button
                        onClick={() => runTest('run_import_test', '模块导入测试')}
                        disabled={isLoading}
                        style={{
                            padding: '8px 16px',
                            backgroundColor: '#0e639c',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: isLoading ? 'not-allowed' : 'pointer'
                        }}
                    >
                        {isLoading ? '⏳' : '📦'} 模块导入测试
                    </button>

                    <button
                        onClick={() => runTest('run_functionality_test', '功能测试')}
                        disabled={isLoading}
                        style={{
                            padding: '8px 16px',
                            backgroundColor: '#0e639c',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: isLoading ? 'not-allowed' : 'pointer'
                        }}
                    >
                        {isLoading ? '⏳' : '🔧'} 功能测试
                    </button>

                    <button
                        onClick={() => runTest('run_error_test', '错误处理测试')}
                        disabled={isLoading}
                        style={{
                            padding: '8px 16px',
                            backgroundColor: '#0e639c',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: isLoading ? 'not-allowed' : 'pointer'
                        }}
                    >
                        {isLoading ? '⏳' : '⚠️'} 错误处理测试
                    </button>

                    <button
                        onClick={runAllTests}
                        disabled={isLoading}
                        style={{
                            padding: '8px 16px',
                            backgroundColor: '#14a085',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: isLoading ? 'not-allowed' : 'pointer',
                            fontWeight: 'bold'
                        }}
                    >
                        {isLoading ? '⏳' : '🚀'} 运行全部测试
                    </button>

                    <button
                        onClick={clearResults}
                        disabled={isLoading}
                        style={{
                            padding: '8px 16px',
                            backgroundColor: '#a14040',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: isLoading ? 'not-allowed' : 'pointer'
                        }}
                    >
                        🧹 清空结果
                    </button>
                </div>
            </div>

            {testSummary && (
                <div style={{
                    marginBottom: '20px',
                    padding: '15px',
                    backgroundColor: '#2d2d30',
                    borderRadius: '4px',
                    border: '1px solid #3e3e42'
                }}>
                    <h3 style={{ color: '#4ec9b0', margin: '0 0 10px 0' }}>📊 测试总结</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '10px' }}>
                        <div>总计: <span style={{ color: '#569cd6' }}>{testSummary.total}</span></div>
                        <div>通过: <span style={{ color: '#4ec9b0' }}>{testSummary.passed}</span></div>
                        <div>失败: <span style={{ color: '#f44747' }}>{testSummary.failed}</span></div>
                        <div>成功率: <span style={{ color: testSummary.failed === 0 ? '#4ec9b0' : '#f44747' }}>
                            {((testSummary.passed / testSummary.total) * 100).toFixed(1)}%
                        </span></div>
                    </div>
                </div>
            )}

            <div style={{
                backgroundColor: '#2d2d30',
                border: '1px solid #3e3e42',
                borderRadius: '4px',
                padding: '15px',
                maxHeight: '500px',
                overflowY: 'auto'
            }}>
                <h3 style={{ color: '#4ec9b0', margin: '0 0 15px 0' }}>📋 测试结果</h3>
                {testResults.length === 0 ? (
                    <div style={{ color: '#808080', fontStyle: 'italic' }}>
                        点击上方按钮开始测试...
                    </div>
                ) : (
                    <pre style={{
                        margin: 0,
                        whiteSpace: 'pre-wrap',
                        lineHeight: '1.4'
                    }}>
                        {testResults.join('\n')}
                    </pre>
                )}
            </div>

            <div style={{
                marginTop: '20px',
                padding: '15px',
                backgroundColor: '#2d2d30',
                borderRadius: '4px',
                border: '1px solid #3e3e42'
            }}>
                <h3 style={{ color: '#4ec9b0', margin: '0 0 10px 0' }}>ℹ️ 测试说明</h3>
                <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: '1.6' }}>
                    <li><strong>模块导入测试</strong>: 验证 MCP 相关模块是否可以在浏览器扩展环境中正常导入</li>
                    <li><strong>功能测试</strong>: 验证 BrowserMCPClient 的基础功能是否正常工作</li>
                    <li><strong>错误处理测试</strong>: 验证错误处理机制是否按预期工作</li>
                </ul>
                <p style={{ margin: '10px 0 0 0', color: '#808080' }}>
                    这些测试验证 Phase 1 的基础架构是否正确实现，为后续的 Phase 2 开发奠定基础。
                </p>
            </div>
        </div>
    );
};

export default MCPTestPage;
