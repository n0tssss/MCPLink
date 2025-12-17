import { ref, computed, watch, nextTick } from 'vue';
import { marked } from 'marked';
import hljs from 'highlight.js';
const props = defineProps();
const containerRef = ref(null);
// 配置 marked
marked.setOptions({
    breaks: true,
    gfm: true,
});
// 自定义渲染器
const renderer = new marked.Renderer();
// 代码块渲染 - 添加语言标签和复制按钮
renderer.code = ({ text, lang }) => {
    const language = lang && hljs.getLanguage(lang) ? lang : 'plaintext';
    const highlighted = hljs.highlight(text, { language }).value;
    const langLabel = lang || 'code';
    return `<div class="code-block-wrapper">
    <div class="code-block-header">
      <span class="code-lang">${langLabel}</span>
      <button class="copy-btn" onclick="navigator.clipboard.writeText(decodeURIComponent('${encodeURIComponent(text)}')).then(() => { this.textContent = '已复制!'; setTimeout(() => this.textContent = '复制', 2000); })">复制</button>
    </div>
    <pre class="code-block"><code class="hljs language-${language}">${highlighted}</code></pre>
  </div>`;
};
// 行内代码
renderer.codespan = ({ text }) => {
    return `<code class="inline-code">${text}</code>`;
};
// 链接 - 新窗口打开
// @ts-ignore - marked v17 类型定义问题
renderer.link = ({ href, title, text }) => {
    const titleAttr = title ? ` title="${title}"` : '';
    return `<a href="${href}"${titleAttr} target="_blank" rel="noopener noreferrer">${text}</a>`;
};
// 表格 - 使用默认渲染，不自定义
// 设置渲染器
marked.use({ renderer });
// 渲染 markdown
const renderedContent = computed(() => {
    if (!props.content)
        return '';
    try {
        return marked.parse(props.content);
    }
    catch (e) {
        console.error('Markdown parse error:', e);
        return props.content;
    }
});
// 监听内容变化，自动滚动到底部（流式时）
watch(() => props.content, () => {
    if (props.streaming) {
        nextTick(() => {
            // 可以在这里添加滚动逻辑
        });
    }
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "markdown-body" },
    ref: "containerRef",
});
/** @type {typeof __VLS_ctx.containerRef} */ ;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalDirective(__VLS_directives.vHtml)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.renderedContent) }, null, null);
if (__VLS_ctx.streaming) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "cursor" },
    });
}
/** @type {__VLS_StyleScopedClasses['markdown-body']} */ ;
/** @type {__VLS_StyleScopedClasses['cursor']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            containerRef: containerRef,
            renderedContent: renderedContent,
        };
    },
    __typeProps: {},
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
    __typeProps: {},
});
; /* PartiallyEnd: #4569/main.vue */
