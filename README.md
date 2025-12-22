# MCPLink

<p align="center">
  <strong>🤖 AI Agent 工具调用框架 - 让 AI 通过自然语言操作你的业务系统</strong>
</p>

<p align="center">
  <a href="#快速开始">快速开始</a> •
  <a href="#sdk-集成">SDK 集成</a> •
  <a href="#核心功能">核心功能</a> •
  <a href="#架构设计">架构设计</a>
</p>

---

## 简介

MCPLink 是一个完整的 **AI Agent** 解决方案，支持 [MCP (Model Context Protocol)](https://modelcontextprotocol.io/) 协议，让 AI 能够：

- 🎯 **理解用户意图** - 自然语言交互，无需学习复杂操作
- 🔧 **自动调用工具** - 连接你的 MCP 服务器，执行业务操作
- 🔄 **多步任务编排** - 自动拆解复杂任务，逐步执行直到完成
- 💬 **流式响应输出** - 实时展示思考过程和执行结果

类似于 Cursor、CherryStudio 的 AI Agent 能力，但专注于**业务场景**集成。

## 典型应用场景

```
用户: "帮我搜一下 APC6-01，加 50 个到购物车，然后生成报价单"

AI Agent:
  1. 🔍 调用 search_products 搜索产品
  2. 🛒 调用 add_to_cart 添加到购物车  
  3. 📄 调用 create_quotation 生成报价单
  4. ✅ 返回结果给用户
```

## 项目结构

```
mcplink/
├── packages/
│   ├── core/      # 🎯 核心 SDK (@mcplink/core)
│   ├── server/    # 🖥️ 后端服务 (Fastify)
│   └── web/       # 🌐 前端界面 (Vue 3)
```

---

## 快速开始

### 环境要求

- Node.js >= 18
- pnpm >= 8

### 安装与启动

```bash
# 克隆项目
git clone https://github.com/your-username/mcplink.git
cd mcplink

# 安装依赖
pnpm install

# 启动开发服务
pnpm dev
```

启动后访问：
- 前端界面：http://localhost:5173
- 后端 API：http://localhost:3000

### 配置

1. 打开前端界面
2. 进入 **设置 > 模型管理**，添加你的 AI 模型（OpenAI、Gemini、Claude 等）
3. 进入 **设置 > MCP 服务器**，添加你的 MCP 工具服务器
4. 开始对话！

---

## SDK 集成

MCPLink 的核心能力封装在 `@mcplink/core` 包中，可以独立集成到你的项目。

### 安装

```bash
npm install @mcplink/core ai @ai-sdk/openai
# 或
pnpm add @mcplink/core ai @ai-sdk/openai
```

### 基础用法

```typescript
import { MCPLink } from '@mcplink/core'
import { createOpenAI } from '@ai-sdk/openai'

// 1. 创建 AI 模型
const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: 'https://api.openai.com/v1', // 或你的代理地址
})

// 2. 创建 MCPLink 实例
const agent = new MCPLink({
  model: openai('gpt-4o'),
  systemPrompt: '你是一个智能助手，帮助用户管理订单和产品。',
  maxIterations: 10,
  mcpServers: {
    // MCP 服务器配置
    business: {
      type: 'stdio',
      command: 'node',
      args: ['./my-mcp-server.js'],
    },
    // 或使用 SSE 连接
    remote: {
      type: 'sse',
      url: 'http://localhost:8080/mcp',
    },
  },
})

// 3. 初始化连接
await agent.initialize()

// 4. 开始对话
const result = await agent.chat('帮我查一下最近的订单')
console.log(result.content)

// 5. 关闭连接
await agent.close()
```

### 流式响应

```typescript
import { MCPLink, MCPLinkEventType } from '@mcplink/core'

for await (const event of agent.chatStream('生成一份报价单')) {
  switch (event.type) {
    case MCPLinkEventType.THINKING_START:
      console.log('🤔 开始思考...')
      break

    case MCPLinkEventType.THINKING_DELTA:
      process.stdout.write(event.data.content)
      break

    case MCPLinkEventType.TOOL_CALL_START:
      console.log(`🔧 调用工具: ${event.data.toolName}`)
      break

    case MCPLinkEventType.TOOL_RESULT:
      console.log(`✅ 工具返回: ${event.data.toolName} (${event.data.duration}ms)`)
      break

    case MCPLinkEventType.TEXT_DELTA:
      process.stdout.write(event.data.content)
      break

    case MCPLinkEventType.COMPLETE:
      console.log(`\n⏱️ 总耗时: ${event.data.totalDuration}ms`)
      break
  }
}
```

### 多模型支持

```typescript
import { createOpenAI } from '@ai-sdk/openai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createAnthropic } from '@ai-sdk/anthropic'

// OpenAI GPT
const gpt = createOpenAI({ apiKey: '...' })('gpt-4o')

// Google Gemini
const gemini = createGoogleGenerativeAI({ apiKey: '...' })('gemini-1.5-flash')

// Anthropic Claude
const claude = createAnthropic({ apiKey: '...' })('claude-3-5-sonnet-20241022')

// 兼容 OpenAI 格式的国产模型
const deepseek = createOpenAI({
  apiKey: '...',
  baseURL: 'https://api.deepseek.com/v1',
})('deepseek-chat')
```

### 历史消息

```typescript
// 携带历史消息进行多轮对话
for await (const event of agent.chatStream('第一个订单的详情是什么？', {
  history: [
    { role: 'user', content: '帮我查一下最近的订单' },
    { role: 'assistant', content: '您有 3 笔未付款订单...' },
  ],
})) {
  // ...
}
```

### 工具过滤

```typescript
// 只允许使用特定工具
for await (const event of agent.chatStream('搜索产品', {
  allowedTools: ['search_products', 'get_product_details'],
})) {
  // ...
}
```

---

## 核心功能

| 功能 | 说明 |
|------|------|
| 🤖 **多模型支持** | OpenAI、Claude、Gemini、DeepSeek、Qwen 等 |
| 🔌 **MCP 协议** | 支持 stdio 和 SSE 两种连接方式 |
| 🔄 **Agent 循环** | 自动拆解任务，迭代执行直到完成 |
| 💭 **思考过程** | 展示 AI 的推理过程，支持 `<think>` 标签 |
| 📡 **流式输出** | 实时返回执行进度和结果 |
| 🛡️ **智能压缩** | 自动压缩历史消息，避免上下文过长 |
| ⏱️ **超时保护** | 内置超时机制，防止请求卡死 |

---

## 架构设计

```
┌─────────────────────────────────────────────────────────────┐
│                     用户自然语言输入                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                        MCPLink                              │
│  ┌─────────────────┐  ┌─────────────────┐                   │
│  │  Agent (原生)   │  │ PromptBasedAgent │  ← 自动选择      │
│  │  GPT/Claude     │  │  Gemini/DeepSeek │                  │
│  └─────────────────┘  └─────────────────┘                   │
│                              │                              │
│                     ┌────────▼────────┐                     │
│                     │   MCPManager    │  ← 工具管理         │
│                     └─────────────────┘                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                       MCP Servers                           │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐               │
│  │  业务工具  │  │  数据查询  │  │  文件操作  │   ...        │
│  └───────────┘  └───────────┘  └───────────┘               │
└─────────────────────────────────────────────────────────────┘
```

### 模型路由策略

MCPLink 会根据模型名称自动选择最佳的 Agent 实现：

| 模型类型 | Agent | 说明 |
|---------|-------|------|
| GPT-4o, Claude-3 | Agent (原生) | 使用原生 function calling |
| Gemini Preview, DeepSeek | PromptBasedAgent | 使用 prompt 引导工具调用 |
| 未知模型 | PromptBasedAgent | 默认使用更兼容的方式 |

---

## API 参考

### MCPLink 配置

```typescript
interface MCPLinkConfig {
  // AI 模型（必填）
  model: LanguageModel

  // 模型名称，用于自动检测（可选）
  modelName?: string

  // 系统提示词（可选）
  systemPrompt?: string

  // 最大迭代次数（默认 10）
  maxIterations?: number

  // MCP 服务器配置
  mcpServers?: Record<string, MCPServerConfig>

  // 强制使用 Prompt-Based 模式
  usePromptBasedTools?: boolean | 'auto'
}
```

### 事件类型

```typescript
enum MCPLinkEventType {
  // 迭代控制
  ITERATION_START = 'iteration_start',
  ITERATION_END = 'iteration_end',

  // 思考过程
  THINKING_START = 'thinking_start',
  THINKING_DELTA = 'thinking_delta',
  THINKING_END = 'thinking_end',

  // 文本输出
  TEXT_START = 'text_start',
  TEXT_DELTA = 'text_delta',
  TEXT_END = 'text_end',

  // 工具调用
  TOOL_CALL_START = 'tool_call_start',
  TOOL_EXECUTING = 'tool_executing',
  TOOL_RESULT = 'tool_result',

  // 完成/错误
  COMPLETE = 'complete',
  ERROR = 'error',
}
```

---

## 开发

```bash
# 开发模式
pnpm dev

# 构建
pnpm build

# 只构建 core 包
pnpm build:core

# 类型检查
pnpm typecheck
```

---

## 许可证

MIT License

---

## 相关链接

- [MCP 协议规范](https://modelcontextprotocol.io/)
- [Vercel AI SDK](https://sdk.vercel.ai/)
- [MCP 官方服务器列表](https://github.com/modelcontextprotocol/servers)
