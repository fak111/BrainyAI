#!/usr/bin/env node

/**
 * 天气MCP服务命令行测试工具
 */

const http = require('http');

class WeatherMCPTester {
    constructor() {
        this.proxyUrl = 'http://localhost:3001';
        this.serverName = 'weather';
    }

    /**
     * 发送HTTP请求
     */
    async makeRequest(endpoint, method = 'GET', data = null) {
        return new Promise((resolve, reject) => {
            const url = new URL(endpoint, this.proxyUrl);
            const options = {
                hostname: url.hostname,
                port: url.port,
                path: url.pathname,
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                }
            };

            const req = http.request(options, (res) => {
                let body = '';
                res.on('data', chunk => body += chunk);
                res.on('end', () => {
                    try {
                        const parsed = JSON.parse(body);
                        resolve({ status: res.statusCode, data: parsed });
                    } catch (error) {
                        resolve({ status: res.statusCode, data: body });
                    }
                });
            });

            req.on('error', reject);

            if (data) {
                req.write(JSON.stringify(data));
            }
            req.end();
        });
    }

    /**
     * 检查代理服务器健康状态
     */
    async checkHealth() {
        try {
            console.log('🔍 检查代理服务器状态...');
            const response = await this.makeRequest('/health');

            if (response.status === 200) {
                console.log('✅ 代理服务器运行正常');
                console.log(`📊 活跃进程数: ${response.data.activeProcesses}`);
                return true;
            } else {
                console.log(`❌ 代理服务器返回错误: ${response.status}`);
                return false;
            }
        } catch (error) {
            console.log('❌ 无法连接到代理服务器');
            console.log('💡 请确保代理服务器正在运行: node scripts/mcp-proxy-server.js');
            return false;
        }
    }

    /**
     * 启动天气MCP服务
     */
    async startWeatherService() {
        try {
            console.log('🚀 启动天气MCP服务...');

            const response = await this.makeRequest('/mcp/start', 'POST', {
                serverName: this.serverName,
                command: 'uv',
                args: [
                    '--directory',
                    '/Users/zhangbeibei/code/github/try/weather',
                    'run',
                    'weather.py'
                ],
                cwd: '/Users/zhangbeibei/code/github/try/weather'
            });

            if (response.data.success) {
                console.log('✅ 天气服务启动成功');
                console.log(`📡 进程PID: ${response.data.pid}`);
                return true;
            } else {
                console.log(`❌ 启动失败: ${response.data.error}`);
                return false;
            }
        } catch (error) {
            console.log(`❌ 启动异常: ${error.message}`);
            return false;
        }
    }

    /**
     * 查询天气
     */
    async queryWeather(location) {
        try {
            console.log(`🌤️ 查询 ${location} 的天气...`);

            const response = await this.makeRequest('/mcp/call', 'POST', {
                serverName: this.serverName,
                toolName: 'get_weather',
                args: { location: location },
                prompt: `What's the weather in ${location}?`
            });

            if (response.data.success) {
                console.log('✅ 天气查询成功!');
                console.log('📊 天气数据:');
                console.log(JSON.stringify(response.data.result, null, 2));
                return response.data.result;
            } else {
                console.log(`❌ 查询失败: ${response.data.error}`);
                return null;
            }
        } catch (error) {
            console.log(`❌ 查询异常: ${error.message}`);
            return null;
        }
    }

    /**
     * 停止天气服务
     */
    async stopWeatherService() {
        try {
            console.log('⏹️  停止天气MCP服务...');

            const response = await this.makeRequest('/mcp/stop', 'POST', {
                serverName: this.serverName
            });

            if (response.data.success) {
                console.log('✅ 天气服务已停止');
                return true;
            } else {
                console.log(`❌ 停止失败: ${response.data.error}`);
                return false;
            }
        } catch (error) {
            console.log(`❌ 停止异常: ${error.message}`);
            return false;
        }
    }

    /**
     * 运行完整测试
     */
    async runFullTest() {
        console.log('🧪 开始天气MCP服务完整测试');
        console.log('=====================================');

        // 1. 健康检查
        const healthOk = await this.checkHealth();
        if (!healthOk) {
            console.log('❌ 测试失败: 代理服务器不可用');
            return false;
        }

        console.log('');

        // 2. 启动服务
        const startOk = await this.startWeatherService();
        if (!startOk) {
            console.log('❌ 测试失败: 无法启动天气服务');
            return false;
        }

        console.log('');

        // 等待服务完全启动
        console.log('⏳ 等待服务启动完成...');
        await new Promise(resolve => setTimeout(resolve, 3000));

        // 3. 测试查询 Sacramento
        console.log('🎯 测试目标查询: Sacramento');
        const result1 = await this.queryWeather('Sacramento');

        console.log('');

        // 4. 测试查询 Beijing
        console.log('🎯 测试额外查询: Beijing');
        const result2 = await this.queryWeather('Beijing');

        console.log('');

        // 5. 停止服务
        await this.stopWeatherService();

        console.log('');
        console.log('📋 测试总结:');
        console.log(`✅ 代理服务器: ${healthOk ? '通过' : '失败'}`);
        console.log(`✅ 服务启动: ${startOk ? '通过' : '失败'}`);
        console.log(`✅ Sacramento查询: ${result1 ? '通过' : '失败'}`);
        console.log(`✅ Beijing查询: ${result2 ? '通过' : '失败'}`);

        const allPassed = healthOk && startOk && result1 && result2;
        console.log('');
        console.log(`🎉 测试结果: ${allPassed ? '✅ 全部通过!' : '❌ 部分失败'}`);

        return allPassed;
    }
}

// 主程序
async function main() {
    const tester = new WeatherMCPTester();

    const args = process.argv.slice(2);
    const command = args[0] || 'test';

    switch (command) {
        case 'health':
            await tester.checkHealth();
            break;
        case 'start':
            await tester.startWeatherService();
            break;
        case 'query':
            const location = args[1] || 'Sacramento';
            await tester.queryWeather(location);
            break;
        case 'stop':
            await tester.stopWeatherService();
            break;
        case 'test':
        default:
            await tester.runFullTest();
            break;
    }
}

// 运行
if (require.main === module) {
    main().catch(error => {
        console.error('❌ 测试运行异常:', error);
        process.exit(1);
    });
}

module.exports = WeatherMCPTester;
