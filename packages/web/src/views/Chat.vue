<template>
  <div class="chat">
    <!-- 消息列表 -->
    <div class="messages-container" ref="messagesRef">
      <div class="messages-wrapper">
        <!-- 欢迎信息 -->
        <div v-if="messages.length === 0" class="welcome">
          <div class="welcome-icon">🔗</div>
          <h1>MCPLink</h1>
          <p>开始和 AI 对话，它可以调用工具帮你完成任务</p>
        </div>

        <!-- 消息列表 -->
        <div v-for="(msg, index) in messages" :key="index" class="message" :class="msg.role">
          <div class="message-inner">
            <!-- 用户消息 -->
            <div v-if="msg.role === 'user'" class="message-content user-message">
              {{ msg.content }}
            </div>

            <!-- AI 消息 -->
            <div v-else class="message-content assistant-message">
              <!-- 执行过程 - 只显示有工具调用的步骤 -->
              <div v-if="msg.steps && msg.steps.some(s => s.toolCalls.length > 0)" class="execution-process">
                <template v-for="(step, si) in msg.steps" :key="si">
                  <div 
                    v-if="step.toolCalls.length > 0"
                    class="step-block"
                    :class="{ 'step-expanded': step.expanded, 'step-completed': step.status === 'completed' }"
                  >
                    <div class="step-header" @click="toggleStep(msg, si)">
                      <div class="step-icon">
                        <svg v-if="step.status === 'running'" class="spinner" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <circle cx="12" cy="12" r="10" stroke-dasharray="50" stroke-dashoffset="20"></circle>
                        </svg>
                        <svg v-else-if="step.status === 'completed'" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                        <svg v-else xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <circle cx="12" cy="12" r="10"></circle>
                        </svg>
                      </div>
                      <div class="step-title">
                        <span class="step-label">{{ getStepTitle(step) }}</span>
                        <span class="step-summary">
                          <template v-if="step.status === 'running'">
                            {{ getRunningStatus(step) }}
                          </template>
                          <template v-else>
                            {{ getCompletedSummary(step) }}
                          </template>
                        </span>
                      </div>
                      <div class="step-chevron">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                      </div>
                    </div>

                    <div v-if="step.expanded" class="step-content">
                      <!-- 思考过程 -->
                      <div v-if="step.thinking" class="thinking-block">
                        <div class="thinking-label">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                            <line x1="12" y1="17" x2="12.01" y2="17"></line>
                          </svg>
                          <span>思考过程</span>
                        </div>
                        <div class="thinking-text">{{ step.thinking }}</div>
                      </div>

                      <!-- 工具调用 -->
                      <div 
                        v-for="(tool, ti) in step.toolCalls" 
                        :key="ti" 
                        class="tool-block"
                        :class="tool.status"
                      >
                        <div class="tool-header">
                          <div class="tool-icon">
                            <svg v-if="tool.status === 'pending' || tool.status === 'executing'" class="spinner" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                              <circle cx="12" cy="12" r="10" stroke-dasharray="50" stroke-dashoffset="20"></circle>
                            </svg>
                            <svg v-else-if="tool.status === 'success'" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                              <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                            <svg v-else xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                              <circle cx="12" cy="12" r="10"></circle>
                              <line x1="15" y1="9" x2="9" y2="15"></line>
                              <line x1="9" y1="9" x2="15" y2="15"></line>
                            </svg>
                          </div>
                          <span class="tool-name">{{ tool.name }}</span>
                          <span class="tool-status-text">
                            <template v-if="tool.status === 'pending'">准备中</template>
                            <template v-else-if="tool.status === 'executing'">执行中...</template>
                            <template v-else-if="tool.status === 'success'">
                              <span class="success-text">✓ {{ tool.duration }}ms</span>
                            </template>
                            <template v-else-if="tool.status === 'error'">
                              <span class="error-text">✗ 失败</span>
                            </template>
                          </span>
                        </div>

                        <details v-if="Object.keys(tool.arguments).length > 0" class="tool-details">
                          <summary>参数</summary>
                          <pre class="tool-json">{{ formatJson(tool.arguments) }}</pre>
                        </details>

                        <details v-if="tool.result !== undefined" class="tool-details">
                          <summary>结果</summary>
                          <pre class="tool-json">{{ formatToolResult(tool.result) }}</pre>
                        </details>
                      </div>
                    </div>
                  </div>
                </template>
              </div>

              <!-- AI 回复文本 -->
              <div v-if="msg.content || (isStreaming && index === messages.length - 1)" class="assistant-text">
                <MarkdownRenderer 
                  :content="isStreaming && index === messages.length - 1 ? streamingContent : msg.content" 
                  :streaming="isStreaming && index === messages.length - 1"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- 正在思考提示（在 AI 消息内容为空时显示） -->
        <div v-if="isThinking" class="thinking-status">
          <div class="thinking-indicator">
            <span class="thinking-dot"></span>
            <span class="thinking-text">正在思考...</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 输入区域 -->
    <div class="input-area">
      <!-- 工具选择器 -->
      <div v-if="store.availableTools.length > 0" class="tools-selector">
        <div class="tools-header" @click="showToolsPanel = !showToolsPanel">
          <div class="tools-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
            </svg>
          </div>
          <span class="tools-label">
            {{ selectedToolsLabel }}
          </span>
          <div class="tools-chevron" :class="{ 'expanded': showToolsPanel }">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </div>
        </div>
        
        <div v-if="showToolsPanel" class="tools-panel">
          <div class="tools-actions">
            <button class="btn-link" @click="store.clearSelectedTools()">全选</button>
            <span class="divider">|</span>
            <button class="btn-link" @click="store.setSelectedTools([])">清空</button>
          </div>
          <div class="tools-list">
            <label 
              v-for="tool in store.availableTools" 
              :key="tool.name" 
              class="tool-checkbox"
              :class="{ 'checked': isToolSelected(tool.name) }"
            >
              <input 
                type="checkbox" 
                :checked="isToolSelected(tool.name)"
                @change="toggleToolSelection(tool.name)"
              />
              <span class="tool-info">
                <span class="tool-name">{{ tool.name }}</span>
                <span class="tool-desc">{{ tool.description }}</span>
              </span>
            </label>
          </div>
        </div>
      </div>
      
      <div class="input-wrapper">
        <textarea
          ref="inputRef"
          v-model="inputMessage"
          class="message-input"
          placeholder="发送消息..."
          rows="1"
          @keydown="handleKeydown"
          @input="autoResize"
          :disabled="isLoading || !store.isConnected"
        ></textarea>
        <button
          class="send-btn"
          :disabled="!inputMessage.trim() || isLoading || !store.isConnected"
          @click="sendMessage"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
        </button>
      </div>
      <p class="input-hint">
        <span v-if="!store.isConnected" class="error">未连接到服务，请在设置中配置</span>
        <span v-else-if="store.enabledModels.length === 0" class="warning">请先在设置中添加模型</span>
        <span v-else>Enter 发送，Shift + Enter 换行</span>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, watch, onMounted } from 'vue'
import type { ComputedRef } from 'vue'
import { useAppStore } from '@/stores/app'
import { api } from '@/api'
import type { SSEEvent } from '@/api/types'
import MarkdownRenderer from '@/components/MarkdownRenderer.vue'

// 步骤内的工具调用记录
interface ToolCallRecord {
  name: string
  arguments: Record<string, unknown>
  result: unknown
  duration: number
  status: 'pending' | 'executing' | 'success' | 'error'
  toolCallId?: string
}

// 执行步骤
interface ExecutionStep {
  iteration: number
  status: 'running' | 'completed'
  thinking: string
  toolCalls: ToolCallRecord[]
  expanded: boolean
}

// 增强的消息类型
interface EnhancedMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  steps?: ExecutionStep[]
}

const store = useAppStore()
const messagesRef = ref<HTMLElement | null>(null)
const inputRef = ref<HTMLTextAreaElement | null>(null)
const inputMessage = ref('')
const isLoading = ref(false)
const isStreaming = ref(false)
const messages = ref<EnhancedMessage[]>([])
const showToolsPanel = ref(false)

// 是否显示初始思考状态（只在发送后、收到第一个事件前显示）
const hasReceivedFirstEvent = ref(false)

// 流式内容缓冲区（用于减少 Vue 更新频率）
const streamingContent = ref('')
let streamingBuffer = ''
let flushTimer: ReturnType<typeof setTimeout> | null = null

// 刷新流式内容到 Vue 状态
function flushStreamingContent() {
  if (streamingBuffer) {
    streamingContent.value += streamingBuffer
    streamingBuffer = ''
  }
  flushTimer = null
}

// 添加流式内容（带节流）
function appendStreamingContent(content: string) {
  streamingBuffer += content
  // 每 16ms（约 60fps）刷新一次
  if (!flushTimer) {
    flushTimer = setTimeout(flushStreamingContent, 16)
  }
}

const isThinking = computed(() => {
  if (!isLoading.value) return false
  if (hasReceivedFirstEvent.value) return false
  const lastMsg = messages.value[messages.value.length - 1]
  return lastMsg?.role === 'assistant'
})

// 工具选择相关
const selectedToolsLabel = computed(() => {
  if (store.selectedToolNames.length === 0) {
    return `全部工具 (${store.availableTools.length})`
  }
  if (store.selectedToolNames.length === 1) {
    return store.selectedToolNames[0]
  }
  return `${store.selectedToolNames.length} 个工具`
})

function isToolSelected(toolName: string) {
  // 空数组表示全选
  if (store.selectedToolNames.length === 0) return true
  return store.selectedToolNames.includes(toolName)
}

function toggleToolSelection(toolName: string) {
  const currentSelected = store.selectedToolNames.length === 0 
    ? store.availableTools.map(t => t.name)
    : [...store.selectedToolNames]
  
  const index = currentSelected.indexOf(toolName)
  if (index === -1) {
    currentSelected.push(toolName)
  } else {
    currentSelected.splice(index, 1)
  }
  
  // 如果全选了，清空数组表示全选
  if (currentSelected.length === store.availableTools.length) {
    store.setSelectedTools([])
  } else {
    store.setSelectedTools(currentSelected)
  }
}

// 监听会话切换
watch(() => store.currentConversationId, async (id) => {
  if (id) {
    const conv = store.conversations.find(c => c.id === id)
    if (conv) {
      // 转换旧格式消息
      messages.value = conv.messages.map(m => ({
        role: m.role,
        content: m.content,
        timestamp: m.timestamp,
        steps: m.toolCalls?.map((tc, i) => ({
          iteration: i + 1,
          status: 'completed' as const,
          thinking: '',
          toolCalls: [{
            name: tc.name,
            arguments: tc.arguments,
            result: tc.result,
            duration: tc.duration,
            status: (tc.status || 'success') as 'success' | 'error' | 'pending' | 'executing',
          }],
          expanded: false,
        })) || [],
      }))
      scrollToBottom()
    }
  } else {
    messages.value = []
  }
}, { immediate: true })

// 滚动到底部（使用 requestAnimationFrame 优化性能）
let scrollRAF: number | null = null
function scrollToBottom() {
  // 取消之前的滚动请求，避免重复
  if (scrollRAF) {
    cancelAnimationFrame(scrollRAF)
  }
  scrollRAF = requestAnimationFrame(() => {
    if (messagesRef.value) {
      messagesRef.value.scrollTop = messagesRef.value.scrollHeight
    }
    scrollRAF = null
  })
}

// 自动调整输入框高度
function autoResize() {
  if (inputRef.value) {
    inputRef.value.style.height = 'auto'
    inputRef.value.style.height = Math.min(inputRef.value.scrollHeight, 200) + 'px'
  }
}

// 处理键盘事件
function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    sendMessage()
  }
}

// 切换步骤展开/收起
function toggleStep(msg: EnhancedMessage, stepIndex: number) {
  if (msg.steps && msg.steps[stepIndex]) {
    msg.steps[stepIndex].expanded = !msg.steps[stepIndex].expanded
  }
}

// 获取步骤标题
function getStepTitle(step: ExecutionStep): string {
  if (step.toolCalls.length === 1) {
    return `调用 ${step.toolCalls[0].name}`
  }
  return `步骤 ${step.iteration}`
}

// 获取运行中状态文本
function getRunningStatus(step: ExecutionStep): string {
  const executing = step.toolCalls.find(t => t.status === 'executing')
  if (executing) {
    return `正在执行 ${executing.name}...`
  }
  const pending = step.toolCalls.find(t => t.status === 'pending')
  if (pending) {
    return `准备调用 ${pending.name}...`
  }
  return '处理中...'
}

// 获取完成摘要
function getCompletedSummary(step: ExecutionStep): string {
  const successCount = step.toolCalls.filter(t => t.status === 'success').length
  const errorCount = step.toolCalls.filter(t => t.status === 'error').length
  const totalTime = step.toolCalls.reduce((sum, t) => sum + t.duration, 0)
  
  if (errorCount > 0) {
    return `${successCount} 成功, ${errorCount} 失败 · ${totalTime}ms`
  }
  if (step.toolCalls.length === 1) {
    return `${totalTime}ms`
  }
  return `${successCount} 个工具 · ${totalTime}ms`
}

// 格式化 JSON
function formatJson(obj: unknown): string {
  try {
    return JSON.stringify(obj, null, 2)
  } catch {
    return String(obj)
  }
}

// 格式化工具结果
function formatToolResult(result: unknown): string {
  if (typeof result === 'string') {
    // 尝试解析为 JSON 进行美化
    try {
      const parsed = JSON.parse(result)
      return JSON.stringify(parsed, null, 2)
    } catch {
      return result
    }
  }
  return formatJson(result)
}

// 发送消息
async function sendMessage() {
  const message = inputMessage.value.trim()
  if (!message || isLoading.value) return

  inputMessage.value = ''
  if (inputRef.value) {
    inputRef.value.style.height = 'auto'
  }
  isLoading.value = true
  isStreaming.value = false
  hasReceivedFirstEvent.value = false
  // 重置流式内容
  streamingContent.value = ''
  streamingBuffer = ''
  if (flushTimer) {
    clearTimeout(flushTimer)
    flushTimer = null
  }

  // 如果没有当前会话，创建一个
  if (!store.currentConversationId) {
    await store.createConversation()
  }

  // 添加用户消息
  messages.value.push({
    role: 'user',
    content: message,
    timestamp: Date.now(),
  })
  scrollToBottom()

  // 准备 AI 消息
  const aiMessage: EnhancedMessage = {
    role: 'assistant',
    content: '',
    timestamp: Date.now(),
    steps: [],
  }
  messages.value.push(aiMessage)

  // 当前步骤
  let currentStep: ExecutionStep | null = null
  // 当前工具调用
  let currentToolCall: ToolCallRecord | null = null

  // 关闭工具选择面板
  showToolsPanel.value = false
  
  // 获取选中的工具（空数组表示全选，传 undefined）
  const selectedTools = store.selectedToolNames.length > 0 ? store.selectedToolNames : undefined

  // 发起请求
  api.chat(message, {
    modelId: store.currentModelId || undefined,
    conversationId: store.currentConversationId || undefined,
    tools: selectedTools,
    onEvent: (event: SSEEvent) => {
      handleSSEEvent(event, aiMessage, {
        getCurrentStep: () => currentStep,
        setCurrentStep: (step) => { currentStep = step },
        getCurrentToolCall: () => currentToolCall,
        setCurrentToolCall: (tool) => { currentToolCall = tool },
      })
      // 只在关键事件时滚动，text_delta 太频繁会导致性能问题
      if (event.type !== 'text_delta' && event.type !== 'tool_call_delta') {
        scrollToBottom()
      }
    },
    onError: (error) => {
      console.error('Chat error:', error)
      aiMessage.content = `错误: ${error.message}`
      isLoading.value = false
      isStreaming.value = false
    },
    onComplete: () => {
      // 刷新所有缓冲的内容
      if (flushTimer) {
        clearTimeout(flushTimer)
        flushTimer = null
      }
      flushStreamingContent()
      
      isLoading.value = false
      isStreaming.value = false
      // 收起所有步骤
      if (aiMessage.steps) {
        aiMessage.steps.forEach(step => {
          step.expanded = false
        })
      }
      saveConversation()
    },
  })
}

// 处理 SSE 事件
function handleSSEEvent(
  event: SSEEvent, 
  aiMessage: EnhancedMessage,
  context: {
    getCurrentStep: () => ExecutionStep | null
    setCurrentStep: (step: ExecutionStep | null) => void
    getCurrentToolCall: () => ToolCallRecord | null
    setCurrentToolCall: (tool: ToolCallRecord | null) => void
  }
) {
  const { getCurrentStep, setCurrentStep, setCurrentToolCall } = context

  // 收到有意义的事件后，隐藏"正在思考"
  if (event.type !== 'connected') {
    hasReceivedFirstEvent.value = true
  }

  switch (event.type) {
    case 'iteration_start': {
      // 开始新的迭代步骤
      const step: ExecutionStep = {
        iteration: event.data.iteration || 1,
        status: 'running',
        thinking: '',
        toolCalls: [],
        expanded: true, // 默认展开当前步骤
      }
      if (!aiMessage.steps) {
        aiMessage.steps = []
      }
      aiMessage.steps.push(step)
      setCurrentStep(step)
      // 清空当前消息内容（新迭代开始）
      break
    }

    case 'iteration_end': {
      const step = getCurrentStep()
      if (step) {
        step.status = 'completed'
        // 如果这个步骤没有工具调用，把 thinking 清空（因为它就是最终回复）
        if (step.toolCalls.length === 0) {
          step.thinking = ''
        }
      }
      break
    }

    case 'text_start':
      isStreaming.value = true
      break

    case 'text_delta': {
      isStreaming.value = true
      const content = event.data.content || ''
      // 使用节流更新，减少 Vue 重渲染
      appendStreamingContent(content)
      // 同步更新到消息对象（但不立即触发渲染）
      aiMessage.content += content
      const step = getCurrentStep()
      if (step) {
        step.thinking += content
      }
      // 流式输出时定期滚动
      scrollToBottom()
      break
    }

    case 'text_end':
      isStreaming.value = false
      break

    case 'thinking_content': {
      // 当有工具调用时，之前的文本是思考过程
      // 清空 message.content（因为它不是最终回复），保留在 step.thinking
      const step = getCurrentStep()
      if (step) {
        step.thinking = event.data.content || ''
        // 清空 message.content，因为有工具调用，这只是思考过程
        aiMessage.content = ''
      }
      break
    }

    case 'thinking_delta': {
      const step = getCurrentStep()
      if (step) {
        step.thinking += event.data.content || ''
      }
      break
    }

    case 'tool_call_start': {
      const step = getCurrentStep()
      if (step) {
        // 检查是否已存在（避免重复添加）
        const existing = step.toolCalls.find(t => t.toolCallId === event.data.toolCallId)
        if (!existing) {
          const tool: ToolCallRecord = {
            name: event.data.toolName || '',
            arguments: event.data.toolArgs || {},
            result: undefined,
            duration: 0,
            status: 'pending',
            toolCallId: event.data.toolCallId,
          }
          step.toolCalls.push(tool)
          setCurrentToolCall(tool)
        }
      }
      break
    }

    case 'tool_call_delta': {
      // 流式工具参数更新 - 暂时忽略，等待完整参数
      break
    }

    case 'tool_call_end': {
      const step = getCurrentStep()
      if (step && event.data.toolCallId) {
        const tool = step.toolCalls.find(t => t.toolCallId === event.data.toolCallId)
        if (tool && event.data.toolArgs) {
          tool.arguments = event.data.toolArgs
        }
      }
      break
    }

    case 'tool_executing': {
      const step = getCurrentStep()
      if (step) {
        const tool = step.toolCalls.find(t => t.toolCallId === event.data.toolCallId)
        if (tool) {
          tool.status = 'executing'
          // 确保参数已设置
          if (event.data.toolArgs) {
            tool.arguments = event.data.toolArgs
          }
        }
      }
      break
    }

    case 'tool_result': {
      const step = getCurrentStep()
      if (step) {
        const tool = step.toolCalls.find(t => t.toolCallId === event.data.toolCallId)
        if (tool) {
          tool.result = event.data.toolResult
          tool.duration = event.data.duration || 0
          tool.status = event.data.isError ? 'error' : 'success'
        }
      }
      setCurrentToolCall(null)
      break
    }

    case 'error':
      aiMessage.content = `错误: ${event.data.error}`
      isStreaming.value = false
      break

    case 'complete':
      isStreaming.value = false
      break
  }
}

// 保存会话
async function saveConversation() {
  if (store.currentConversationId) {
    // 转换为存储格式
    const storedMessages = messages.value.map(m => ({
      role: m.role,
      content: m.content,
      timestamp: m.timestamp,
      toolCalls: m.steps?.flatMap(step => step.toolCalls.map(tc => ({
        name: tc.name,
        arguments: tc.arguments,
        result: tc.result,
        duration: tc.duration,
        status: tc.status,
      }))),
    }))
    await api.updateConversation(store.currentConversationId, {
      messages: storedMessages,
    })
  }
}

onMounted(() => {
  inputRef.value?.focus()
})
</script>

<style scoped>
.chat {
  display: flex;
  flex-direction: column;
  height: 100%;
}

/* 消息区域 */
.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 20px 0;
}

.messages-wrapper {
  max-width: var(--max-chat-width);
  margin: 0 auto;
  padding: 0 20px;
}

/* 欢迎信息 */
.welcome {
  text-align: center;
  padding: 80px 20px;
}

.welcome-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.welcome h1 {
  font-size: 28px;
  font-weight: 600;
  margin-bottom: 8px;
  color: var(--text-primary);
}

.welcome p {
  color: var(--text-secondary);
}

/* 消息 */
.message {
  margin-bottom: 24px;
}

.message-inner {
  display: flex;
}

.message.user .message-inner {
  justify-content: flex-end;
}

.message-content {
  max-width: 85%;
}

.user-message {
  background: var(--accent-color);
  color: white;
  padding: 12px 16px;
  border-radius: 18px 18px 4px 18px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-word;
}

.assistant-message {
  color: var(--text-primary);
  width: 100%;
  max-width: 100%;
}

.assistant-text {
  line-height: 1.7;
  word-break: break-word;
}

/* 执行过程 */
.execution-process {
  margin-bottom: 16px;
}

.step-block {
  background: var(--bg-tertiary);
  border-radius: var(--radius-md);
  margin-bottom: 8px;
  overflow: hidden;
  border: 1px solid var(--border-color);
  transition: all var(--transition-fast);
}

.step-block.step-expanded {
  border-color: var(--accent-color);
}

.step-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  cursor: pointer;
  user-select: none;
  transition: background var(--transition-fast);
}

.step-header:hover {
  background: var(--bg-hover);
}

.step-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--bg-hover);
  flex-shrink: 0;
}

.step-block.step-completed .step-icon {
  background: var(--success-color);
  color: white;
}

.step-title {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
}

.step-label {
  font-weight: 500;
  font-size: 14px;
}

.step-summary {
  font-size: 13px;
  color: var(--text-secondary);
}

.step-chevron {
  color: var(--text-tertiary);
  transition: transform var(--transition-fast);
}

.step-block.step-expanded .step-chevron {
  transform: rotate(180deg);
}

.step-content {
  padding: 0 16px 16px;
  border-top: 1px solid var(--border-color);
}

/* 思考块 */
.thinking-block {
  margin-top: 12px;
  padding: 12px;
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  border-left: 3px solid var(--warning-color);
}

.thinking-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--warning-color);
  margin-bottom: 8px;
  font-weight: 500;
}

.thinking-text {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.6;
  white-space: pre-wrap;
}

/* 工具块 */
.tool-block {
  margin-top: 12px;
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  padding: 12px;
  border-left: 3px solid var(--accent-color);
}

.tool-block.success {
  border-left-color: var(--success-color);
}

.tool-block.error {
  border-left-color: var(--error-color);
}

.tool-block.pending,
.tool-block.executing {
  border-left-color: var(--warning-color);
}

.tool-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.tool-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background: var(--bg-hover);
  border-radius: var(--radius-sm);
  flex-shrink: 0;
}

.tool-block.success .tool-icon {
  background: rgba(34, 197, 94, 0.1);
  color: var(--success-color);
}

.tool-block.error .tool-icon {
  background: rgba(239, 68, 68, 0.1);
  color: var(--error-color);
}

.tool-name {
  font-weight: 500;
  font-size: 14px;
  flex: 1;
}

.tool-status-text {
  font-size: 12px;
  color: var(--text-secondary);
}

.success-text {
  color: var(--success-color);
}

.error-text {
  color: var(--error-color);
}

.tool-details {
  margin-top: 8px;
}

.tool-details summary {
  cursor: pointer;
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 4px;
  user-select: none;
}

.tool-details summary:hover {
  color: var(--text-primary);
}

.tool-json {
  background: var(--bg-primary);
  border-radius: var(--radius-sm);
  padding: 10px;
  font-size: 12px;
  overflow-x: auto;
  margin: 0;
  color: var(--text-secondary);
  max-height: 200px;
  overflow-y: auto;
}

/* 思考状态 */
.thinking-status {
  margin-bottom: 24px;
}

.thinking-indicator {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  color: var(--text-secondary);
  font-size: 14px;
}

.thinking-dot {
  width: 8px;
  height: 8px;
  background: var(--accent-color);
  border-radius: 50%;
  animation: thinkingPulse 1.2s ease-in-out infinite;
}

.thinking-text {
  animation: thinkingFade 1.2s ease-in-out infinite;
}

@keyframes thinkingPulse {
  0%, 100% {
    transform: scale(0.8);
    opacity: 0.5;
  }
  50% {
    transform: scale(1.2);
    opacity: 1;
  }
}

@keyframes thinkingFade {
  0%, 100% {
    opacity: 0.6;
  }
  50% {
    opacity: 1;
  }
}

/* 旋转动画 */
.spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 工具选择器 */
.tools-selector {
  max-width: var(--max-chat-width);
  margin: 0 auto 12px;
  padding: 0 20px;
}

.tools-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background var(--transition-fast);
  user-select: none;
}

.tools-header:hover {
  background: var(--bg-hover);
}

.tools-icon {
  color: var(--accent-color);
  display: flex;
  align-items: center;
}

.tools-label {
  flex: 1;
  font-size: 13px;
  color: var(--text-secondary);
}

.tools-chevron {
  color: var(--text-tertiary);
  transition: transform var(--transition-fast);
  display: flex;
  align-items: center;
}

.tools-chevron.expanded {
  transform: rotate(180deg);
}

.tools-panel {
  margin-top: 8px;
  padding: 12px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
}

.tools-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border-color);
}

.btn-link {
  background: none;
  border: none;
  color: var(--accent-color);
  font-size: 13px;
  cursor: pointer;
  padding: 0;
}

.btn-link:hover {
  text-decoration: underline;
}

.tools-actions .divider {
  color: var(--text-tertiary);
}

.tools-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 200px;
  overflow-y: auto;
}

.tool-checkbox {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background var(--transition-fast);
}

.tool-checkbox:hover {
  background: var(--bg-hover);
}

.tool-checkbox.checked {
  background: var(--accent-color-light);
}

.tool-checkbox input[type="checkbox"] {
  margin-top: 2px;
  accent-color: var(--accent-color);
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.tool-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}

.tool-info .tool-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
}

.tool-info .tool-desc {
  font-size: 12px;
  color: var(--text-tertiary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 输入区域 */
.input-area {
  padding: 16px 20px 24px;
  background: linear-gradient(transparent, var(--bg-primary) 20%);
}

.input-wrapper {
  max-width: var(--max-chat-width);
  margin: 0 auto;
  display: flex;
  align-items: flex-end;
  gap: 12px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 24px;
  padding: 8px 8px 8px 20px;
  transition: border-color var(--transition-fast);
}

.input-wrapper:focus-within {
  border-color: var(--accent-color);
}

.message-input {
  flex: 1;
  background: none;
  border: none;
  outline: none;
  resize: none;
  font-size: 15px;
  line-height: 1.5;
  color: var(--text-primary);
  padding: 8px 0;
  max-height: 200px;
}

.message-input::placeholder {
  color: var(--text-placeholder);
}

.send-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: var(--accent-color);
  border: none;
  border-radius: 50%;
  color: white;
  cursor: pointer;
  transition: all var(--transition-fast);
  flex-shrink: 0;
}

.send-btn:hover:not(:disabled) {
  background: var(--accent-hover);
}

.send-btn:disabled {
  background: var(--bg-hover);
  color: var(--text-tertiary);
  cursor: not-allowed;
}

.input-hint {
  max-width: var(--max-chat-width);
  margin: 8px auto 0;
  text-align: center;
  font-size: 12px;
  color: var(--text-tertiary);
}

.input-hint .error {
  color: var(--error-color);
}

.input-hint .warning {
  color: var(--warning-color);
}
</style>
