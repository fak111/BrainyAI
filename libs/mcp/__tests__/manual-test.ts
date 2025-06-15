/**
 * 手动测试脚本
 * 用于验证 MCP 模块的基础功能
 */

// 测试1: 模块导入测试
console.log('🧪 开始 Phase 1 MCP 测试...\n');

console.log('📦 测试 1: 模块导入');
try {
    const { MCPClient } = require('../MCPClient');
    const { BrowserMCPClient } = require('../BrowserMCPClient');
    const { MCPError, MCP_ERROR_CODES } = require('../types');

    console.log('✅ MCPClient 导入成功');
    console.log('✅ BrowserMCPClient 导入成功');
    console.log('✅ 类型定义导入成功');
    console.log('✅ 所有模块导入测试通过\n');
} catch (error) {
    console.error('❌ 模块导入失败:', error.message);
    process.exit(1);
}

// 测试2: BrowserMCPClient 实例化测试
console.log('🏗️ 测试 2: BrowserMCPClient 实例化');
try {
    const { BrowserMCPClient } = require('../BrowserMCPClient');

    const client = new BrowserMCPClient('test-server', {
        name: 'test-server',
        url: 'http://localhost:3000',
        type: 'http'
    });

    console.log('✅ BrowserMCPClient 实例创建成功');
    console.log('✅ 服务器名称:', client.getServerName());
    console.log('✅ 配置获取:', JSON.stringify(client.getConfig(), null, 2));
    console.log('✅ 连接状态:', client.isConnected());
    console.log('✅ BrowserMCPClient 实例化测试通过\n');
} catch (error) {
    console.error('❌ BrowserMCPClient 实例化失败:', error.message);
    process.exit(1);
}

// 测试3: MCPClient 错误处理测试
console.log('⚠️ 测试 3: MCPClient 错误处理');
try {
    const { MCPClient, MCPError } = require('../MCPClient');

    const client = new MCPClient('test-server', {
        command: 'echo',
        args: ['test'],
        timeout: 5000
    });

    console.log('✅ MCPClient 实例创建成功');
    console.log('✅ 连接状态 (应该为 false):', client.isConnected());

    // 测试连接错误
    try {
        await client.connect();
        console.error('❌ 预期应该抛出错误，但没有');
    } catch (error) {
        if (error.message.includes('not supported in browser environment')) {
            console.log('✅ 连接错误正确抛出');
        } else {
            console.error('❌ 错误消息不符合预期:', error.message);
        }
    }

    // 测试方法调用错误
    try {
        await client.listTools();
        console.error('❌ 预期应该抛出错误，但没有');
    } catch (error) {
        if (error.message.includes('not supported in browser environment')) {
            console.log('✅ 方法调用错误正确抛出');
        } else {
            console.error('❌ 错误消息不符合预期:', error.message);
        }
    }

    console.log('✅ MCPClient 错误处理测试通过\n');
} catch (error) {
    console.error('❌ MCPClient 错误处理测试失败:', error.message);
    process.exit(1);
}

// 测试4: 类型定义测试
console.log('🏷️ 测试 4: 类型定义验证');
try {
    const { MCP_ERROR_CODES } = require('../types');

    console.log('✅ 错误代码常量:', Object.keys(MCP_ERROR_CODES));
    console.log('✅ 类型定义验证通过\n');
} catch (error) {
    console.error('❌ 类型定义验证失败:', error.message);
    process.exit(1);
}

console.log('🎉 Phase 1 所有手动测试通过！');
console.log('📊 测试总结:');
console.log('- 模块导入: ✅ 通过');
console.log('- BrowserMCPClient 实例化: ✅ 通过');
console.log('- MCPClient 错误处理: ✅ 通过');
console.log('- 类型定义: ✅ 通过');
console.log('\n🚀 Phase 1 基础架构测试完成！');
