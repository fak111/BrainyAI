/** @type {import('plasmo').PlasmoConfig} */
module.exports = {
    resolve: {
        alias: {
            // 解决 node: 前缀模块问题
            "node:process": "process/browser",
            "node:stream": "stream-browserify",
            "node:buffer": "buffer",
            "node:crypto": "crypto-browserify",
            "node:util": "util",
            "node:path": "path-browserify",
            "node:url": "url",
            "node:fs": false,
            "node:os": false,
            // 解决 MCP SDK 路径问题
            "@modelcontextprotocol/sdk/client": "@modelcontextprotocol/sdk/client",
            "@modelcontextprotocol/sdk/client/stdio": "@modelcontextprotocol/sdk/client/stdio",
        }
    },
    define: {
        // 为浏览器环境提供 Node.js 全局变量
        global: "globalThis",
        process: "process",
    },
    // 启用更好的错误报告
    verbose: true
}
