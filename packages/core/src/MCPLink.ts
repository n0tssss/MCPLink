import type { LanguageModel } from 'ai'
import { MCPManager } from './MCPManager.js'
import { Agent } from './Agent.js'
import type {
  MCPLinkConfig,
  MCPServerConfig,
  ChatCallbacks,
  ChatResult,
  MCPLinkEvent,
  MCPTool,
  MCPServerStatus,
} from './types.js'

/**
 * MCPLink 主类
 * AI Agent 工具调用框架的入口
 */
export class MCPLink {
  private model: LanguageModel
  private mcpManager: MCPManager
  private agent: Agent
  private config: MCPLinkConfig
  private initialized = false

  constructor(config: MCPLinkConfig) {
    this.config = config
    this.model = config.model
    this.mcpManager = new MCPManager()

    // 添加配置的 MCP 服务器
    if (config.mcpServers) {
      for (const [id, serverConfig] of Object.entries(config.mcpServers)) {
        this.mcpManager.addServer(id, serverConfig)
      }
    }

    // 创建 Agent
    this.agent = new Agent(this.model, this.mcpManager, {
      systemPrompt: config.systemPrompt,
      maxIterations: config.maxIterations,
    })
  }

  /**
   * 初始化 - 连接所有 MCP 服务器
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return
    }

    await this.mcpManager.startAll()
    this.initialized = true
  }

  /**
   * 关闭 - 断开所有 MCP 服务器连接
   */
  async close(): Promise<void> {
    await this.mcpManager.stopAll()
    this.initialized = false
  }

  /**
   * 发起对话
   */
  async chat(message: string, callbacks?: ChatCallbacks): Promise<ChatResult> {
    if (!this.initialized) {
      await this.initialize()
    }

    return this.agent.chat(message, callbacks)
  }

  /**
   * 流式对话
   * @param message 用户消息
   * @param options 可选参数
   * @param options.allowedTools 允许使用的工具名称列表
   */
  async *chatStream(message: string, options?: { allowedTools?: string[] }): AsyncGenerator<MCPLinkEvent> {
    if (!this.initialized) {
      await this.initialize()
    }

    yield* this.agent.chatStream(message, options)
  }

  // ============ MCP 服务器管理 ============

  /**
   * 添加 MCP 服务器
   */
  addMCPServer(id: string, config: MCPServerConfig): void {
    this.mcpManager.addServer(id, config)
  }

  /**
   * 移除 MCP 服务器
   */
  async removeMCPServer(id: string): Promise<void> {
    await this.mcpManager.removeServer(id)
  }

  /**
   * 启动指定 MCP 服务器
   */
  async startMCPServer(id: string): Promise<void> {
    await this.mcpManager.startServer(id)
  }

  /**
   * 停止指定 MCP 服务器
   */
  async stopMCPServer(id: string): Promise<void> {
    await this.mcpManager.stopServer(id)
  }

  /**
   * 获取所有 MCP 服务器状态
   */
  getMCPServerStatuses(): MCPServerStatus[] {
    return this.mcpManager.getServerStatuses()
  }

  /**
   * 获取所有可用工具
   */
  getTools(): MCPTool[] {
    return this.mcpManager.getAllTools()
  }

  /**
   * 手动调用工具
   */
  async callTool(toolName: string, args: Record<string, unknown>): Promise<unknown> {
    return this.mcpManager.callTool(toolName, args)
  }

  // ============ 配置管理 ============

  /**
   * 更新系统提示词
   */
  setSystemPrompt(prompt: string): void {
    this.config.systemPrompt = prompt
    // 重新创建 Agent
    this.agent = new Agent(this.model, this.mcpManager, {
      systemPrompt: prompt,
      maxIterations: this.config.maxIterations,
    })
  }

  /**
   * 更新 AI 模型
   */
  setModel(model: LanguageModel): void {
    this.model = model
    this.config.model = model
    // 重新创建 Agent
    this.agent = new Agent(this.model, this.mcpManager, {
      systemPrompt: this.config.systemPrompt,
      maxIterations: this.config.maxIterations,
    })
  }
}

