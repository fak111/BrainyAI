#!/usr/bin/env node

/**
 * 天气预报专用测试工具
 */

const http = require('http');

class WeatherForecastTester {
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
     * 获取Sacramento坐标（从外部API或使用固定坐标）
     */
    getSacramentoCoordinates() {
        // Sacramento, CA的大概坐标
        return {
            latitude: 38.5816,
            longitude: -121.4944
        };
    }

    /**
     * 启动天气服务
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
     * 获取天气预报（使用正确的工具名和参数）
     */
    async getWeatherForecast(latitude, longitude, locationName = 'Unknown') {
        try {
            console.log(`🌤️ 获取 ${locationName} (${latitude}, ${longitude}) 的天气预报...`);

            const response = await this.makeRequest('/mcp/call', 'POST', {
                serverName: this.serverName,
                toolName: 'get_forecast',  // 使用正确的工具名
                args: {
                    latitude: latitude,
                    longitude: longitude
                },
                prompt: `What's the weather forecast for ${locationName} at coordinates ${latitude}, ${longitude}?`
            });

            if (response.data.success && response.data.result && !response.data.result.isError) {
                console.log('✅ 天气预报获取成功!');
                console.log('📊 预报详情:');

                // 解析天气预报内容
                if (response.data.result.content && response.data.result.content[0]) {
                    const forecastText = response.data.result.content[0].text;
                    console.log(forecastText);
                    return forecastText;
                } else {
                    console.log(JSON.stringify(response.data.result, null, 2));
                    return response.data.result;
                }
            } else {
                console.log(`❌ 预报获取失败:`, response.data.result);
                return null;
            }
        } catch (error) {
            console.log(`❌ 预报获取异常: ${error.message}`);
            return null;
        }
    }

    /**
     * 获取加州天气警报
     */
    async getCaliforniaAlerts() {
        try {
            console.log('🚨 获取加州天气警报...');

            const response = await this.makeRequest('/mcp/call', 'POST', {
                serverName: this.serverName,
                toolName: 'get_alerts',
                args: { state: 'CA' },
                prompt: 'What are the current weather alerts for California?'
            });

            if (response.data.success && response.data.result && !response.data.result.isError) {
                console.log('✅ 天气警报获取成功!');
                console.log('🚨 警报详情:');

                if (response.data.result.content && response.data.result.content[0]) {
                    const alertText = response.data.result.content[0].text;
                    console.log(alertText);
                    return alertText;
                } else {
                    console.log(JSON.stringify(response.data.result, null, 2));
                    return response.data.result;
                }
            } else {
                console.log(`❌ 警报获取失败:`, response.data.result);
                return null;
            }
        } catch (error) {
            console.log(`❌ 警报获取异常: ${error.message}`);
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
     * 运行Sacramento天气测试
     */
    async runSacramentoTest() {
        console.log('🎯 Sacramento天气预报测试');
        console.log('=====================================');

        // 启动服务
        const startOk = await this.startWeatherService();
        if (!startOk) {
            console.log('❌ 测试失败: 无法启动天气服务');
            return false;
        }

        console.log('⏳ 等待服务启动完成...');
        await new Promise(resolve => setTimeout(resolve, 3000));

        // 获取Sacramento坐标
        const coords = this.getSacramentoCoordinates();
        console.log(`📍 Sacramento坐标: ${coords.latitude}, ${coords.longitude}`);
        console.log('');

        // 测试天气预报
        const forecast = await this.getWeatherForecast(
            coords.latitude,
            coords.longitude,
            'Sacramento, CA'
        );

        console.log('');

        // 测试加州警报
        const alerts = await this.getCaliforniaAlerts();

        console.log('');

        // 停止服务
        await this.stopWeatherService();

        console.log('');
        console.log('📋 测试总结:');
        console.log(`✅ 服务启动: ${startOk ? '通过' : '失败'}`);
        console.log(`✅ Sacramento预报: ${forecast ? '通过' : '失败'}`);
        console.log(`✅ 加州警报: ${alerts ? '通过' : '失败'}`);

        const allPassed = startOk && forecast && alerts;
        console.log('');
        console.log(`🎉 测试结果: ${allPassed ? '✅ 全部通过!' : '❌ 部分失败'}`);

        if (allPassed) {
            console.log('');
            console.log('🎯 这正是你要求的Sacramento天气查询！');
            console.log('💡 提示: "What\'s the weather in Sacramento?" - 已通过实际的NWS API测试');
        }

        return allPassed;
    }
}

// 主程序
async function main() {
    const tester = new WeatherForecastTester();
    await tester.runSacramentoTest();
}

// 运行
if (require.main === module) {
    main().catch(error => {
        console.error('❌ 测试运行异常:', error);
        process.exit(1);
    });
}

module.exports = WeatherForecastTester;
