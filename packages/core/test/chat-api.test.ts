/**
 * 模拟前端请求的测试用例
 * 
 * 直接向后端发送 SSE 请求，和前端一模一样
 * 
 * 运行: npx tsx test/chat-api.test.ts
 */

const API_URL = 'http://localhost:3000/api/chat'

// 测试消息
const TEST_MESSAGE = '看看我有哪些订单没有付款，都告诉我，然后一共多少钱'

// 模型 ID - 需要在系统中配置好
// 使用用户实际的 Gemini 模型 ID
const MODEL_ID = '53402134-be60-4f5c-8da8-6660a5810e2f'

interface SSEEvent {
    type: string
    data: any
}

async function testChatAPI() {
    console.log('=' .repeat(60))
    console.log('模拟前端请求测试')
    console.log('=' .repeat(60))
    console.log(`\n请求地址: ${API_URL}`)
    console.log(`测试消息: ${TEST_MESSAGE}`)
    console.log(`模型ID: ${MODEL_ID || '使用默认'}\n`)

    const events: SSEEvent[] = []
    let thinkingContent = ''
    let textContent = ''
    let toolCalls: string[] = []
    let errors: string[] = []

    try {
        // 发送 POST 请求
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: TEST_MESSAGE,
                modelId: MODEL_ID || undefined,
                stream: true,
            }),
        })

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        console.log('连接成功，开始接收 SSE 事件...\n')
        console.log('-'.repeat(60))

        // 读取 SSE 流
        const reader = response.body?.getReader()
        if (!reader) {
            throw new Error('无法获取响应流')
        }

        const decoder = new TextDecoder()
        let buffer = ''
        let currentEventType = ''

        while (true) {
            const { done, value } = await reader.read()
            if (done) break

            buffer += decoder.decode(value, { stream: true })

            // 解析 SSE 事件
            const lines = buffer.split('\n')
            buffer = lines.pop() || '' // 保留不完整的行

            for (const line of lines) {
                if (line.startsWith('event: ')) {
                    const eventType = line.substring(7).trim()
                    // 等待 data 行
                    continue
                }
                
                // 处理事件类型
                if (line.startsWith('event: ')) {
                    currentEventType = line.substring(7).trim()
                    continue
                }

                if (line.startsWith('data: ')) {
                    const dataStr = line.substring(6)
                    // 打印原始数据
                    console.log(`[RAW ${currentEventType || '?'}] ${dataStr.slice(0, 200)}`)
                    try {
                        const data = JSON.parse(dataStr)
                        const event: SSEEvent = { type: currentEventType || data.type || 'unknown', data }
                        currentEventType = '' // 重置
                        events.push(event)

                        // 处理不同类型的事件
                        switch (event.type) {
                            case 'connected':
                                console.log(`📡 [connected] 连接已建立`)
                                break

                            case 'iteration_start':
                                console.log(`\n🔄 [iteration_start] 迭代 ${data.iteration}/${data.maxIterations}`)
                                break

                            case 'thinking_start':
                                console.log(`💭 [thinking_start] 开始思考...`)
                                break

                            case 'thinking_delta':
                                thinkingContent += data.content || ''
                                process.stdout.write(`   ${data.content || ''}`)
                                break

                            case 'thinking_end':
                                console.log(`\n💭 [thinking_end] 思考结束`)
                                break

                            case 'tool_call_start':
                                console.log(`\n🔧 [tool_call_start] 调用工具: ${data.toolName}`)
                                console.log(`   参数: ${JSON.stringify(data.toolArgs).slice(0, 100)}...`)
                                toolCalls.push(data.toolName)
                                break

                            case 'tool_executing':
                                console.log(`⏳ [tool_executing] 执行中: ${data.toolName}`)
                                break

                            case 'tool_result':
                                console.log(`✅ [tool_result] ${data.toolName} 完成 (${data.duration}ms)`)
                                if (data.isError) {
                                    console.log(`   ❌ 错误: ${JSON.stringify(data.toolResult).slice(0, 200)}`)
                                } else {
                                    console.log(`   结果预览: ${JSON.stringify(data.toolResult).slice(0, 200)}...`)
                                }
                                break

                            case 'text_start':
                                console.log(`\n📝 [text_start] 开始输出文本...`)
                                break

                            case 'text_delta':
                                textContent += data.content || ''
                                process.stdout.write(data.content || '')
                                break

                            case 'text_end':
                                console.log(`\n📝 [text_end] 文本输出结束`)
                                break

                            case 'iteration_end':
                                console.log(`\n🔄 [iteration_end] 迭代 ${data.iteration} 结束`)
                                break

                            case 'complete':
                                console.log(`\n✅ [complete] 完成! 耗时: ${data.totalDuration}ms, 迭代: ${data.totalIterations}`)
                                break

                            case 'error':
                                console.log(`\n❌ [error] ${data.error}`)
                                errors.push(data.error)
                                break

                            default:
                                // console.log(`   [${event.type}]`, JSON.stringify(data).slice(0, 100))
                        }
                    } catch (e) {
                        // 忽略 JSON 解析错误
                    }
                }
            }
        }

        // 测试总结
        console.log('\n' + '='.repeat(60))
        console.log('测试结果总结')
        console.log('='.repeat(60))
        
        console.log(`\n📊 事件统计:`)
        console.log(`   - 总事件数: ${events.length}`)
        console.log(`   - 思考内容长度: ${thinkingContent.length} 字符`)
        console.log(`   - 回复内容长度: ${textContent.length} 字符`)
        console.log(`   - 工具调用: ${toolCalls.length > 0 ? toolCalls.join(', ') : '无'}`)
        console.log(`   - 错误数: ${errors.length}`)

        console.log(`\n✅ 检查项:`)
        const hasThinking = thinkingContent.length > 0
        const hasToolCall = toolCalls.length > 0
        const hasTextOutput = textContent.length > 0
        const noErrors = errors.length === 0

        console.log(`   [${hasThinking ? '✓' : '✗'}] 有思考过程`)
        console.log(`   [${hasToolCall ? '✓' : '✗'}] 调用了工具`)
        console.log(`   [${hasTextOutput ? '✓' : '✗'}] 有文本回复`)
        console.log(`   [${noErrors ? '✓' : '✗'}] 无错误`)

        // 最终判定
        const passed = hasToolCall && hasTextOutput && noErrors
        console.log(`\n${'='.repeat(60)}`)
        if (passed) {
            console.log('🎉 测试通过!')
        } else {
            console.log('❌ 测试失败!')
            if (!hasToolCall) console.log('   - 未调用工具（应该调用 get_order_list）')
            if (!hasTextOutput) console.log('   - 没有文本回复')
            if (!noErrors) console.log(`   - 有错误: ${errors.join(', ')}`)
        }
        console.log('='.repeat(60))

        // 显示完整回复内容
        if (textContent) {
            console.log('\n📄 完整回复内容:')
            console.log('-'.repeat(60))
            console.log(textContent)
            console.log('-'.repeat(60))
        }

    } catch (error) {
        console.error('\n❌ 测试异常:', error)
    }
}

// 运行测试
testChatAPI()

