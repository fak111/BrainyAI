#!/bin/bash

# 天气MCP服务测试启动脚本
echo "🌤️ 天气MCP服务测试启动器"
echo "================================"

# 检查Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 错误: 未找到Node.js"
    echo "请先安装Node.js: https://nodejs.org/"
    exit 1
fi

# 检查项目依赖
if [ ! -d "node_modules" ]; then
    echo "❌ 错误: 项目依赖未安装"
    echo "请先运行: pnpm install"
    exit 1
fi

# 检查代理服务器脚本
if [ ! -f "scripts/mcp-proxy-server.js" ]; then
    echo "❌ 错误: 代理服务器脚本不存在"
    echo "请确保 scripts/mcp-proxy-server.js 文件存在"
    exit 1
fi

echo "🔍 检查天气服务路径..."
WEATHER_PATH="/Users/zhangbeibei/code/github/try/weather"
if [ ! -d "$WEATHER_PATH" ]; then
    echo "⚠️  警告: 天气服务路径不存在: $WEATHER_PATH"
    echo "请确保天气MCP服务已经正确安装"
fi

echo ""
echo "🚀 启动步骤:"
echo "1. 启动MCP代理服务器"
echo "2. 启动浏览器扩展开发服务器"
echo "3. 在Chrome中加载扩展"
echo "4. 访问天气测试页面"
echo ""

# 启动代理服务器
echo "📡 启动MCP代理服务器..."
echo "端口: 3001"
echo "日志: 查看终端输出"
echo ""

# 在后台启动代理服务器
node scripts/mcp-proxy-server.js &
PROXY_PID=$!

echo "✅ MCP代理服务器已启动 (PID: $PROXY_PID)"
echo ""

# 等待服务器启动
echo "⏳ 等待代理服务器启动..."
sleep 3

# 测试代理服务器连接
if curl -s http://localhost:3001/health > /dev/null 2>&1; then
    echo "✅ 代理服务器健康检查通过"
else
    echo "❌ 代理服务器连接失败"
    kill $PROXY_PID 2>/dev/null
    exit 1
fi

echo ""
echo "🎯 下一步操作:"
echo "1. 在新终端中运行: pnpm dev"
echo "2. 在Chrome中加载扩展: chrome://extensions/ → 加载已解压的扩展程序 → 选择 build/chrome-mv3-dev"
echo "3. 访问天气测试页面: chrome-extension://[扩展ID]/tabs/weather-test.html"
echo ""
echo "💡 提示:"
echo "- 使用 Ctrl+C 停止代理服务器"
echo "- 代理服务器地址: http://localhost:3001"
echo "- 健康检查端点: http://localhost:3001/health"
echo ""

# 等待用户停止
echo "按 Ctrl+C 停止代理服务器..."
trap "echo ''; echo '🔄 正在停止代理服务器...'; kill $PROXY_PID 2>/dev/null; echo '✅ 代理服务器已停止'; exit 0" INT

# 保持脚本运行
wait $PROXY_PID
