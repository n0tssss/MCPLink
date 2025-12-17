import { generateText, streamText, type LanguageModel, type CoreMessage, type CoreTool } from 'ai'
import { z } from 'zod'
import type { MCPManager } from './MCPManager.js'
import {
  MCPLinkEventType,
  type MCPTool,
  type ChatCallbacks,
  type ChatResult,
  type MCPLinkEvent,
  type ToolResult,
} from './types.js'

/** 默认系统提示词 */
const DEFAULT_SYSTEM_PROMPT = `你是一个智能助手，可以通过调用工具来帮助用户完成任务。

## 工作方式

1. **理解任务**：仔细分析用户的需求，理解他们想要达成的目标
2. **规划步骤**：将复杂任务拆解为可执行的步骤
3. **逐步执行**：每次选择最合适的工具，执行一个步骤
4. **检查结果**：分析工具返回的结果，判断是否成功
5. **继续或完成**：如果还有未完成的步骤，继续执行；否则总结结果回复用户

## 注意事项

- 每次只调用必要的工具，不要过度调用
- 如果工具调用失败，分析原因并尝试其他方案
- 如果无法完成任务，诚实告知用户原因
- 完成所有步骤后，用清晰的语言总结执行结果`

/**
 * Agent 引擎
 * 负责执行 AI 对话循环，处理工具调用
 */
export class Agent {
  private model: LanguageModel
  private mcpManager: MCPManager
  private systemPrompt: string
  private maxIterations: number

  constructor(
    model: LanguageModel,
    mcpManager: MCPManager,
    options: {
      systemPrompt?: string
      maxIterations?: number
    } = {}
  ) {
    this.model = model
    this.mcpManager = mcpManager
    this.systemPrompt = options.systemPrompt || DEFAULT_SYSTEM_PROMPT
    this.maxIterations = options.maxIterations || 10
  }

  /**
   * 将 MCP 工具转换为 Vercel AI SDK 格式
   */
  private convertMCPToolsToAITools(mcpTools: MCPTool[]): Record<string, CoreTool> {
    const tools: Record<string, CoreTool> = {}

    for (const mcpTool of mcpTools) {
      // 将 JSON Schema 转换为 Zod Schema
      const zodSchema = this.jsonSchemaToZod(mcpTool.inputSchema)

      tools[mcpTool.name] = {
        description: mcpTool.description,
        parameters: zodSchema,
      }
    }

    return tools
  }

  /**
   * 简单的 JSON Schema 到 Zod 转换
   */
  private jsonSchemaToZod(schema: MCPTool['inputSchema']): z.ZodType {
    if (!schema.properties) {
      return z.object({})
    }

    const shape: Record<string, z.ZodType> = {}
    const required = schema.required || []

    for (const [key, prop] of Object.entries(schema.properties)) {
      const propSchema = prop as { type?: string; description?: string; items?: { type?: string } }
      let zodType: z.ZodType

      switch (propSchema.type) {
        case 'string':
          zodType = z.string()
          break
        case 'number':
          zodType = z.number()
          break
        case 'integer':
          zodType = z.number().int()
          break
        case 'boolean':
          zodType = z.boolean()
          break
        case 'array':
          if (propSchema.items?.type === 'string') {
            zodType = z.array(z.string())
          } else if (propSchema.items?.type === 'number') {
            zodType = z.array(z.number())
          } else {
            zodType = z.array(z.unknown())
          }
          break
        default:
          zodType = z.unknown()
      }

      if (propSchema.description) {
        zodType = zodType.describe(propSchema.description)
      }

      if (!required.includes(key)) {
        zodType = zodType.optional()
      }

      shape[key] = zodType
    }

    return z.object(shape)
  }

  /**
   * 执行对话
   */
  async chat(userMessage: string, callbacks?: ChatCallbacks): Promise<ChatResult> {
    const startTime = Date.now()
    const toolCallRecords: ChatResult['toolCalls'] = []
    let totalPromptTokens = 0
    let totalCompletionTokens = 0

    // 构建消息历史
    const messages: CoreMessage[] = [
      { role: 'system', content: this.systemPrompt },
      { role: 'user', content: userMessage },
    ]

    // 获取所有可用工具
    const mcpTools = this.mcpManager.getAllTools()
    const tools = this.convertMCPToolsToAITools(mcpTools)

    let iteration = 0
    let finalContent = ''

    while (iteration < this.maxIterations) {
      iteration++
      callbacks?.onIterationStart?.(iteration)

      // 调用 AI
      const response = await generateText({
        model: this.model,
        messages,
        tools: Object.keys(tools).length > 0 ? tools : undefined,
        maxSteps: 1, // 每次只执行一步，方便我们控制流程
      })

      // 累计 token 使用
      if (response.usage) {
        totalPromptTokens += response.usage.promptTokens
        totalCompletionTokens += response.usage.completionTokens
      }

      // 检查是否有工具调用
      const toolCalls = response.toolCalls || []
      
      if (toolCalls.length === 0) {
        // 没有工具调用，说明 AI 完成了任务
        finalContent = response.text || ''
        callbacks?.onTextDelta?.(finalContent)
        callbacks?.onIterationEnd?.(iteration)
        break
      }

      // 有工具调用，处理它们
      const toolResults: ToolResult[] = []

      for (const toolCall of toolCalls) {
        const toolName = toolCall.toolName
        const toolArgs = toolCall.args as Record<string, unknown>
        const toolCallId = toolCall.toolCallId

        callbacks?.onToolCallStart?.(toolName, toolArgs)

        const toolStartTime = Date.now()
        let result: unknown
        let isError = false

        try {
          result = await this.mcpManager.callTool(toolName, toolArgs)
        } catch (error) {
          result = error instanceof Error ? error.message : String(error)
          isError = true
        }

        const duration = Date.now() - toolStartTime

        callbacks?.onToolResult?.(toolName, result, duration)

        toolResults.push({
          toolCallId,
          toolName,
          result,
          isError,
          duration,
        })

        toolCallRecords.push({
          name: toolName,
          arguments: toolArgs,
          result,
          duration,
        })
      }

      // 将 AI 的回复和工具调用添加到消息历史
      messages.push({
        role: 'assistant' as const,
        content: [
          { type: 'text' as const, text: response.text || '' },
          ...toolCalls.map(tc => ({
            type: 'tool-call' as const,
            toolCallId: tc.toolCallId,
            toolName: tc.toolName,
            args: tc.args as Record<string, unknown>,
          })),
        ],
      })

      // 将工具结果添加到消息历史
      for (const tr of toolResults) {
        messages.push({
          role: 'tool' as const,
          content: [
            {
              type: 'tool-result' as const,
              toolCallId: tr.toolCallId,
              toolName: tr.toolName,
              result: tr.result,
            },
          ],
        })
      }

      callbacks?.onIterationEnd?.(iteration)
    }

    const duration = Date.now() - startTime

    return {
      content: finalContent,
      toolCalls: toolCallRecords,
      messages: messages.map(m => ({
        role: m.role as 'system' | 'user' | 'assistant' | 'tool',
        content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
      })),
      usage: {
        promptTokens: totalPromptTokens,
        completionTokens: totalCompletionTokens,
        totalTokens: totalPromptTokens + totalCompletionTokens,
      },
      iterations: iteration,
      duration,
    }
  }

  /**
   * 流式对话 - 返回事件生成器
   * @param userMessage 用户消息
   * @param options 可选参数
   * @param options.allowedTools 允许使用的工具名称列表，为空或不传则使用所有工具
   */
  async *chatStream(userMessage: string, options?: { allowedTools?: string[] }): AsyncGenerator<MCPLinkEvent> {
    const startTime = Date.now()
    const toolCallRecords: ChatResult['toolCalls'] = []

    // 构建消息历史
    const messages: CoreMessage[] = [
      { role: 'system', content: this.systemPrompt },
      { role: 'user', content: userMessage },
    ]

    // 获取所有可用工具
    let mcpTools = this.mcpManager.getAllTools()
    
    // 如果指定了允许的工具列表，则进行过滤
    if (options?.allowedTools && options.allowedTools.length > 0) {
      mcpTools = mcpTools.filter(tool => options.allowedTools!.includes(tool.name))
    }
    
    const tools = this.convertMCPToolsToAITools(mcpTools)
    const hasTools = Object.keys(tools).length > 0

    let iteration = 0

    while (iteration < this.maxIterations) {
      iteration++
      
      yield {
        type: MCPLinkEventType.ITERATION_START,
        timestamp: Date.now(),
        data: { iteration, maxIterations: this.maxIterations },
      }

      // 使用 streamText 进行流式调用
      const stream = streamText({
        model: this.model,
        messages,
        tools: hasTools ? tools : undefined,
        maxSteps: 1,
      })

      // 收集流式结果
      let fullText = ''
      const toolCalls: Array<{
        toolCallId: string
        toolName: string
        args: Record<string, unknown>
      }> = []
      let currentToolCall: {
        toolCallId: string
        toolName: string
        argsText: string
      } | null = null
      let hasStartedText = false

      // 已发送 TOOL_CALL_START 的工具 ID 集合
      const sentToolCallStarts = new Set<string>()

      // 流式处理
      for await (const chunk of stream.fullStream) {
        switch (chunk.type) {
          case 'text-delta':
            // 流式输出文本
            if (!hasStartedText) {
              hasStartedText = true
              yield {
                type: MCPLinkEventType.TEXT_START,
                timestamp: Date.now(),
                data: {},
              }
            }
            fullText += chunk.textDelta
            yield {
              type: MCPLinkEventType.TEXT_DELTA,
              timestamp: Date.now(),
              data: { content: chunk.textDelta },
            }
            break

          case 'tool-call':
            // 非流式工具调用（大多数模型使用这种方式）
            // 直接发送完整的工具调用信息
            if (!sentToolCallStarts.has(chunk.toolCallId)) {
              yield {
                type: MCPLinkEventType.TOOL_CALL_START,
                timestamp: Date.now(),
                data: { 
                  toolName: chunk.toolName, 
                  toolCallId: chunk.toolCallId,
                  toolArgs: chunk.args as Record<string, unknown>,
                },
              }
              sentToolCallStarts.add(chunk.toolCallId)
            }
            toolCalls.push({
              toolCallId: chunk.toolCallId,
              toolName: chunk.toolName,
              args: chunk.args as Record<string, unknown>,
            })
            break

          case 'tool-call-streaming-start':
            // 流式工具调用开始（部分模型支持）
            currentToolCall = {
              toolCallId: chunk.toolCallId,
              toolName: chunk.toolName,
              argsText: '',
            }
            if (!sentToolCallStarts.has(chunk.toolCallId)) {
              yield {
                type: MCPLinkEventType.TOOL_CALL_START,
                timestamp: Date.now(),
                data: { 
                  toolName: chunk.toolName, 
                  toolCallId: chunk.toolCallId,
                },
              }
              sentToolCallStarts.add(chunk.toolCallId)
            }
            break

          case 'tool-call-delta':
            // 流式工具参数
            if (currentToolCall) {
              currentToolCall.argsText += chunk.argsTextDelta
              yield {
                type: MCPLinkEventType.TOOL_CALL_DELTA,
                timestamp: Date.now(),
                data: { 
                  toolCallId: currentToolCall.toolCallId,
                  argsTextDelta: chunk.argsTextDelta,
                },
              }
            }
            break

          case 'finish':
            // 本轮生成结束
            if (hasStartedText) {
              yield {
                type: MCPLinkEventType.TEXT_END,
                timestamp: Date.now(),
                data: {},
              }
            }
            break

          case 'error':
            yield {
              type: MCPLinkEventType.ERROR,
              timestamp: Date.now(),
              data: { error: chunk.error as Error },
            }
            break
        }
      }

      // 检查是否有工具调用
      if (toolCalls.length === 0) {
        // 没有工具调用，结束迭代
        yield {
          type: MCPLinkEventType.ITERATION_END,
          timestamp: Date.now(),
          data: { iteration },
        }
        break
      }

      // 如果有思考文本，标记为思考过程
      if (fullText) {
        yield {
          type: MCPLinkEventType.THINKING_CONTENT,
          timestamp: Date.now(),
          data: { content: fullText },
        }
      }

      // 执行工具调用
      const toolResults: ToolResult[] = []

      for (const toolCall of toolCalls) {
        const toolName = toolCall.toolName
        const toolArgs = toolCall.args
        const toolCallId = toolCall.toolCallId

        // 发送执行中状态
        yield {
          type: MCPLinkEventType.TOOL_EXECUTING,
          timestamp: Date.now(),
          data: { toolName, toolCallId, toolArgs },
        }

        // 执行工具
        const toolStartTime = Date.now()
        let result: unknown
        let isError = false

        try {
          result = await this.mcpManager.callTool(toolName, toolArgs)
        } catch (error) {
          result = error instanceof Error ? error.message : String(error)
          isError = true
        }

        const duration = Date.now() - toolStartTime

        // 发送结果
        yield {
          type: MCPLinkEventType.TOOL_RESULT,
          timestamp: Date.now(),
          data: { 
            toolName, 
            toolResult: result, 
            toolCallId, 
            duration,
            isError,
          },
        }

        toolResults.push({
          toolCallId,
          toolName,
          result,
          isError,
          duration,
        })

        toolCallRecords.push({
          name: toolName,
          arguments: toolArgs,
          result,
          duration,
        })
      }

      // 更新消息历史
      messages.push({
        role: 'assistant' as const,
        content: [
          ...(fullText ? [{ type: 'text' as const, text: fullText }] : []),
          ...toolCalls.map(tc => ({
            type: 'tool-call' as const,
            toolCallId: tc.toolCallId,
            toolName: tc.toolName,
            args: tc.args,
          })),
        ],
      })

      for (const tr of toolResults) {
        messages.push({
          role: 'tool' as const,
          content: [
            {
              type: 'tool-result' as const,
              toolCallId: tr.toolCallId,
              toolName: tr.toolName,
              result: tr.result,
            },
          ],
        })
      }

      yield {
        type: MCPLinkEventType.ITERATION_END,
        timestamp: Date.now(),
        data: { iteration },
      }
    }

    const totalDuration = Date.now() - startTime

    yield {
      type: MCPLinkEventType.COMPLETE,
      timestamp: Date.now(),
      data: {
        totalIterations: iteration,
        totalDuration,
      },
    }
  }
}

