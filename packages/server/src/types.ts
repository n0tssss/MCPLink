import type { MCPServerConfig } from '@mcplink/core'

/** 模型配置（简化版 - 统一使用代理 URL） */
export interface ModelConfig {
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

/** MCP 服务器配置（带 ID） */
export interface MCPServerConfigWithId {
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
}

/** 系统配置 */
export interface SystemConfig {
  defaultModelId?: string
  systemPrompt?: string
  maxIterations?: number
}

/** 工具调用记录 */
export interface ToolCallRecord {
  name: string
  arguments: Record<string, unknown>
  result: unknown
  duration: number
  status: 'pending' | 'executing' | 'success' | 'error'
}

/** 会话 */
export interface Conversation {
  id: string
  title: string
  modelId: string
  messages: Array<{
    role: 'user' | 'assistant'
    content: string
    timestamp: number
    toolCalls?: Array<{
      name: string
      arguments: Record<string, unknown>
      result: unknown
      duration: number
    }>
  }>
  createdAt: number
  updatedAt: number
}

/** 配置文件结构 */
export interface ConfigFiles {
  models: { models: ModelConfig[] }
  mcpServers: { servers: MCPServerConfigWithId[] }
  settings: SystemConfig
  conversations: { conversations: Conversation[] }
}
