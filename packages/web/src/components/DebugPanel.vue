<template>
    <div class="debug-panel" :class="{ collapsed: isCollapsed }">
        <!-- 折叠按钮 -->
        <div class="debug-header" @click="toggleCollapse">
            <span class="debug-title">
                <span class="debug-icon">🔧</span>
                调试日志
                <span v-if="logs.length > 0" class="log-count">({{ logs.length }})</span>
            </span>
            <div class="debug-actions">
                <button v-if="!isCollapsed" class="action-btn" @click.stop="copyLogs" title="复制日志">
                    📋
                </button>
                <button v-if="!isCollapsed" class="action-btn" @click.stop="clearLogs" title="清空日志">
                    🗑️
                </button>
                <span class="collapse-icon">{{ isCollapsed ? '▲' : '▼' }}</span>
            </div>
        </div>
        
        <!-- 日志内容 -->
        <div v-if="!isCollapsed" class="debug-content" ref="logContainer">
            <div v-if="logs.length === 0" class="empty-logs">
                暂无日志，发送消息后会显示调试信息
            </div>
            <div v-for="(log, index) in logs" :key="index" class="log-entry" :class="log.type">
                <span class="log-time">{{ formatTime(log.timestamp) }}</span>
                <span class="log-tag" :class="log.type">{{ log.tag }}</span>
                <span class="log-message">{{ log.message }}</span>
                <pre v-if="log.data" class="log-data">{{ formatData(log.data) }}</pre>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, nextTick, watch } from 'vue'

export interface DebugLog {
    timestamp: number
    type: 'info' | 'event' | 'error' | 'warn' | 'success' | 'request' | 'response'
    tag: string
    message: string
    data?: unknown
}

const props = defineProps<{
    logs: DebugLog[]
}>()

const emit = defineEmits<{
    clear: []
}>()

const isCollapsed = ref(false)
const logContainer = ref<HTMLElement | null>(null)

function toggleCollapse() {
    isCollapsed.value = !isCollapsed.value
}

function formatTime(timestamp: number): string {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('zh-CN', { 
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    }) + '.' + String(date.getMilliseconds()).padStart(3, '0')
}

function formatData(data: unknown): string {
    if (typeof data === 'string') {
        return data.length > 500 ? data.slice(0, 500) + '...' : data
    }
    try {
        const str = JSON.stringify(data, null, 2)
        return str.length > 500 ? str.slice(0, 500) + '...' : str
    } catch {
        return String(data)
    }
}

function copyLogs() {
    const text = props.logs.map(log => {
        let line = `[${formatTime(log.timestamp)}] [${log.tag}] ${log.message}`
        if (log.data) {
            line += '\n  Data: ' + (typeof log.data === 'string' ? log.data : JSON.stringify(log.data))
        }
        return line
    }).join('\n')
    
    navigator.clipboard.writeText(text).then(() => {
        alert('日志已复制到剪贴板')
    }).catch(() => {
        // 备用方案
        const textarea = document.createElement('textarea')
        textarea.value = text
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
        alert('日志已复制到剪贴板')
    })
}

function clearLogs() {
    emit('clear')
}

// 自动滚动到底部
watch(() => props.logs.length, () => {
    nextTick(() => {
        if (logContainer.value) {
            logContainer.value.scrollTop = logContainer.value.scrollHeight
        }
    })
})
</script>

<style scoped>
.debug-panel {
    position: fixed;
    bottom: 0;
    right: 16px;
    width: 450px;
    max-height: 350px;
    background: var(--bg-secondary);
    border: 1px solid var(--border-color);
    border-bottom: none;
    border-radius: 8px 8px 0 0;
    box-shadow: 0 -2px 12px rgba(0, 0, 0, 0.15);
    z-index: 1000;
    font-family: 'JetBrains Mono', 'SF Mono', Consolas, monospace;
    font-size: 11px;
    display: flex;
    flex-direction: column;
}

.debug-panel.collapsed {
    max-height: 36px;
}

.debug-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    background: var(--bg-tertiary);
    border-bottom: 1px solid var(--border-color);
    cursor: pointer;
    user-select: none;
    border-radius: 8px 8px 0 0;
}

.debug-panel.collapsed .debug-header {
    border-bottom: none;
}

.debug-title {
    display: flex;
    align-items: center;
    gap: 6px;
    font-weight: 600;
    color: var(--text-primary);
}

.debug-icon {
    font-size: 14px;
}

.log-count {
    color: var(--text-tertiary);
    font-weight: normal;
}

.debug-actions {
    display: flex;
    align-items: center;
    gap: 8px;
}

.action-btn {
    background: none;
    border: none;
    padding: 2px 6px;
    cursor: pointer;
    border-radius: 4px;
    font-size: 12px;
    transition: background 0.2s;
}

.action-btn:hover {
    background: var(--bg-hover);
}

.collapse-icon {
    color: var(--text-tertiary);
    font-size: 10px;
}

.debug-content {
    flex: 1;
    overflow-y: auto;
    padding: 8px;
    max-height: 300px;
}

.empty-logs {
    color: var(--text-tertiary);
    text-align: center;
    padding: 20px;
    font-style: italic;
}

.log-entry {
    padding: 4px 6px;
    border-radius: 4px;
    margin-bottom: 4px;
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    gap: 6px;
    line-height: 1.4;
}

.log-entry.error {
    background: rgba(239, 68, 68, 0.1);
}

.log-entry.warn {
    background: rgba(245, 158, 11, 0.1);
}

.log-entry.success {
    background: rgba(16, 185, 129, 0.1);
}

.log-entry.event {
    background: rgba(59, 130, 246, 0.1);
}

.log-time {
    color: var(--text-tertiary);
    flex-shrink: 0;
}

.log-tag {
    padding: 1px 6px;
    border-radius: 3px;
    font-weight: 600;
    font-size: 10px;
    text-transform: uppercase;
    flex-shrink: 0;
}

.log-tag.info {
    background: var(--bg-tertiary);
    color: var(--text-secondary);
}

.log-tag.event {
    background: rgba(59, 130, 246, 0.2);
    color: #3b82f6;
}

.log-tag.error {
    background: rgba(239, 68, 68, 0.2);
    color: #ef4444;
}

.log-tag.warn {
    background: rgba(245, 158, 11, 0.2);
    color: #f59e0b;
}

.log-tag.success {
    background: rgba(16, 185, 129, 0.2);
    color: #10b981;
}

.log-tag.request {
    background: rgba(139, 92, 246, 0.2);
    color: #8b5cf6;
}

.log-tag.response {
    background: rgba(6, 182, 212, 0.2);
    color: #06b6d4;
}

.log-message {
    color: var(--text-primary);
    flex: 1;
    min-width: 0;
    word-break: break-word;
}

.log-data {
    width: 100%;
    margin: 4px 0 0 0;
    padding: 6px 8px;
    background: var(--bg-tertiary);
    border-radius: 4px;
    color: var(--text-secondary);
    font-size: 10px;
    overflow-x: auto;
    white-space: pre-wrap;
    word-break: break-all;
    max-height: 100px;
    overflow-y: auto;
}

/* 滚动条样式 */
.debug-content::-webkit-scrollbar,
.log-data::-webkit-scrollbar {
    width: 6px;
    height: 6px;
}

.debug-content::-webkit-scrollbar-thumb,
.log-data::-webkit-scrollbar-thumb {
    background: var(--border-color);
    border-radius: 3px;
}

.debug-content::-webkit-scrollbar-track,
.log-data::-webkit-scrollbar-track {
    background: transparent;
}
</style>

