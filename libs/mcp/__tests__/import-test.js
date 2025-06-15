/**
 * 简单的导入测试 - 在 Node.js 环境中运行
 * 验证所有 MCP 模块是否可以正常导入
 */

const path = require('path');

console.log('🧪 开始 Phase 1 MCP 模块导入测试...\n');

// 测试1: 导入 types
console.log('📦 测试 1: 导入类型定义');
try {
    const types = require('../types.js');
    console.log('✅ 类型模块导入成功');
    console.log('✅ MCPError 类可用:', typeof types.MCPError === 'function');
    console.log('✅ MCP_ERROR_CODES 可用:', typeof types.MCP_ERROR_CODES === 'object');
    console.log('✅ 错误代码:', Object.keys(types.MCP_ERROR_CODES));
    console.log('');
} catch (error) {
    console.error('❌ 类型模块导入失败:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
}

// 测试2: 导入 MCPClient
console.log('📦 测试 2: 导入 MCPClient');
try {
    const MCPClient = require('../MCPClient.js');
    console.log('✅ MCPClient 模块导入成功');
    console.log('✅ MCPClient 类可用:', typeof MCPClient.MCPClient === 'function');
    console.log('');
} catch (error) {
    console.error('❌ MCPClient 模块导入失败:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
}

// 测试3: 导入 BrowserMCPClient
console.log('📦 测试 3: 导入 BrowserMCPClient');
try {
    const BrowserMCPClient = require('../BrowserMCPClient.js');
    console.log('✅ BrowserMCPClient 模块导入成功');
    console.log('✅ BrowserMCPClient 类可用:', typeof BrowserMCPClient.BrowserMCPClient === 'function');
    console.log('');
} catch (error) {
    console.error('❌ BrowserMCPClient 模块导入失败:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
}

// 测试4: 实例化测试
console.log('🏗️ 测试 4: 基础实例化');
try {
    const { MCPError, MCP_ERROR_CODES } = require('../types.js');
    const { MCPClient } = require('../MCPClient.js');
    const { BrowserMCPClient } = require('../BrowserMCPClient.js');

    // 测试 MCPError
    const error = new MCPError('测试错误', MCP_ERROR_CODES.SERVER_START_FAILED, 'test-server');
    console.log('✅ MCPError 实例化成功:', error.name, error.code);

    // 测试 MCPClient (应该显示警告)
    const mcpClient = new MCPClient('test-server', {
        command: 'echo',
        args: ['test']
    });
    console.log('✅ MCPClient 实例化成功 (服务器名称:', mcpClient.getServerName(), ')');
    console.log('✅ 连接状态 (应该为 false):', mcpClient.isConnected());

    // 测试 BrowserMCPClient
    const browserClient = new BrowserMCPClient('browser-test', {
        name: 'browser-test',
        url: 'http://localhost:3000',
        type: 'http'
    });
    console.log('✅ BrowserMCPClient 实例化成功 (服务器名称:', browserClient.getServerName(), ')');
    console.log('✅ 连接状态:', browserClient.isConnected());
    console.log('');

} catch (error) {
    console.error('❌ 实例化测试失败:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
}

console.log('🎉 所有导入测试通过！');
console.log('📊 测试总结:');
console.log('  ✅ 类型定义导入正常');
console.log('  ✅ MCPClient 导入正常');
console.log('  ✅ BrowserMCPClient 导入正常');
console.log('  ✅ 基础实例化正常');
console.log('');
console.log('🚀 Phase 1 模块导入测试完成！');
console.log('�� 可以进行下一步: 集成测试');
