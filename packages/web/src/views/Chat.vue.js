import { ref, computed, nextTick, watch, onMounted } from 'vue';
import { useAppStore } from '@/stores/app';
import { api } from '@/api';
import MarkdownRenderer from '@/components/MarkdownRenderer.vue';
const store = useAppStore();
const messagesRef = ref(null);
const inputRef = ref(null);
const inputMessage = ref('');
const isLoading = ref(false);
const isStreaming = ref(false);
const messages = ref([]);
const showToolsPanel = ref(false);
// 工具选择相关
const selectedToolsLabel = computed(() => {
    if (store.selectedToolNames.length === 0) {
        return `全部工具 (${store.availableTools.length})`;
    }
    if (store.selectedToolNames.length === 1) {
        return store.selectedToolNames[0];
    }
    return `${store.selectedToolNames.length} 个工具`;
});
function isToolSelected(toolName) {
    // 空数组表示全选
    if (store.selectedToolNames.length === 0)
        return true;
    return store.selectedToolNames.includes(toolName);
}
function toggleToolSelection(toolName) {
    const currentSelected = store.selectedToolNames.length === 0
        ? store.availableTools.map(t => t.name)
        : [...store.selectedToolNames];
    const index = currentSelected.indexOf(toolName);
    if (index === -1) {
        currentSelected.push(toolName);
    }
    else {
        currentSelected.splice(index, 1);
    }
    // 如果全选了，清空数组表示全选
    if (currentSelected.length === store.availableTools.length) {
        store.setSelectedTools([]);
    }
    else {
        store.setSelectedTools(currentSelected);
    }
}
// 监听会话切换
watch(() => store.currentConversationId, async (id) => {
    if (id) {
        const conv = store.conversations.find(c => c.id === id);
        if (conv) {
            // 转换旧格式消息
            messages.value = conv.messages.map(m => ({
                role: m.role,
                content: m.content,
                timestamp: m.timestamp,
                steps: m.toolCalls?.map((tc, i) => ({
                    iteration: i + 1,
                    status: 'completed',
                    thinking: '',
                    toolCalls: [{
                            name: tc.name,
                            arguments: tc.arguments,
                            result: tc.result,
                            duration: tc.duration,
                            status: (tc.status || 'success'),
                        }],
                    expanded: false,
                })) || [],
            }));
            scrollToBottom();
        }
    }
    else {
        messages.value = [];
    }
}, { immediate: true });
// 滚动到底部
function scrollToBottom() {
    nextTick(() => {
        if (messagesRef.value) {
            messagesRef.value.scrollTop = messagesRef.value.scrollHeight;
        }
    });
}
// 自动调整输入框高度
function autoResize() {
    if (inputRef.value) {
        inputRef.value.style.height = 'auto';
        inputRef.value.style.height = Math.min(inputRef.value.scrollHeight, 200) + 'px';
    }
}
// 处理键盘事件
function handleKeydown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
}
// 切换步骤展开/收起
function toggleStep(msg, stepIndex) {
    if (msg.steps && msg.steps[stepIndex]) {
        msg.steps[stepIndex].expanded = !msg.steps[stepIndex].expanded;
    }
}
// 获取步骤标题
function getStepTitle(step) {
    if (step.toolCalls.length === 1) {
        return `调用 ${step.toolCalls[0].name}`;
    }
    return `步骤 ${step.iteration}`;
}
// 获取运行中状态文本
function getRunningStatus(step) {
    const executing = step.toolCalls.find(t => t.status === 'executing');
    if (executing) {
        return `正在执行 ${executing.name}...`;
    }
    const pending = step.toolCalls.find(t => t.status === 'pending');
    if (pending) {
        return `准备调用 ${pending.name}...`;
    }
    return '处理中...';
}
// 获取完成摘要
function getCompletedSummary(step) {
    const successCount = step.toolCalls.filter(t => t.status === 'success').length;
    const errorCount = step.toolCalls.filter(t => t.status === 'error').length;
    const totalTime = step.toolCalls.reduce((sum, t) => sum + t.duration, 0);
    if (errorCount > 0) {
        return `${successCount} 成功, ${errorCount} 失败 · ${totalTime}ms`;
    }
    if (step.toolCalls.length === 1) {
        return `${totalTime}ms`;
    }
    return `${successCount} 个工具 · ${totalTime}ms`;
}
// 格式化 JSON
function formatJson(obj) {
    try {
        return JSON.stringify(obj, null, 2);
    }
    catch {
        return String(obj);
    }
}
// 格式化工具结果
function formatToolResult(result) {
    if (typeof result === 'string') {
        // 尝试解析为 JSON 进行美化
        try {
            const parsed = JSON.parse(result);
            return JSON.stringify(parsed, null, 2);
        }
        catch {
            return result;
        }
    }
    return formatJson(result);
}
// 发送消息
async function sendMessage() {
    const message = inputMessage.value.trim();
    if (!message || isLoading.value)
        return;
    inputMessage.value = '';
    if (inputRef.value) {
        inputRef.value.style.height = 'auto';
    }
    isLoading.value = true;
    isStreaming.value = false;
    // 如果没有当前会话，创建一个
    if (!store.currentConversationId) {
        await store.createConversation();
    }
    // 添加用户消息
    messages.value.push({
        role: 'user',
        content: message,
        timestamp: Date.now(),
    });
    scrollToBottom();
    // 准备 AI 消息
    const aiMessage = {
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
        steps: [],
    };
    messages.value.push(aiMessage);
    // 当前步骤
    let currentStep = null;
    // 当前工具调用
    let currentToolCall = null;
    // 关闭工具选择面板
    showToolsPanel.value = false;
    // 获取选中的工具（空数组表示全选，传 undefined）
    const selectedTools = store.selectedToolNames.length > 0 ? store.selectedToolNames : undefined;
    // 发起请求
    api.chat(message, {
        modelId: store.currentModelId || undefined,
        conversationId: store.currentConversationId || undefined,
        tools: selectedTools,
        onEvent: (event) => {
            handleSSEEvent(event, aiMessage, {
                getCurrentStep: () => currentStep,
                setCurrentStep: (step) => { currentStep = step; },
                getCurrentToolCall: () => currentToolCall,
                setCurrentToolCall: (tool) => { currentToolCall = tool; },
            });
            scrollToBottom();
        },
        onError: (error) => {
            console.error('Chat error:', error);
            aiMessage.content = `错误: ${error.message}`;
            isLoading.value = false;
            isStreaming.value = false;
        },
        onComplete: () => {
            isLoading.value = false;
            isStreaming.value = false;
            // 收起所有步骤
            if (aiMessage.steps) {
                aiMessage.steps.forEach(step => {
                    step.expanded = false;
                });
            }
            saveConversation();
        },
    });
}
// 处理 SSE 事件
function handleSSEEvent(event, aiMessage, context) {
    const { getCurrentStep, setCurrentStep, setCurrentToolCall } = context;
    switch (event.type) {
        case 'iteration_start': {
            // 开始新的迭代步骤
            const step = {
                iteration: event.data.iteration || 1,
                status: 'running',
                thinking: '',
                toolCalls: [],
                expanded: true, // 默认展开当前步骤
            };
            if (!aiMessage.steps) {
                aiMessage.steps = [];
            }
            aiMessage.steps.push(step);
            setCurrentStep(step);
            // 清空当前消息内容（新迭代开始）
            break;
        }
        case 'iteration_end': {
            const step = getCurrentStep();
            if (step) {
                step.status = 'completed';
                // 如果这个步骤没有工具调用，把 thinking 清空（因为它就是最终回复）
                if (step.toolCalls.length === 0) {
                    step.thinking = '';
                }
            }
            break;
        }
        case 'text_start':
            isStreaming.value = true;
            break;
        case 'text_delta': {
            isStreaming.value = true;
            const content = event.data.content || '';
            // 文本内容同时添加到 message.content 和当前步骤的 thinking
            aiMessage.content += content;
            const step = getCurrentStep();
            if (step) {
                step.thinking += content;
            }
            break;
        }
        case 'text_end':
            isStreaming.value = false;
            break;
        case 'thinking_content': {
            // 当有工具调用时，之前的文本是思考过程
            // 清空 message.content（因为它不是最终回复），保留在 step.thinking
            const step = getCurrentStep();
            if (step) {
                step.thinking = event.data.content || '';
                // 清空 message.content，因为有工具调用，这只是思考过程
                aiMessage.content = '';
            }
            break;
        }
        case 'thinking_delta': {
            const step = getCurrentStep();
            if (step) {
                step.thinking += event.data.content || '';
            }
            break;
        }
        case 'tool_call_start': {
            const step = getCurrentStep();
            if (step) {
                // 检查是否已存在（避免重复添加）
                const existing = step.toolCalls.find(t => t.toolCallId === event.data.toolCallId);
                if (!existing) {
                    const tool = {
                        name: event.data.toolName || '',
                        arguments: event.data.toolArgs || {},
                        result: undefined,
                        duration: 0,
                        status: 'pending',
                        toolCallId: event.data.toolCallId,
                    };
                    step.toolCalls.push(tool);
                    setCurrentToolCall(tool);
                }
            }
            break;
        }
        case 'tool_call_delta': {
            // 流式工具参数更新 - 暂时忽略，等待完整参数
            break;
        }
        case 'tool_call_end': {
            const step = getCurrentStep();
            if (step && event.data.toolCallId) {
                const tool = step.toolCalls.find(t => t.toolCallId === event.data.toolCallId);
                if (tool && event.data.toolArgs) {
                    tool.arguments = event.data.toolArgs;
                }
            }
            break;
        }
        case 'tool_executing': {
            const step = getCurrentStep();
            if (step) {
                const tool = step.toolCalls.find(t => t.toolCallId === event.data.toolCallId);
                if (tool) {
                    tool.status = 'executing';
                    // 确保参数已设置
                    if (event.data.toolArgs) {
                        tool.arguments = event.data.toolArgs;
                    }
                }
            }
            break;
        }
        case 'tool_result': {
            const step = getCurrentStep();
            if (step) {
                const tool = step.toolCalls.find(t => t.toolCallId === event.data.toolCallId);
                if (tool) {
                    tool.result = event.data.toolResult;
                    tool.duration = event.data.duration || 0;
                    tool.status = event.data.isError ? 'error' : 'success';
                }
            }
            setCurrentToolCall(null);
            break;
        }
        case 'error':
            aiMessage.content = `错误: ${event.data.error}`;
            isStreaming.value = false;
            break;
        case 'complete':
            isStreaming.value = false;
            break;
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
        }));
        await api.updateConversation(store.currentConversationId, {
            messages: storedMessages,
        });
    }
}
onMounted(() => {
    inputRef.value?.focus();
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['welcome']} */ ;
/** @type {__VLS_StyleScopedClasses['welcome']} */ ;
/** @type {__VLS_StyleScopedClasses['message']} */ ;
/** @type {__VLS_StyleScopedClasses['message-inner']} */ ;
/** @type {__VLS_StyleScopedClasses['step-block']} */ ;
/** @type {__VLS_StyleScopedClasses['step-header']} */ ;
/** @type {__VLS_StyleScopedClasses['step-block']} */ ;
/** @type {__VLS_StyleScopedClasses['step-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['step-block']} */ ;
/** @type {__VLS_StyleScopedClasses['step-expanded']} */ ;
/** @type {__VLS_StyleScopedClasses['step-chevron']} */ ;
/** @type {__VLS_StyleScopedClasses['tool-block']} */ ;
/** @type {__VLS_StyleScopedClasses['tool-block']} */ ;
/** @type {__VLS_StyleScopedClasses['tool-block']} */ ;
/** @type {__VLS_StyleScopedClasses['tool-block']} */ ;
/** @type {__VLS_StyleScopedClasses['tool-block']} */ ;
/** @type {__VLS_StyleScopedClasses['success']} */ ;
/** @type {__VLS_StyleScopedClasses['tool-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['tool-block']} */ ;
/** @type {__VLS_StyleScopedClasses['error']} */ ;
/** @type {__VLS_StyleScopedClasses['tool-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['tool-details']} */ ;
/** @type {__VLS_StyleScopedClasses['tool-details']} */ ;
/** @type {__VLS_StyleScopedClasses['loading-dot']} */ ;
/** @type {__VLS_StyleScopedClasses['loading-dot']} */ ;
/** @type {__VLS_StyleScopedClasses['loading-dot']} */ ;
/** @type {__VLS_StyleScopedClasses['tools-header']} */ ;
/** @type {__VLS_StyleScopedClasses['tools-chevron']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-link']} */ ;
/** @type {__VLS_StyleScopedClasses['tools-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['tool-checkbox']} */ ;
/** @type {__VLS_StyleScopedClasses['tool-checkbox']} */ ;
/** @type {__VLS_StyleScopedClasses['tool-checkbox']} */ ;
/** @type {__VLS_StyleScopedClasses['tool-info']} */ ;
/** @type {__VLS_StyleScopedClasses['tool-name']} */ ;
/** @type {__VLS_StyleScopedClasses['tool-info']} */ ;
/** @type {__VLS_StyleScopedClasses['input-wrapper']} */ ;
/** @type {__VLS_StyleScopedClasses['message-input']} */ ;
/** @type {__VLS_StyleScopedClasses['send-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['send-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['input-hint']} */ ;
/** @type {__VLS_StyleScopedClasses['error']} */ ;
/** @type {__VLS_StyleScopedClasses['input-hint']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "chat" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "messages-container" },
    ref: "messagesRef",
});
/** @type {typeof __VLS_ctx.messagesRef} */ ;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "messages-wrapper" },
});
if (__VLS_ctx.messages.length === 0) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "welcome" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "welcome-icon" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h1, __VLS_intrinsicElements.h1)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
}
for (const [msg, index] of __VLS_getVForSourceType((__VLS_ctx.messages))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        key: (index),
        ...{ class: "message" },
        ...{ class: (msg.role) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "message-inner" },
    });
    if (msg.role === 'user') {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "message-content user-message" },
        });
        (msg.content);
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "message-content assistant-message" },
        });
        if (msg.steps && msg.steps.some(s => s.toolCalls.length > 0)) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "execution-process" },
            });
            for (const [step, si] of __VLS_getVForSourceType((msg.steps))) {
                (si);
                if (step.toolCalls.length > 0) {
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                        ...{ class: "step-block" },
                        ...{ class: ({ 'step-expanded': step.expanded, 'step-completed': step.status === 'completed' }) },
                    });
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                        ...{ onClick: (...[$event]) => {
                                if (!!(msg.role === 'user'))
                                    return;
                                if (!(msg.steps && msg.steps.some(s => s.toolCalls.length > 0)))
                                    return;
                                if (!(step.toolCalls.length > 0))
                                    return;
                                __VLS_ctx.toggleStep(msg, si);
                            } },
                        ...{ class: "step-header" },
                    });
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                        ...{ class: "step-icon" },
                    });
                    if (step.status === 'running') {
                        __VLS_asFunctionalElement(__VLS_intrinsicElements.svg, __VLS_intrinsicElements.svg)({
                            ...{ class: "spinner" },
                            xmlns: "http://www.w3.org/2000/svg",
                            width: "16",
                            height: "16",
                            viewBox: "0 0 24 24",
                            fill: "none",
                            stroke: "currentColor",
                            'stroke-width': "2",
                        });
                        __VLS_asFunctionalElement(__VLS_intrinsicElements.circle, __VLS_intrinsicElements.circle)({
                            cx: "12",
                            cy: "12",
                            r: "10",
                            'stroke-dasharray': "50",
                            'stroke-dashoffset': "20",
                        });
                    }
                    else if (step.status === 'completed') {
                        __VLS_asFunctionalElement(__VLS_intrinsicElements.svg, __VLS_intrinsicElements.svg)({
                            xmlns: "http://www.w3.org/2000/svg",
                            width: "16",
                            height: "16",
                            viewBox: "0 0 24 24",
                            fill: "none",
                            stroke: "currentColor",
                            'stroke-width': "2",
                        });
                        __VLS_asFunctionalElement(__VLS_intrinsicElements.polyline, __VLS_intrinsicElements.polyline)({
                            points: "20 6 9 17 4 12",
                        });
                    }
                    else {
                        __VLS_asFunctionalElement(__VLS_intrinsicElements.svg, __VLS_intrinsicElements.svg)({
                            xmlns: "http://www.w3.org/2000/svg",
                            width: "16",
                            height: "16",
                            viewBox: "0 0 24 24",
                            fill: "none",
                            stroke: "currentColor",
                            'stroke-width': "2",
                        });
                        __VLS_asFunctionalElement(__VLS_intrinsicElements.circle, __VLS_intrinsicElements.circle)({
                            cx: "12",
                            cy: "12",
                            r: "10",
                        });
                    }
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                        ...{ class: "step-title" },
                    });
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                        ...{ class: "step-label" },
                    });
                    (__VLS_ctx.getStepTitle(step));
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                        ...{ class: "step-summary" },
                    });
                    if (step.status === 'running') {
                        (__VLS_ctx.getRunningStatus(step));
                    }
                    else {
                        (__VLS_ctx.getCompletedSummary(step));
                    }
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                        ...{ class: "step-chevron" },
                    });
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.svg, __VLS_intrinsicElements.svg)({
                        xmlns: "http://www.w3.org/2000/svg",
                        width: "16",
                        height: "16",
                        viewBox: "0 0 24 24",
                        fill: "none",
                        stroke: "currentColor",
                        'stroke-width': "2",
                    });
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.polyline, __VLS_intrinsicElements.polyline)({
                        points: "6 9 12 15 18 9",
                    });
                    if (step.expanded) {
                        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                            ...{ class: "step-content" },
                        });
                        if (step.thinking) {
                            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                                ...{ class: "thinking-block" },
                            });
                            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                                ...{ class: "thinking-label" },
                            });
                            __VLS_asFunctionalElement(__VLS_intrinsicElements.svg, __VLS_intrinsicElements.svg)({
                                xmlns: "http://www.w3.org/2000/svg",
                                width: "14",
                                height: "14",
                                viewBox: "0 0 24 24",
                                fill: "none",
                                stroke: "currentColor",
                                'stroke-width': "2",
                            });
                            __VLS_asFunctionalElement(__VLS_intrinsicElements.circle, __VLS_intrinsicElements.circle)({
                                cx: "12",
                                cy: "12",
                                r: "10",
                            });
                            __VLS_asFunctionalElement(__VLS_intrinsicElements.path, __VLS_intrinsicElements.path)({
                                d: "M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3",
                            });
                            __VLS_asFunctionalElement(__VLS_intrinsicElements.line, __VLS_intrinsicElements.line)({
                                x1: "12",
                                y1: "17",
                                x2: "12.01",
                                y2: "17",
                            });
                            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
                            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                                ...{ class: "thinking-text" },
                            });
                            (step.thinking);
                        }
                        for (const [tool, ti] of __VLS_getVForSourceType((step.toolCalls))) {
                            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                                key: (ti),
                                ...{ class: "tool-block" },
                                ...{ class: (tool.status) },
                            });
                            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                                ...{ class: "tool-header" },
                            });
                            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                                ...{ class: "tool-icon" },
                            });
                            if (tool.status === 'pending' || tool.status === 'executing') {
                                __VLS_asFunctionalElement(__VLS_intrinsicElements.svg, __VLS_intrinsicElements.svg)({
                                    ...{ class: "spinner" },
                                    xmlns: "http://www.w3.org/2000/svg",
                                    width: "14",
                                    height: "14",
                                    viewBox: "0 0 24 24",
                                    fill: "none",
                                    stroke: "currentColor",
                                    'stroke-width': "2",
                                });
                                __VLS_asFunctionalElement(__VLS_intrinsicElements.circle, __VLS_intrinsicElements.circle)({
                                    cx: "12",
                                    cy: "12",
                                    r: "10",
                                    'stroke-dasharray': "50",
                                    'stroke-dashoffset': "20",
                                });
                            }
                            else if (tool.status === 'success') {
                                __VLS_asFunctionalElement(__VLS_intrinsicElements.svg, __VLS_intrinsicElements.svg)({
                                    xmlns: "http://www.w3.org/2000/svg",
                                    width: "14",
                                    height: "14",
                                    viewBox: "0 0 24 24",
                                    fill: "none",
                                    stroke: "currentColor",
                                    'stroke-width': "2",
                                });
                                __VLS_asFunctionalElement(__VLS_intrinsicElements.polyline, __VLS_intrinsicElements.polyline)({
                                    points: "20 6 9 17 4 12",
                                });
                            }
                            else {
                                __VLS_asFunctionalElement(__VLS_intrinsicElements.svg, __VLS_intrinsicElements.svg)({
                                    xmlns: "http://www.w3.org/2000/svg",
                                    width: "14",
                                    height: "14",
                                    viewBox: "0 0 24 24",
                                    fill: "none",
                                    stroke: "currentColor",
                                    'stroke-width': "2",
                                });
                                __VLS_asFunctionalElement(__VLS_intrinsicElements.circle, __VLS_intrinsicElements.circle)({
                                    cx: "12",
                                    cy: "12",
                                    r: "10",
                                });
                                __VLS_asFunctionalElement(__VLS_intrinsicElements.line, __VLS_intrinsicElements.line)({
                                    x1: "15",
                                    y1: "9",
                                    x2: "9",
                                    y2: "15",
                                });
                                __VLS_asFunctionalElement(__VLS_intrinsicElements.line, __VLS_intrinsicElements.line)({
                                    x1: "9",
                                    y1: "9",
                                    x2: "15",
                                    y2: "15",
                                });
                            }
                            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                                ...{ class: "tool-name" },
                            });
                            (tool.name);
                            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                                ...{ class: "tool-status-text" },
                            });
                            if (tool.status === 'pending') {
                            }
                            else if (tool.status === 'executing') {
                            }
                            else if (tool.status === 'success') {
                                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                                    ...{ class: "success-text" },
                                });
                                (tool.duration);
                            }
                            else if (tool.status === 'error') {
                                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                                    ...{ class: "error-text" },
                                });
                            }
                            if (Object.keys(tool.arguments).length > 0) {
                                __VLS_asFunctionalElement(__VLS_intrinsicElements.details, __VLS_intrinsicElements.details)({
                                    ...{ class: "tool-details" },
                                });
                                __VLS_asFunctionalElement(__VLS_intrinsicElements.summary, __VLS_intrinsicElements.summary)({});
                                __VLS_asFunctionalElement(__VLS_intrinsicElements.pre, __VLS_intrinsicElements.pre)({
                                    ...{ class: "tool-json" },
                                });
                                (__VLS_ctx.formatJson(tool.arguments));
                            }
                            if (tool.result !== undefined) {
                                __VLS_asFunctionalElement(__VLS_intrinsicElements.details, __VLS_intrinsicElements.details)({
                                    ...{ class: "tool-details" },
                                });
                                __VLS_asFunctionalElement(__VLS_intrinsicElements.summary, __VLS_intrinsicElements.summary)({});
                                __VLS_asFunctionalElement(__VLS_intrinsicElements.pre, __VLS_intrinsicElements.pre)({
                                    ...{ class: "tool-json" },
                                });
                                (__VLS_ctx.formatToolResult(tool.result));
                            }
                        }
                    }
                }
            }
        }
        if (msg.content || (__VLS_ctx.isStreaming && index === __VLS_ctx.messages.length - 1)) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "assistant-text" },
            });
            /** @type {[typeof MarkdownRenderer, ]} */ ;
            // @ts-ignore
            const __VLS_0 = __VLS_asFunctionalComponent(MarkdownRenderer, new MarkdownRenderer({
                content: (msg.content),
                streaming: (__VLS_ctx.isStreaming && index === __VLS_ctx.messages.length - 1),
            }));
            const __VLS_1 = __VLS_0({
                content: (msg.content),
                streaming: (__VLS_ctx.isStreaming && index === __VLS_ctx.messages.length - 1),
            }, ...__VLS_functionalComponentArgsRest(__VLS_0));
        }
    }
}
if (__VLS_ctx.isLoading && __VLS_ctx.messages.length > 0 && __VLS_ctx.messages[__VLS_ctx.messages.length - 1].role === 'user') {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "message assistant" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "message-inner" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "message-content assistant-message" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "loading-indicator" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "loading-dot" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "loading-dot" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "loading-dot" },
    });
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "input-area" },
});
if (__VLS_ctx.store.availableTools.length > 0) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "tools-selector" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.store.availableTools.length > 0))
                    return;
                __VLS_ctx.showToolsPanel = !__VLS_ctx.showToolsPanel;
            } },
        ...{ class: "tools-header" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "tools-icon" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.svg, __VLS_intrinsicElements.svg)({
        xmlns: "http://www.w3.org/2000/svg",
        width: "16",
        height: "16",
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        'stroke-width': "2",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.path, __VLS_intrinsicElements.path)({
        d: "M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "tools-label" },
    });
    (__VLS_ctx.selectedToolsLabel);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "tools-chevron" },
        ...{ class: ({ 'expanded': __VLS_ctx.showToolsPanel }) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.svg, __VLS_intrinsicElements.svg)({
        xmlns: "http://www.w3.org/2000/svg",
        width: "14",
        height: "14",
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        'stroke-width': "2",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.polyline, __VLS_intrinsicElements.polyline)({
        points: "6 9 12 15 18 9",
    });
    if (__VLS_ctx.showToolsPanel) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "tools-panel" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "tools-actions" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.store.availableTools.length > 0))
                        return;
                    if (!(__VLS_ctx.showToolsPanel))
                        return;
                    __VLS_ctx.store.clearSelectedTools();
                } },
            ...{ class: "btn-link" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "divider" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.store.availableTools.length > 0))
                        return;
                    if (!(__VLS_ctx.showToolsPanel))
                        return;
                    __VLS_ctx.store.setSelectedTools([]);
                } },
            ...{ class: "btn-link" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "tools-list" },
        });
        for (const [tool] of __VLS_getVForSourceType((__VLS_ctx.store.availableTools))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
                key: (tool.name),
                ...{ class: "tool-checkbox" },
                ...{ class: ({ 'checked': __VLS_ctx.isToolSelected(tool.name) }) },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
                ...{ onChange: (...[$event]) => {
                        if (!(__VLS_ctx.store.availableTools.length > 0))
                            return;
                        if (!(__VLS_ctx.showToolsPanel))
                            return;
                        __VLS_ctx.toggleToolSelection(tool.name);
                    } },
                type: "checkbox",
                checked: (__VLS_ctx.isToolSelected(tool.name)),
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "tool-info" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "tool-name" },
            });
            (tool.name);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "tool-desc" },
            });
            (tool.description);
        }
    }
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "input-wrapper" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.textarea, __VLS_intrinsicElements.textarea)({
    ...{ onKeydown: (__VLS_ctx.handleKeydown) },
    ...{ onInput: (__VLS_ctx.autoResize) },
    ref: "inputRef",
    value: (__VLS_ctx.inputMessage),
    ...{ class: "message-input" },
    placeholder: "发送消息...",
    rows: "1",
    disabled: (__VLS_ctx.isLoading || !__VLS_ctx.store.isConnected),
});
/** @type {typeof __VLS_ctx.inputRef} */ ;
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.sendMessage) },
    ...{ class: "send-btn" },
    disabled: (!__VLS_ctx.inputMessage.trim() || __VLS_ctx.isLoading || !__VLS_ctx.store.isConnected),
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.svg, __VLS_intrinsicElements.svg)({
    xmlns: "http://www.w3.org/2000/svg",
    width: "20",
    height: "20",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    'stroke-width': "2",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.line, __VLS_intrinsicElements.line)({
    x1: "22",
    y1: "2",
    x2: "11",
    y2: "13",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.polygon, __VLS_intrinsicElements.polygon)({
    points: "22 2 15 22 11 13 2 9 22 2",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "input-hint" },
});
if (!__VLS_ctx.store.isConnected) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "error" },
    });
}
else if (__VLS_ctx.store.enabledModels.length === 0) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "warning" },
    });
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
}
/** @type {__VLS_StyleScopedClasses['chat']} */ ;
/** @type {__VLS_StyleScopedClasses['messages-container']} */ ;
/** @type {__VLS_StyleScopedClasses['messages-wrapper']} */ ;
/** @type {__VLS_StyleScopedClasses['welcome']} */ ;
/** @type {__VLS_StyleScopedClasses['welcome-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['message']} */ ;
/** @type {__VLS_StyleScopedClasses['message-inner']} */ ;
/** @type {__VLS_StyleScopedClasses['message-content']} */ ;
/** @type {__VLS_StyleScopedClasses['user-message']} */ ;
/** @type {__VLS_StyleScopedClasses['message-content']} */ ;
/** @type {__VLS_StyleScopedClasses['assistant-message']} */ ;
/** @type {__VLS_StyleScopedClasses['execution-process']} */ ;
/** @type {__VLS_StyleScopedClasses['step-block']} */ ;
/** @type {__VLS_StyleScopedClasses['step-header']} */ ;
/** @type {__VLS_StyleScopedClasses['step-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['spinner']} */ ;
/** @type {__VLS_StyleScopedClasses['step-title']} */ ;
/** @type {__VLS_StyleScopedClasses['step-label']} */ ;
/** @type {__VLS_StyleScopedClasses['step-summary']} */ ;
/** @type {__VLS_StyleScopedClasses['step-chevron']} */ ;
/** @type {__VLS_StyleScopedClasses['step-content']} */ ;
/** @type {__VLS_StyleScopedClasses['thinking-block']} */ ;
/** @type {__VLS_StyleScopedClasses['thinking-label']} */ ;
/** @type {__VLS_StyleScopedClasses['thinking-text']} */ ;
/** @type {__VLS_StyleScopedClasses['tool-block']} */ ;
/** @type {__VLS_StyleScopedClasses['tool-header']} */ ;
/** @type {__VLS_StyleScopedClasses['tool-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['spinner']} */ ;
/** @type {__VLS_StyleScopedClasses['tool-name']} */ ;
/** @type {__VLS_StyleScopedClasses['tool-status-text']} */ ;
/** @type {__VLS_StyleScopedClasses['success-text']} */ ;
/** @type {__VLS_StyleScopedClasses['error-text']} */ ;
/** @type {__VLS_StyleScopedClasses['tool-details']} */ ;
/** @type {__VLS_StyleScopedClasses['tool-json']} */ ;
/** @type {__VLS_StyleScopedClasses['tool-details']} */ ;
/** @type {__VLS_StyleScopedClasses['tool-json']} */ ;
/** @type {__VLS_StyleScopedClasses['assistant-text']} */ ;
/** @type {__VLS_StyleScopedClasses['message']} */ ;
/** @type {__VLS_StyleScopedClasses['assistant']} */ ;
/** @type {__VLS_StyleScopedClasses['message-inner']} */ ;
/** @type {__VLS_StyleScopedClasses['message-content']} */ ;
/** @type {__VLS_StyleScopedClasses['assistant-message']} */ ;
/** @type {__VLS_StyleScopedClasses['loading-indicator']} */ ;
/** @type {__VLS_StyleScopedClasses['loading-dot']} */ ;
/** @type {__VLS_StyleScopedClasses['loading-dot']} */ ;
/** @type {__VLS_StyleScopedClasses['loading-dot']} */ ;
/** @type {__VLS_StyleScopedClasses['input-area']} */ ;
/** @type {__VLS_StyleScopedClasses['tools-selector']} */ ;
/** @type {__VLS_StyleScopedClasses['tools-header']} */ ;
/** @type {__VLS_StyleScopedClasses['tools-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['tools-label']} */ ;
/** @type {__VLS_StyleScopedClasses['tools-chevron']} */ ;
/** @type {__VLS_StyleScopedClasses['tools-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['tools-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-link']} */ ;
/** @type {__VLS_StyleScopedClasses['divider']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-link']} */ ;
/** @type {__VLS_StyleScopedClasses['tools-list']} */ ;
/** @type {__VLS_StyleScopedClasses['tool-checkbox']} */ ;
/** @type {__VLS_StyleScopedClasses['tool-info']} */ ;
/** @type {__VLS_StyleScopedClasses['tool-name']} */ ;
/** @type {__VLS_StyleScopedClasses['tool-desc']} */ ;
/** @type {__VLS_StyleScopedClasses['input-wrapper']} */ ;
/** @type {__VLS_StyleScopedClasses['message-input']} */ ;
/** @type {__VLS_StyleScopedClasses['send-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['input-hint']} */ ;
/** @type {__VLS_StyleScopedClasses['error']} */ ;
/** @type {__VLS_StyleScopedClasses['warning']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            MarkdownRenderer: MarkdownRenderer,
            store: store,
            messagesRef: messagesRef,
            inputRef: inputRef,
            inputMessage: inputMessage,
            isLoading: isLoading,
            isStreaming: isStreaming,
            messages: messages,
            showToolsPanel: showToolsPanel,
            selectedToolsLabel: selectedToolsLabel,
            isToolSelected: isToolSelected,
            toggleToolSelection: toggleToolSelection,
            autoResize: autoResize,
            handleKeydown: handleKeydown,
            toggleStep: toggleStep,
            getStepTitle: getStepTitle,
            getRunningStatus: getRunningStatus,
            getCompletedSummary: getCompletedSummary,
            formatJson: formatJson,
            formatToolResult: formatToolResult,
            sendMessage: sendMessage,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
