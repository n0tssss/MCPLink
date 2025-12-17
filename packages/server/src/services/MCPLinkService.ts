import { MCPLink, type MCPServerConfig, type MCPLinkEvent } from '@mcplink/core'
import { createOpenAI } from '@ai-sdk/openai'
import type { LanguageModel } from 'ai'
import { configService } from './ConfigService.js'
import type { ModelConfig, MCPServerConfigWithId } from '../types.js'

/**
 * MCPLink 服务
 * 管理 MCPLink 实例，提供对话能力
 */
export class MCPLinkService {
  private mcpLink: MCPLink | null = null
  private currentModelId: string | null = null

  /**
   * 根据模型配置创建 LanguageModel
   * 统一使用 OpenAI 兼容接口，通过 baseURL 支持各种代理
   */
  private createModel(config: ModelConfig): LanguageModel {
    const provider = createOpenAI({
      baseURL: config.baseURL,
      apiKey: config.apiKey,
    })
    return provider(config.model)
  }

  /**
   * 将配置转换为 MCPServerConfig
   */
  private convertMCPServerConfig(config: MCPServerConfigWithId): MCPServerConfig {
    if (config.type === 'sse') {
      return {
        type: 'sse',
        url: config.url!,
        headers: config.headers,
      }
    } else {
      return {
        type: 'stdio',
        command: config.command!,
        args: config.args,
        env: config.env,
      }
    }
  }

  /**
   * 初始化 MCPLink 实例
   */
  async initialize(modelId?: string): Promise<void> {
    // 获取模型配置
    const models = await configService.getModels()
    const enabledModels = models.filter(m => m.enabled)
    
    if (enabledModels.length === 0) {
      throw new Error('No enabled models found')
    }

    // 选择模型
    let modelConfig: ModelConfig
    if (modelId) {
      const found = enabledModels.find(m => m.id === modelId)
      if (!found) {
        throw new Error(`Model "${modelId}" not found or not enabled`)
      }
      modelConfig = found
    } else {
      const settings = await configService.getSettings()
      const defaultModel = enabledModels.find(m => m.id === settings.defaultModelId)
      modelConfig = defaultModel || enabledModels[0]
    }

    // 获取 MCP 服务器配置
    const mcpServers = await configService.getMCPServers()
    const enabledServers = mcpServers.filter(s => s.enabled)

    // 获取系统设置
    const settings = await configService.getSettings()

    // 创建 MCPLink 实例
    const model = this.createModel(modelConfig)
    
    const mcpServerConfigs: Record<string, MCPServerConfig> = {}
    for (const server of enabledServers) {
      mcpServerConfigs[server.id] = this.convertMCPServerConfig(server)
    }

    // 关闭旧实例
    if (this.mcpLink) {
      await this.mcpLink.close()
    }

    this.mcpLink = new MCPLink({
      model,
      mcpServers: mcpServerConfigs,
      systemPrompt: settings.systemPrompt,
      maxIterations: settings.maxIterations,
    })

    this.currentModelId = modelConfig.id

    // 初始化连接
    await this.mcpLink.initialize()
  }

  /**
   * 确保已初始化
   */
  private async ensureInitialized(): Promise<MCPLink> {
    if (!this.mcpLink) {
      await this.initialize()
    }
    return this.mcpLink!
  }

  /**
   * 发起对话（流式）
   * @param message 用户消息
   * @param modelId 模型 ID
   * @param options 可选参数
   * @param options.tools 允许使用的工具名称列表
   */
  async *chat(message: string, modelId?: string, options?: { tools?: string[] }): AsyncGenerator<MCPLinkEvent> {
    // 如果指定了不同的模型，重新初始化
    if (modelId && modelId !== this.currentModelId) {
      await this.initialize(modelId)
    }

    const mcpLink = await this.ensureInitialized()
    yield* mcpLink.chatStream(message, { allowedTools: options?.tools })
  }

  /**
   * 获取所有可用工具
   */
  async getTools() {
    const mcpLink = await this.ensureInitialized()
    return mcpLink.getTools()
  }

  /**
   * 获取 MCP 服务器状态
   */
  async getMCPServerStatuses() {
    const mcpLink = await this.ensureInitialized()
    return mcpLink.getMCPServerStatuses()
  }

  /**
   * 启动 MCP 服务器
   */
  async startMCPServer(id: string) {
    const mcpLink = await this.ensureInitialized()
    await mcpLink.startMCPServer(id)
  }

  /**
   * 停止 MCP 服务器
   */
  async stopMCPServer(id: string) {
    const mcpLink = await this.ensureInitialized()
    await mcpLink.stopMCPServer(id)
  }

  /**
   * 重新初始化（配置变更后调用）
   */
  async reinitialize(): Promise<void> {
    await this.initialize(this.currentModelId || undefined)
  }

  /**
   * 关闭
   */
  async close(): Promise<void> {
    if (this.mcpLink) {
      await this.mcpLink.close()
      this.mcpLink = null
    }
  }
}

// 单例
export const mcpLinkService = new MCPLinkService()
