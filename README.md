# MCPLink

AI Agent 工具调用框架 - 支持 MCP 协议

## 简介

MCPLink 是一个完整的 AI Agent 解决方案，让 AI 能够自主理解用户意图、拆解任务、调用 MCP 工具来完成复杂工作流。

类似于 Cursor、CherryStudio 的 AI Agent 能力：
- 与 AI 对话
- AI 自动理解并拆解任务
- 逐个执行任务
- 检查结果
- 循环直到完成

## 项目结构

```
mcplink/
├── packages/
│   ├── core/      # 核心 SDK (npm 包)
│   ├── server/    # 后端服务
│   └── web/       # 前端网页
```

## 快速开始

### 环境要求

- Node.js >= 18
- pnpm >= 8

### 安装依赖

```bash
pnpm install
```

### 开发模式

```bash
# 启动所有服务
pnpm dev

# 或者分别启动
pnpm dev:server  # 启动后端 http://localhost:3000
pnpm dev:web     # 启动前端 http://localhost:5173
```

### 构建

```bash
pnpm build
```

## 使用方式

### 方式一：独立部署（网页版）

1. 启动后端服务
2. 打开前端网页
3. 在设置中配置 AI 模型和 MCP 工具
4. 开始对话

### 方式二：SDK 集成

```typescript
import { MCPLink } from '@mcplink/core'
import { openai } from '@ai-sdk/openai'

const agent = new MCPLink({
  model: openai('gpt-4o'),
  mcpServers: {
    business: {
      command: 'node',
      args: ['./my-mcp-server.js']
    }
  }
})

await agent.initialize()

// 发起对话
const result = await agent.chat('帮我查一下订单状态')
console.log(result.content)

// 流式对话
for await (const event of agent.chatStream('生成一份报价单')) {
  console.log(event.type, event.data)
}
```

## 核心功能

- ✅ 多模型支持（OpenAI、Claude、国产模型）
- ✅ MCP 协议支持（stdio、SSE）
- ✅ Agent 循环引擎
- ✅ 流式输出
- ✅ 执行过程可视化
- ✅ 网页配置界面

## License

MIT

