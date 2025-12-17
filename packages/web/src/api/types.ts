/** 模型配置（简化版 - 统一使用代理 URL） */
export interface Model {
  id: string
  /** 显示名称，如 "GPT-4o" */
  name: string
  /** 模型名称，如 "gpt-4o" */
  model: string
  /** 代理地址，如 "https://api.openai.com/v1" */
  baseURL: string
  /** API Key */
  apiKey: string
  /** 是否启用 */
  enabled: boolean
}

/** MCP 服务器配置 */
export interface MCPServer {
  id: string
  name: string
  type: 'stdio' | 'sse'
  command?: string
  args?: string[]
  env?: Record<string, string>
  url?: string
  headers?: Record<string, string>
  enabled: boolean
  autoStart: boolean
  status?: 'stopped' | 'starting' | 'running' | 'error'
  tools?: MCPTool[]
}

/** MCP 工具 */
export interface MCPTool {
  name: string
  description: string
  inputSchema: {
    type: 'object'
    properties?: Record<string, unknown>
    required?: string[]
  }
}

/** 会话消息 */
export interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  toolCalls?: ToolCallRecord[]
  thinking?: string
}

/** 工具调用记录 */
export interface ToolCallRecord {
  name: string
  arguments: Record<string, unknown>
  result: unknown
  duration: number
  status?: 'pending' | 'executing' | 'success' | 'error'
}

/** 会话 */
export interface Conversation {
  id: string
  title: string
  modelId: string
  messages: Message[]
  createdAt: number
  updatedAt: number
}

/** 系统设置 */
export interface Settings {
  defaultModelId?: string
  systemPrompt?: string
  maxIterations?: number
}

/** SSE 事件类型 */
export type SSEEventType =
  | 'connected'
  | 'thinking_start'
  | 'thinking_delta'
  | 'thinking_end'
  | 'thinking_content'
  | 'text_start'
  | 'text_delta'
  | 'text_end'
  | 'tool_call_start'
  | 'tool_call_delta'
  | 'tool_call_end'
  | 'tool_executing'
  | 'tool_result'
  | 'iteration_start'
  | 'iteration_end'
  | 'complete'
  | 'error'

/** SSE 事件 */
export interface SSEEvent {
  type: SSEEventType
  data: {
    content?: string
    toolName?: string
    toolArgs?: Record<string, unknown>
    toolResult?: unknown
    toolCallId?: string
    duration?: number
    iteration?: number
    maxIterations?: number
    totalIterations?: number
    totalDuration?: number
    argsTextDelta?: string
    isError?: boolean
    error?: string
  }
}
