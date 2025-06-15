/**
 * MCP 基础功能测试
 * 这些测试用于验证 Phase 1 的交付成果
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { MCPProcessManager } from '../MCPProcessManager';
import { MCPToolRegistry } from '../MCPToolRegistry';
import { MCPServerConfig, MCPTool } from '../types';

describe('MCP Basic Functionality', () => {
    let manager: MCPProcessManager;
    let registry: MCPToolRegistry;

    beforeEach(() => {
        manager = new MCPProcessManager();
        registry = new MCPToolRegistry();
    });

    afterEach(async () => {
        await manager.stopAllServers();
        registry.clearAllTools();
    });

    describe('MCPProcessManager', () => {
        test('should initialize successfully', () => {
            expect(manager).toBeInstanceOf(MCPProcessManager);
        });

        test('should get server status for non-existent server', () => {
            const status = manager.getServerStatus('test-server');
            expect(status.name).toBe('test-server');
            expect(status.status).toBe('stopped');
        });

        test('should list empty server statuses initially', () => {
            const statuses = manager.getAllServerStatuses();
            expect(statuses).toEqual([]);
        });

        test('should handle server start with invalid config', async () => {
            const invalidConfig: MCPServerConfig = {
                command: 'invalid-command-that-does-not-exist',
                args: ['--invalid']
            };

            await expect(
                manager.startServer('invalid-server', invalidConfig)
            ).rejects.toThrow();

            const status = manager.getServerStatus('invalid-server');
            expect(status.status).toBe('error');
        });
    });

    describe('MCPToolRegistry', () => {
        test('should initialize empty', () => {
            expect(registry.getAllTools()).toEqual([]);
            expect(registry.getStats().totalTools).toBe(0);
        });

        test('should register and retrieve tools', () => {
            const tool: MCPTool = {
                name: 'test-tool',
                description: 'A test tool',
                inputSchema: { type: 'object' },
                serverName: 'test-server'
            };

            registry.registerTool(tool);

            expect(registry.getAllTools()).toHaveLength(1);
            expect(registry.getTool('test-server', 'test-tool')).toEqual(tool);
            expect(registry.getServerTools('test-server')).toHaveLength(1);
        });

        test('should search tools by name and description', () => {
            const tools: MCPTool[] = [
                {
                    name: 'file-read',
                    description: 'Read file contents',
                    inputSchema: {},
                    serverName: 'fs-server'
                },
                {
                    name: 'http-request',
                    description: 'Make HTTP requests',
                    inputSchema: {},
                    serverName: 'net-server'
                }
            ];

            registry.registerTools(tools);

            expect(registry.searchTools('file')).toHaveLength(1);
            expect(registry.searchTools('http')).toHaveLength(1);
            expect(registry.searchTools('request')).toHaveLength(1);
            expect(registry.searchTools('nonexistent')).toHaveLength(0);
        });

        test('should categorize tools correctly', () => {
            const tools: MCPTool[] = [
                { name: 'file-read', description: '', inputSchema: {}, serverName: 'fs' },
                { name: 'http-get', description: '', inputSchema: {}, serverName: 'net' },
                { name: 'json-parse', description: '', inputSchema: {}, serverName: 'data' },
                { name: 'system-info', description: '', inputSchema: {}, serverName: 'sys' },
                { name: 'unknown-tool', description: '', inputSchema: {}, serverName: 'other' }
            ];

            registry.registerTools(tools);

            const categories = registry.getToolsByCategory();
            expect(categories.filesystem).toHaveLength(1);
            expect(categories.network).toHaveLength(1);
            expect(categories.data).toHaveLength(1);
            expect(categories.system).toHaveLength(1);
            expect(categories.other).toHaveLength(1);
        });

        test('should clear server tools', () => {
            const tools: MCPTool[] = [
                { name: 'tool1', description: '', inputSchema: {}, serverName: 'server1' },
                { name: 'tool2', description: '', inputSchema: {}, serverName: 'server1' },
                { name: 'tool3', description: '', inputSchema: {}, serverName: 'server2' }
            ];

            registry.registerTools(tools);
            expect(registry.getAllTools()).toHaveLength(3);

            registry.clearServerTools('server1');
            expect(registry.getAllTools()).toHaveLength(1);
            expect(registry.getServerTools('server1')).toHaveLength(0);
            expect(registry.getServerTools('server2')).toHaveLength(1);
        });

        test('should provide accurate stats', () => {
            const tools: MCPTool[] = [
                { name: 'tool1', description: '', inputSchema: {}, serverName: 'server1' },
                { name: 'tool2', description: '', inputSchema: {}, serverName: 'server1' },
                { name: 'tool3', description: '', inputSchema: {}, serverName: 'server2' }
            ];

            registry.registerTools(tools);

            const stats = registry.getStats();
            expect(stats.totalTools).toBe(3);
            expect(stats.serverCount).toBe(2);
            expect(stats.toolsByServer['server1']).toBe(2);
            expect(stats.toolsByServer['server2']).toBe(1);
        });
    });

    describe('Integration Tests', () => {
        test('should handle tool registration from manager', async () => {
            // 这个测试需要真实的 MCP 服务器，在实际环境中运行
            // 这里只测试基本的集成逻辑

            const mockTools: MCPTool[] = [
                {
                    name: 'echo',
                    description: 'Echo input',
                    inputSchema: { type: 'object', properties: { text: { type: 'string' } } },
                    serverName: 'test-server'
                }
            ];

            registry.registerTools(mockTools);

            // 验证工具已注册
            expect(registry.getTool('test-server', 'echo')).toBeDefined();

            // 验证可以通过管理器接口访问（模拟）
            const tools = registry.getServerTools('test-server');
            expect(tools).toHaveLength(1);
            expect(tools[0].name).toBe('echo');
        });
    });
});

/**
 * 手动测试用例（需要在浏览器环境中运行）
 * 测试人员可以在开发者工具中执行这些代码
 */
export const MANUAL_TEST_CASES = {
    // 测试用例1：基础连接测试
    testBasicConnection: `
    // 在浏览器开发者工具中执行
    chrome.runtime.sendMessage({
      name: "mcp/process-management",
      body: {
        action: "start",
        serverName: "test-echo",
        config: {
          command: "node",
          args: ["-e", "console.log('Echo server started')"],
          env: {}
        }
      }
    }).then(response => {
      console.log('Start response:', response);
      return chrome.runtime.sendMessage({
        name: "mcp/process-management",
        body: { action: "status", serverName: "test-echo" }
      });
    }).then(response => {
      console.log('Status response:', response);
    });
  `,

    // 测试用例2：列出服务器状态
    testListStatus: `
    chrome.runtime.sendMessage({
      name: "mcp/process-management",
      body: { action: "list-status" }
    }).then(response => {
      console.log('All server statuses:', response);
    });
  `,

    // 测试用例3：停止服务器
    testStopServer: `
    chrome.runtime.sendMessage({
      name: "mcp/process-management",
      body: { action: "stop", serverName: "test-echo" }
    }).then(response => {
      console.log('Stop response:', response);
    });
  `
};
