/**
 * 简单的日志记录器
 * 统一管理MCP系统的日志输出
 */

export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3
}

export class Logger {
    private static logLevel: LogLevel = LogLevel.INFO;
    private static enableConsole: boolean = true;
    private static logs: LogEntry[] = [];
    private static maxLogs: number = 1000;

    static setLogLevel(level: LogLevel) {
        this.logLevel = level;
    }

    static setConsoleEnabled(enabled: boolean) {
        this.enableConsole = enabled;
    }

    static debug(message: string, ...args: any[]) {
        this.log(LogLevel.DEBUG, message, ...args);
    }

    static log(message: string, ...args: any[]) {
        this.log(LogLevel.INFO, message, ...args);
    }

    static warn(message: string, ...args: any[]) {
        this.log(LogLevel.WARN, message, ...args);
    }

    static error(message: string, ...args: any[]) {
        this.log(LogLevel.ERROR, message, ...args);
    }

    private static log(level: LogLevel, message: string, ...args: any[]) {
        if (level < this.logLevel) return;

        const timestamp = new Date();
        const logEntry: LogEntry = {
            timestamp,
            level,
            message,
            args,
            source: 'MCP'
        };

        // 添加到内存日志
        this.logs.push(logEntry);
        if (this.logs.length > this.maxLogs) {
            this.logs.shift();
        }

        // 控制台输出
        if (this.enableConsole) {
            const timeStr = timestamp.toISOString().split('T')[1].split('.')[0];
            const levelStr = LogLevel[level].padEnd(5);
            const fullMessage = `[${timeStr}] [${levelStr}] ${message}`;

            switch (level) {
                case LogLevel.DEBUG:
                    console.debug(fullMessage, ...args);
                    break;
                case LogLevel.INFO:
                    console.log(fullMessage, ...args);
                    break;
                case LogLevel.WARN:
                    console.warn(fullMessage, ...args);
                    break;
                case LogLevel.ERROR:
                    console.error(fullMessage, ...args);
                    break;
            }
        }
    }

    static getLogs(count?: number): LogEntry[] {
        if (count) {
            return this.logs.slice(-count);
        }
        return [...this.logs];
    }

    static clearLogs() {
        this.logs = [];
    }

    static getLogsAsString(count?: number): string {
        const logs = this.getLogs(count);
        return logs.map(log => {
            const timeStr = log.timestamp.toISOString().split('T')[1].split('.')[0];
            const levelStr = LogLevel[log.level].padEnd(5);
            const argsStr = log.args.length > 0 ? ' ' + log.args.map(a =>
                typeof a === 'object' ? JSON.stringify(a) : String(a)
            ).join(' ') : '';
            return `[${timeStr}] [${levelStr}] ${log.message}${argsStr}`;
        }).join('\n');
    }
}

export interface LogEntry {
    timestamp: Date;
    level: LogLevel;
    message: string;
    args: any[];
    source: string;
}
