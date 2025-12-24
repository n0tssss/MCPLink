# @n0ts123/mcplink-core

MCPLink 核心 SDK - AI Agent 工具调用框架，让 AI 轻松调用 MCP 工具。

[![npm version](https://img.shields.io/npm/v/@n0ts123/mcplink-core.svg)](https://www.npmjs.com/package/@n0ts123/mcplink-core)
[![license](https://img.shields.io/npm/l/@n0ts123/mcplink-core.svg)](https://github.com/N0ts/MCPLink/blob/main/LICENSE)

## 特性

- 🚀 **简单易用** - 几行代码即可让 AI 调用 MCP 工具
- 🔄 **流式响应** - 支持实时流式输出，体验更流畅
- 🤖 **多模型支持** - OpenAI、Claude、Gemini、DeepSeek、Qwen 等
- 🛠️ **MCP 协议** - 完整支持 stdio 和 SSE 两种连接方式
- 📦 **TypeScript & JavaScript** - 同时支持 TS 和 JS 项目
- 🎯 **即时结果** - 支持工具返回特定格式时立即推送前端（如卡片消息）

## 安装

```bash
# npm
npm install @n0ts123/mcplink-core

# pnpm
pnpm add @n0ts123/mcplink-core

# yarn
yarn add @n0ts123/mcplink-core
```

> 💡 **内置 AI SDK**：本包已内置 `@ai-sdk/openai` 和 `@ai-sdk/anthropic`，无需额外安装即可直接使用。
>
> 如需使用 Google Gemini，需额外安装：`npm install @ai-sdk/google`

## 快速开始

### TypeScript / JavaScript (ESM) 示例

```typescript
import { MCPLink, createOpenAI } from '@n0ts123/mcplink-core'

// 创建模型（支持 OpenAI 兼容的 API）
const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: 'https://api.openai.com/v1',  // 可选，默认 OpenAI 官方
})

// 创建 Agent
const agent = new MCPLink({
  model: openai('gpt-4o'),
  mcpServers: {
    myTools: {
      type: 'stdio',
      command: 'node',
      args: ['./my-mcp-server.js'],
    },
  },
})

// 初始化并对话
await agent.initialize()
const result = await agent.chat('你好')
console.log(result.content)
await agent.close()
```

### JavaScript (CommonJS) 示例

> ⚠️ 注意：本包是 ES Module，在 CommonJS 环境中需要使用动态 import

```javascript
async function main() {
  const { MCPLink, createOpenAI } = await import('@n0ts123/mcplink-core')

  const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY })

  const agent = new MCPLink({
    model: openai('gpt-4o'),
    mcpServers: {
      myTools: {
        type: 'stdio',
        command: 'node',
        args: ['./my-mcp-server.js'],
      },
    },
  })

  await agent.initialize()
  const result = await agent.chat('你好')
  console.log(result.content)
  await agent.close()
}

main()
```

### 流式响应

```typescript
import { MCPLink, MCPLinkEventType, createOpenAI } from '@n0ts123/mcplink-core'

const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY })

const agent = new MCPLink({
  model: openai('gpt-4o'),
  systemPrompt: '你是一个智能助手',
  maxIterations: 10,
  mcpServers: { /* ... */ },
})

await agent.initialize()

// 流式处理
for await (const event of agent.chatStream('帮我查询订单')) {
  switch (event.type) {
    case MCPLinkEventType.THINKING_START:
      console.log('💭 思考中...')
      break
      
    case MCPLinkEventType.THINKING_DELTA:
      process.stdout.write(event.data.content || '')
      break
      
    case MCPLinkEventType.THINKING_END:
      console.log('\n')
      break
      
    case MCPLinkEventType.TOOL_CALL_START:
      console.log(`🔧 调用工具: ${event.data.toolName}`)
      console.log(`   参数: ${JSON.stringify(event.data.toolArgs)}`)
      break
      
    case MCPLinkEventType.TOOL_RESULT:
      const status = event.data.isError ? '❌' : '✅'
      console.log(`${status} 结果 (${event.data.duration}ms)`)
      break
      
    case MCPLinkEventType.TEXT_START:
      console.log('📝 回复:')
      break
      
    case MCPLinkEventType.TEXT_DELTA:
      process.stdout.write(event.data.content || '')
      break
      
    case MCPLinkEventType.TEXT_END:
      console.log('\n')
      break
      
    case MCPLinkEventType.COMPLETE:
      console.log(`✅ 完成! 总耗时: ${event.data.totalDuration}ms`)
      break
      
    case MCPLinkEventType.ERROR:
      console.error(`❌ 错误: ${event.data.error}`)
      break
  }
}
```

## 配置选项

### MCPLinkConfig

```typescript
interface MCPLinkConfig {
  /**
   * AI 模型实例（必填）
   * 使用 Vercel AI SDK 创建的模型
   */
  model: LanguageModel

  /**
   * 模型名称
   * 用于自动检测是否支持原生 function calling
   * 如果不提供，会尝试从 model.modelId 获取
   */
  modelName?: string

  /**
   * 系统提示词
   * 定义 AI 的角色和行为
   */
  systemPrompt?: string

  /**
   * 最大迭代次数
   * 防止无限循环，默认 10
   */
  maxIterations?: number

  /**
   * MCP 服务器配置
   * key 是服务器 ID，value 是服务器配置
   */
  mcpServers?: Record<string, MCPServerConfig>

  /**
   * 是否强制使用 Prompt-Based 模式
   * - true: 强制使用 PromptBasedAgent
   * - false: 强制使用原生 Agent
   * - 'auto' | undefined: 自动检测
   */
  usePromptBasedTools?: boolean | 'auto'

  /**
   * 是否并行执行工具调用
   * 当 AI 一次返回多个工具调用时（如同时搜索多个产品），是否并行执行
   * - true: 并行执行（默认，更快）
   * - false: 串行执行（按顺序一个一个执行）
   */
  parallelToolCalls?: boolean

  /**
   * 即时结果匹配器
   * 当 MCP 工具返回的结果匹配任意一个匹配器时，会立即发送 IMMEDIATE_RESULT 事件
   * 适用于卡片消息、产品列表等需要立即展示给用户的特殊格式数据
   */
  immediateResultMatchers?: Array<Record<string, unknown>>
}
```

### MCP 服务器配置

```typescript
// Stdio 模式（本地进程）
interface MCPServerConfigStdio {
  type: 'stdio'
  command: string      // 启动命令
  args?: string[]      // 命令参数
  env?: Record<string, string>  // 环境变量
}

// SSE 模式（远程服务）
interface MCPServerConfigSSE {
  type: 'sse'
  url: string          // SSE 端点 URL
  headers?: Record<string, string>  // 请求头
}
```

## 多模型支持

### OpenAI

```typescript
import { MCPLink, createOpenAI } from '@n0ts123/mcplink-core'

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

const agent = new MCPLink({
  model: openai('gpt-4o'),  // 或 gpt-4o-mini, gpt-3.5-turbo
})
```

### Anthropic Claude

```typescript
import { MCPLink, createAnthropic } from '@n0ts123/mcplink-core'

const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const agent = new MCPLink({
  model: anthropic('claude-3-5-sonnet-20241022'),
})
```

### Google Gemini

> 需额外安装：`npm install @ai-sdk/google`

```typescript
import { MCPLink } from '@n0ts123/mcplink-core'
import { createGoogleGenerativeAI } from '@ai-sdk/google'

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_API_KEY,
})

const agent = new MCPLink({
  model: google('gemini-1.5-flash'),  // 或 gemini-1.5-pro
})
```

### 兼容 OpenAI 的模型

DeepSeek、Qwen、GLM 等兼容 OpenAI 格式的模型，使用 `createOpenAI` 配置 `baseURL` 即可：

```typescript
import { MCPLink, createOpenAI } from '@n0ts123/mcplink-core'

// DeepSeek
const deepseek = createOpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com/v1',
})

const agent = new MCPLink({
  model: deepseek('deepseek-chat'),
})

// 通义千问
const qwen = createOpenAI({
  apiKey: process.env.QWEN_API_KEY,
  baseURL: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
})

const agent = new MCPLink({
  model: qwen('qwen-turbo'),
})
```

## 多轮对话

```typescript
// 方式一：手动管理历史
const history: Array<{ role: 'user' | 'assistant'; content: string }> = []

// 第一轮
let response = ''
for await (const event of agent.chatStream('帮我查订单')) {
  if (event.type === MCPLinkEventType.TEXT_DELTA) {
    response += event.data.content || ''
  }
}
history.push({ role: 'user', content: '帮我查订单' })
history.push({ role: 'assistant', content: response })

// 第二轮（携带历史）
for await (const event of agent.chatStream('第一个订单的详情', { history })) {
  // ...
}
```

## 工具过滤

```typescript
// 只允许使用特定工具
for await (const event of agent.chatStream('搜索产品', {
  allowedTools: ['search_products', 'get_product_details'],
})) {
  // 只会调用 search_products 和 get_product_details
}
```

## 即时结果（Immediate Result）

当 MCP 工具返回特定格式的数据时（如卡片、产品列表等），可以配置让结果**立即推送给前端**，无需等待 AI 完成思考。

### 使用场景

```
用户: "帮我搜索 xxx 产品"
    ↓
AI 调用 search_products 工具
    ↓
工具返回: { type: "card", data: [...] }  ← 匹配配置的格式
    ↓
【立即发送 IMMEDIATE_RESULT 事件】 → 前端展示产品卡片
    ↓
AI 继续思考，整理最终回复
```

### 配置方式

```typescript
const agent = new MCPLink({
  model: openai('gpt-4o'),
  mcpServers: { /* ... */ },
  // 配置即时结果匹配器
  immediateResultMatchers: [
    { type: 'card' },           // 匹配 { type: "card", ... }
    { type: 'product_list' },   // 匹配 { type: "product_list", ... }
    { isCard: true },           // 匹配 { isCard: true, ... }
  ],
})
```

### 匹配规则

- 工具返回结果必须是 JSON 对象
- 只要结果**包含**匹配器的所有 key 且 value 相等，就算匹配成功
- 支持配置多个匹配器，匹配任意一个即触发

```typescript
// 配置的匹配器
{ type: "card" }

// ✅ 匹配成功
{ type: "card", data: [...], message: "xxx" }

// ❌ 匹配失败（type 值不同）
{ type: "list", data: [...] }
```

### 前端处理

```typescript
for await (const event of agent.chatStream('搜索产品')) {
  switch (event.type) {
    case MCPLinkEventType.IMMEDIATE_RESULT:
      // 立即展示卡片/特殊格式数据
      const cardData = event.data.immediateResult
      showCard(cardData)
      break
      
    case MCPLinkEventType.TEXT_DELTA:
      // AI 的最终文字回复
      appendText(event.data.content)
      break
  }
}
```

## 手动工具管理

```typescript
// 获取所有可用工具
const tools = agent.getTools()
console.log(tools.map(t => t.name))

// 手动调用工具
const result = await agent.callTool('search_products', {
  keyword: 'APC6-01',
})

// 获取 MCP 服务器状态
const statuses = agent.getMCPServerStatuses()
console.log(statuses)

// 手动控制 MCP 服务器
await agent.startMCPServer('myServer')
await agent.stopMCPServer('myServer')
```

## 事件类型详解

| 事件 | 说明 | 数据 |
|------|------|------|
| `iteration_start` | 迭代开始 | `{ iteration, maxIterations }` |
| `iteration_end` | 迭代结束 | `{ iteration }` |
| `thinking_start` | 思考开始 | `{}` |
| `thinking_delta` | 思考内容 | `{ content }` |
| `thinking_end` | 思考结束 | `{}` |
| `text_start` | 文本开始 | `{}` |
| `text_delta` | 文本内容 | `{ content }` |
| `text_end` | 文本结束 | `{}` |
| `tool_call_start` | 工具调用开始 | `{ toolName, toolCallId, toolArgs }` |
| `tool_executing` | 工具执行中 | `{ toolName, toolCallId, toolArgs }` |
| `tool_result` | 工具执行结果 | `{ toolName, toolResult, toolCallId, duration, isError }` |
| `immediate_result` | 即时结果（匹配 immediateResultMatchers） | `{ toolName, toolCallId, immediateResult }` |
| `complete` | 任务完成 | `{ totalDuration, totalIterations }` |
| `error` | 发生错误 | `{ error }` |

## 高级用法

### 直接使用 Agent

如果你只需要使用特定的 Agent 实现：

```typescript
import { Agent, PromptBasedAgent, MCPManager, createOpenAI } from '@n0ts123/mcplink-core'

const openai = createOpenAI({ apiKey: '...' })
const mcpManager = new MCPManager()

// 添加 MCP 服务器
mcpManager.addServer('myTools', {
  type: 'stdio',
  command: 'node',
  args: ['./server.js'],
})

// 启动服务器
await mcpManager.startAll()

// 使用原生 Agent（适用于支持 function calling 的模型）
const nativeAgent = new Agent(openai('gpt-4o'), mcpManager, {
  systemPrompt: '你是一个智能助手',
  maxIterations: 10,
})

// 使用 Prompt-Based Agent（适用于所有模型）
const promptAgent = new PromptBasedAgent(openai('gpt-4o'), mcpManager, {
  systemPrompt: '你是一个智能助手',
  maxIterations: 10,
})

// 流式对话
for await (const event of promptAgent.chatStream('你好')) {
  console.log(event)
}

// 关闭
await mcpManager.stopAll()
```

### 自定义 MCP 管理器

```typescript
import { MCPManager } from '@n0ts123/mcplink-core'

const mcpManager = new MCPManager()

// 添加多个服务器
mcpManager.addServer('business', {
  type: 'stdio',
  command: 'node',
  args: ['./business-server.js'],
})

mcpManager.addServer('database', {
  type: 'sse',
  url: 'http://localhost:8080/mcp',
  headers: { Authorization: 'Bearer xxx' },
})

// 按需启动
await mcpManager.startServer('business')

// 获取所有工具
const tools = mcpManager.getAllTools()

// 调用工具
const result = await mcpManager.callTool('search_products', { keyword: 'test' })

// 获取状态
const statuses = mcpManager.getServerStatuses()
```

## TypeScript 类型

```typescript
import type {
  MCPLinkConfig,
  MCPServerConfig,
  MCPLinkEvent,
  MCPTool,
  MCPServerStatus,
  ChatResult,
  ImmediateResultMatcher,
} from '@n0ts123/mcplink-core'

import { MCPLinkEventType } from '@n0ts123/mcplink-core'
```

## 环境要求

- **Node.js**: >= 18.0.0
- **模块系统**: ES Module（推荐）或 CommonJS（需使用动态 import）

## 许可证

MIT

