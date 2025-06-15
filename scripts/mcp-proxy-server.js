#!/usr/bin/env node

/**
 * MCP HTTP 代理服务器
 * 在浏览器扩展和MCP服务之间建立HTTP通信桥梁
 */

const http = require('http');
const { spawn } = require('child_process');
const { promisify } = require('util');

class MCPProxyServer {
    constructor(port = 3001) {
        this.port = port;
        this.mcpProcesses = new Map(); // 存储MCP进程
        this.server = null;
    }

    /**
     * 启动代理服务器
     */
    start() {
        this.server = http.createServer(this.handleRequest.bind(this));

        this.server.listen(this.port, () => {
            console.log(`🚀 MCP代理服务器启动成功！`);
            console.log(`📡 监听端口: ${this.port}`);
            console.log(`🔗 访问地址: http://localhost:${this.port}`);
            console.log(`📋 API端点:`);
            console.log(`   POST /mcp/start    - 启动MCP服务`);
            console.log(`   POST /mcp/call     - 调用MCP工具`);
            console.log(`   POST /mcp/stop     - 停止MCP服务`);
            console.log(`   GET  /health       - 健康检查`);
        });

        // 优雅关闭
        process.on('SIGINT', () => {
            console.log('\n🔄 正在关闭服务器...');
            this.cleanup();
            process.exit(0);
        });
    }

    /**
     * 处理HTTP请求
     */
    async handleRequest(req, res) {
        // 设置CORS头
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
            res.writeHead(200);
            res.end();
            return;
        }

        const url = new URL(req.url, `http://localhost:${this.port}`);

        try {
            switch (url.pathname) {
                case '/health':
                    await this.handleHealth(req, res);
                    break;
                case '/mcp/start':
                    await this.handleMCPStart(req, res);
                    break;
                case '/mcp/call':
                    await this.handleMCPCall(req, res);
                    break;
                case '/mcp/stop':
                    await this.handleMCPStop(req, res);
                    break;
                default:
                    res.writeHead(404, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Not Found' }));
            }
        } catch (error) {
            console.error('❌ 请求处理错误:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                error: 'Internal Server Error',
                message: error.message
            }));
        }
    }

    /**
     * 健康检查
     */
    async handleHealth(req, res) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            activeProcesses: this.mcpProcesses.size
        }));
    }

    /**
     * 启动MCP服务
     */
    async handleMCPStart(req, res) {
        const body = await this.getRequestBody(req);
        const { serverName, command, args, cwd } = JSON.parse(body);

        console.log(`🔄 启动MCP服务: ${serverName}`);
        console.log(`📝 命令: ${command} ${args.join(' ')}`);

        try {
            // 如果进程已存在，先关闭
            if (this.mcpProcesses.has(serverName)) {
                await this.stopMCPProcess(serverName);
            }

            // 启动新进程
            const process = spawn(command, args, {
                cwd: cwd || process.cwd(),
                stdio: ['pipe', 'pipe', 'pipe']
            });

            // 存储进程信息
            this.mcpProcesses.set(serverName, {
                process,
                stdin: process.stdin,
                stdout: process.stdout,
                stderr: process.stderr,
                startTime: Date.now()
            });

            // 监听进程事件
            process.on('error', (error) => {
                console.error(`❌ MCP进程错误 [${serverName}]:`, error);
            });

            process.on('exit', (code) => {
                console.log(`🔄 MCP进程退出 [${serverName}]: code ${code}`);
                this.mcpProcesses.delete(serverName);
            });

            // 等待进程启动并收集初始输出
            await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('进程启动超时 - 10秒内未收到输出'));
                }, 10000);

                let initialOutput = '';
                let errorOutput = '';

                const dataHandler = (data) => {
                    initialOutput += data.toString();
                    console.log(`📊 MCP输出 [${serverName}]:`, data.toString().trim());
                    // 如果收到任何输出，认为进程已启动
                    clearTimeout(timeout);
                    resolve();
                };

                const errorHandler = (data) => {
                    errorOutput += data.toString();
                    console.log(`⚠️ MCP错误 [${serverName}]:`, data.toString().trim());
                };

                process.stdout.once('data', dataHandler);
                process.stderr.on('data', errorHandler);

                process.on('error', (error) => {
                    clearTimeout(timeout);
                    reject(new Error(`进程启动失败: ${error.message}`));
                });

                process.on('exit', (code) => {
                    clearTimeout(timeout);
                    if (code !== 0) {
                        reject(new Error(`进程异常退出 (code: ${code}), stderr: ${errorOutput}`));
                    }
                });

                // 给进程一点时间启动
                setTimeout(() => {
                    // 如果进程还在运行，认为启动成功
                    if (!process.killed && process.pid) {
                        clearTimeout(timeout);
                        resolve();
                    }
                }, 2000);
            });

            // 初始化MCP连接
            console.log(`🔄 初始化MCP连接 [${serverName}]...`);
            try {
                await this.initializeMCPConnection(this.mcpProcesses.get(serverName));
                console.log(`✅ MCP连接初始化成功 [${serverName}]`);
            } catch (initError) {
                console.warn(`⚠️ MCP连接初始化失败 [${serverName}]:`, initError.message);
                // 不要因为初始化失败而终止，某些MCP服务可能不需要显式初始化
            }

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: true,
                message: `MCP服务 ${serverName} 启动成功`,
                pid: process.pid
            }));

        } catch (error) {
            console.error(`❌ 启动MCP服务失败 [${serverName}]:`, error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: false,
                error: error.message
            }));
        }
    }

    /**
     * 调用MCP工具
     */
    async handleMCPCall(req, res) {
        const body = await this.getRequestBody(req);
        const { serverName, toolName, args: toolArgs, prompt } = JSON.parse(body);

        console.log(`🔧 调用MCP工具: ${serverName}.${toolName}`);
        console.log(`📝 参数:`, toolArgs);
        console.log(`💬 提示:`, prompt);

        try {
            const mcpInfo = this.mcpProcesses.get(serverName);
            if (!mcpInfo) {
                throw new Error(`MCP服务 ${serverName} 未启动`);
            }

            // 构造MCP消息
            const message = {
                jsonrpc: "2.0",
                id: Date.now(),
                method: "tools/call",
                params: {
                    name: toolName,
                    arguments: toolArgs || {}
                }
            };

            // 发送消息到MCP进程
            const response = await this.sendMCPMessage(mcpInfo, message);

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: true,
                result: response,
                serverName,
                toolName,
                timestamp: new Date().toISOString()
            }));

        } catch (error) {
            console.error(`❌ MCP工具调用失败:`, error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: false,
                error: error.message
            }));
        }
    }

    /**
     * 停止MCP服务
     */
    async handleMCPStop(req, res) {
        const body = await this.getRequestBody(req);
        const { serverName } = JSON.parse(body);

        try {
            await this.stopMCPProcess(serverName);

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: true,
                message: `MCP服务 ${serverName} 已停止`
            }));
        } catch (error) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: false,
                error: error.message
            }));
        }
    }

    /**
 * 初始化MCP连接
 */
    async initializeMCPConnection(mcpInfo) {
        // 发送initialize请求
        const initMessage = {
            jsonrpc: "2.0",
            id: 1,
            method: "initialize",
            params: {
                protocolVersion: "2024-11-05",
                capabilities: {
                    tools: {}
                },
                clientInfo: {
                    name: "mcp-proxy",
                    version: "1.0.0"
                }
            }
        };

        const initResponse = await this.sendMCPMessage(mcpInfo, initMessage);
        console.log(`📊 MCP初始化响应:`, initResponse);

        // 发送initialized通知
        const notificationMessage = {
            jsonrpc: "2.0",
            method: "notifications/initialized"
        };

        const notificationStr = JSON.stringify(notificationMessage) + '\n';
        mcpInfo.stdin.write(notificationStr);
        console.log(`📤 发送initialized通知`);
    }

    /**
     * 发送消息到MCP进程并等待响应
     */
    async sendMCPMessage(mcpInfo, message) {
        return new Promise((resolve, reject) => {
            const messageStr = JSON.stringify(message) + '\n';
            console.log(`📤 发送MCP消息:`, messageStr.trim());

            let responseData = '';

            // 设置响应监听器
            const responseHandler = (data) => {
                responseData += data.toString();
                console.log(`📥 收到MCP数据:`, data.toString().trim());

                try {
                    // 尝试解析JSON响应（可能是多行）
                    const lines = responseData.split('\n');
                    for (const line of lines) {
                        if (line.trim()) {
                            const response = JSON.parse(line.trim());
                            if (response.id === message.id || response.jsonrpc) {
                                mcpInfo.stdout.off('data', responseHandler);
                                clearTimeout(timeout);
                                console.log(`✅ MCP响应匹配:`, response);
                                resolve(response);
                                return;
                            }
                        }
                    }
                } catch (error) {
                    // 继续等待更多数据
                    console.log(`⚠️ JSON解析失败，继续等待:`, error.message);
                }
            };

            // 设置超时
            const timeout = setTimeout(() => {
                mcpInfo.stdout.off('data', responseHandler);
                console.log(`❌ MCP调用超时，已收到数据:`, responseData);
                reject(new Error(`MCP调用超时 - 收到数据: ${responseData}`));
            }, 15000);

            mcpInfo.stdout.on('data', responseHandler);

            // 发送消息
            mcpInfo.stdin.write(messageStr);
            console.log(`📤 消息已发送到stdin`);
        });
    }

    /**
     * 获取请求体
     */
    async getRequestBody(req) {
        return new Promise((resolve, reject) => {
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', () => resolve(body));
            req.on('error', reject);
        });
    }

    /**
     * 停止MCP进程
     */
    async stopMCPProcess(serverName) {
        const mcpInfo = this.mcpProcesses.get(serverName);
        if (mcpInfo) {
            mcpInfo.process.kill();
            this.mcpProcesses.delete(serverName);
            console.log(`🔄 MCP服务 ${serverName} 已停止`);
        }
    }

    /**
     * 清理所有进程
     */
    cleanup() {
        for (const [serverName] of this.mcpProcesses) {
            this.stopMCPProcess(serverName);
        }
        if (this.server) {
            this.server.close();
        }
    }
}

// 启动服务器
const proxy = new MCPProxyServer(3001);
proxy.start();
