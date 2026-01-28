/**
 * Centralized Logging System for Ruins Nexus
 * 
 * Features:
 * - Log levels (debug, info, warn, error)
 * - Namespace support (combat, movement, crafting, etc.)
 * - Enable/disable logging per namespace
 * - Export logs for analysis
 * - Browser console + in-memory buffer
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export type LogNamespace = 
    | "combat" 
    | "movement" 
    | "crafting" 
    | "exploration"
    | "turn"
    | "state"
    | "network"
    | "ai"
    | "ui"
    | "general";

export interface LogEntry {
    timestamp: number;
    level: LogLevel;
    namespace: LogNamespace;
    message: string;
    data?: unknown;
}

interface LoggerConfig {
    enabled: boolean;
    minLevel: LogLevel;
    enabledNamespaces: Set<LogNamespace>;
    bufferSize: number;
    consoleOutput: boolean;
}

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};

const LOG_COLORS: Record<LogLevel, string> = {
    debug: "#888",
    info: "#4a9eff",
    warn: "#ff9800",
    error: "#f44336",
};

const NAMESPACE_COLORS: Record<LogNamespace, string> = {
    combat: "#e91e63",
    movement: "#9c27b0",
    crafting: "#ff5722",
    exploration: "#4caf50",
    turn: "#2196f3",
    state: "#607d8b",
    network: "#00bcd4",
    ai: "#ff9800",
    ui: "#795548",
    general: "#9e9e9e",
};

class GameLogger {
    private config: LoggerConfig = {
        enabled: true,
        minLevel: "debug",
        enabledNamespaces: new Set([
            "combat", "movement", "crafting", "exploration",
            "turn", "state", "network", "ai", "ui", "general"
        ]),
        bufferSize: 1000,
        consoleOutput: true,
    };

    private buffer: LogEntry[] = [];
    private listeners: Array<(entry: LogEntry) => void> = [];

    /**
     * Configure logger settings
     */
    configure(options: Partial<LoggerConfig>): void {
        if (options.enabled !== undefined) this.config.enabled = options.enabled;
        if (options.minLevel) this.config.minLevel = options.minLevel;
        if (options.enabledNamespaces) this.config.enabledNamespaces = options.enabledNamespaces;
        if (options.bufferSize) this.config.bufferSize = options.bufferSize;
        if (options.consoleOutput !== undefined) this.config.consoleOutput = options.consoleOutput;
    }

    /**
     * Enable/disable specific namespace
     */
    setNamespaceEnabled(namespace: LogNamespace, enabled: boolean): void {
        if (enabled) {
            this.config.enabledNamespaces.add(namespace);
        } else {
            this.config.enabledNamespaces.delete(namespace);
        }
    }

    /**
     * Enable all namespaces
     */
    enableAll(): void {
        const all: LogNamespace[] = [
            "combat", "movement", "crafting", "exploration",
            "turn", "state", "network", "ai", "ui", "general"
        ];
        this.config.enabledNamespaces = new Set(all);
    }

    /**
     * Disable all namespaces
     */
    disableAll(): void {
        this.config.enabledNamespaces.clear();
    }

    /**
     * Set minimum log level
     */
    setMinLevel(level: LogLevel): void {
        this.config.minLevel = level;
    }

    /**
     * Add listener for log entries
     */
    addListener(listener: (entry: LogEntry) => void): () => void {
        this.listeners.push(listener);
        return () => {
            const idx = this.listeners.indexOf(listener);
            if (idx >= 0) this.listeners.splice(idx, 1);
        };
    }

    /**
     * Core log method
     */
    private log(level: LogLevel, namespace: LogNamespace, message: string, data?: unknown): void {
        if (!this.config.enabled) return;
        if (!this.config.enabledNamespaces.has(namespace)) return;
        if (LOG_LEVEL_PRIORITY[level] < LOG_LEVEL_PRIORITY[this.config.minLevel]) return;

        const entry: LogEntry = {
            timestamp: Date.now(),
            level,
            namespace,
            message,
            data,
        };

        // Add to buffer
        this.buffer.push(entry);
        if (this.buffer.length > this.config.bufferSize) {
            this.buffer.shift();
        }

        // Notify listeners
        for (const listener of this.listeners) {
            try {
                listener(entry);
            } catch (e) {
                // Don't break on listener errors
            }
        }

        // Console output
        if (this.config.consoleOutput) {
            this.outputToConsole(entry);
        }
    }

    private outputToConsole(entry: LogEntry): void {
        const time = new Date(entry.timestamp).toISOString().slice(11, 23);
        const prefix = `[${time}] [${entry.namespace.toUpperCase()}]`;
        
        const styles = [
            `color: ${LOG_COLORS[entry.level]}; font-weight: bold`,
            `color: ${NAMESPACE_COLORS[entry.namespace]}`,
            "color: inherit",
        ];

        const consoleFn = console[entry.level] || console.log;
        
        if (entry.data !== undefined) {
            consoleFn(`%c${entry.level.toUpperCase()}%c ${prefix}%c ${entry.message}`, ...styles, entry.data);
        } else {
            consoleFn(`%c${entry.level.toUpperCase()}%c ${prefix}%c ${entry.message}`, ...styles);
        }
    }

    // Convenience methods for each level
    debug(namespace: LogNamespace, message: string, data?: unknown): void {
        this.log("debug", namespace, message, data);
    }

    info(namespace: LogNamespace, message: string, data?: unknown): void {
        this.log("info", namespace, message, data);
    }

    warn(namespace: LogNamespace, message: string, data?: unknown): void {
        this.log("warn", namespace, message, data);
    }

    error(namespace: LogNamespace, message: string, data?: unknown): void {
        this.log("error", namespace, message, data);
    }

    // Namespace-specific shortcuts
    combat = {
        debug: (msg: string, data?: unknown) => this.debug("combat", msg, data),
        info: (msg: string, data?: unknown) => this.info("combat", msg, data),
        warn: (msg: string, data?: unknown) => this.warn("combat", msg, data),
        error: (msg: string, data?: unknown) => this.error("combat", msg, data),
    };

    movement = {
        debug: (msg: string, data?: unknown) => this.debug("movement", msg, data),
        info: (msg: string, data?: unknown) => this.info("movement", msg, data),
        warn: (msg: string, data?: unknown) => this.warn("movement", msg, data),
        error: (msg: string, data?: unknown) => this.error("movement", msg, data),
    };

    crafting = {
        debug: (msg: string, data?: unknown) => this.debug("crafting", msg, data),
        info: (msg: string, data?: unknown) => this.info("crafting", msg, data),
        warn: (msg: string, data?: unknown) => this.warn("crafting", msg, data),
        error: (msg: string, data?: unknown) => this.error("crafting", msg, data),
    };

    exploration = {
        debug: (msg: string, data?: unknown) => this.debug("exploration", msg, data),
        info: (msg: string, data?: unknown) => this.info("exploration", msg, data),
        warn: (msg: string, data?: unknown) => this.warn("exploration", msg, data),
        error: (msg: string, data?: unknown) => this.error("exploration", msg, data),
    };

    turn = {
        debug: (msg: string, data?: unknown) => this.debug("turn", msg, data),
        info: (msg: string, data?: unknown) => this.info("turn", msg, data),
        warn: (msg: string, data?: unknown) => this.warn("turn", msg, data),
        error: (msg: string, data?: unknown) => this.error("turn", msg, data),
    };

    state = {
        debug: (msg: string, data?: unknown) => this.debug("state", msg, data),
        info: (msg: string, data?: unknown) => this.info("state", msg, data),
        warn: (msg: string, data?: unknown) => this.warn("state", msg, data),
        error: (msg: string, data?: unknown) => this.error("state", msg, data),
    };

    network = {
        debug: (msg: string, data?: unknown) => this.debug("network", msg, data),
        info: (msg: string, data?: unknown) => this.info("network", msg, data),
        warn: (msg: string, data?: unknown) => this.warn("network", msg, data),
        error: (msg: string, data?: unknown) => this.error("network", msg, data),
    };

    ai = {
        debug: (msg: string, data?: unknown) => this.debug("ai", msg, data),
        info: (msg: string, data?: unknown) => this.info("ai", msg, data),
        warn: (msg: string, data?: unknown) => this.warn("ai", msg, data),
        error: (msg: string, data?: unknown) => this.error("ai", msg, data),
    };

    ui = {
        debug: (msg: string, data?: unknown) => this.debug("ui", msg, data),
        info: (msg: string, data?: unknown) => this.info("ui", msg, data),
        warn: (msg: string, data?: unknown) => this.warn("ui", msg, data),
        error: (msg: string, data?: unknown) => this.error("ui", msg, data),
    };

    /**
     * Get all buffered logs
     */
    getBuffer(): LogEntry[] {
        return [...this.buffer];
    }

    /**
     * Get logs filtered by criteria
     */
    getLogs(options?: {
        namespace?: LogNamespace;
        level?: LogLevel;
        since?: number;
        limit?: number;
    }): LogEntry[] {
        let logs = [...this.buffer];

        if (options?.namespace) {
            logs = logs.filter(e => e.namespace === options.namespace);
        }
        if (options?.level) {
            const minPriority = LOG_LEVEL_PRIORITY[options.level];
            logs = logs.filter(e => LOG_LEVEL_PRIORITY[e.level] >= minPriority);
        }
        if (options?.since) {
            logs = logs.filter(e => e.timestamp >= options.since);
        }
        if (options?.limit) {
            logs = logs.slice(-options.limit);
        }

        return logs;
    }

    /**
     * Export logs as JSON string
     */
    exportLogs(): string {
        return JSON.stringify(this.buffer, null, 2);
    }

    /**
     * Export logs as downloadable file (browser)
     */
    downloadLogs(filename?: string): void {
        const data = this.exportLogs();
        const blob = new Blob([data], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename || `ruins-nexus-logs-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    /**
     * Clear log buffer
     */
    clear(): void {
        this.buffer = [];
    }

    /**
     * Format logs for display
     */
    formatLogs(logs: LogEntry[]): string {
        return logs.map(entry => {
            const time = new Date(entry.timestamp).toISOString();
            const dataStr = entry.data ? ` | ${JSON.stringify(entry.data)}` : "";
            return `[${time}] [${entry.level.toUpperCase()}] [${entry.namespace}] ${entry.message}${dataStr}`;
        }).join("\n");
    }
}

// Singleton export
export const Logger = new GameLogger();

// Type for external use
export type { GameLogger };
