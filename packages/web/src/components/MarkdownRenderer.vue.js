import { computed, ref } from 'vue';
import { marked } from 'marked';
import hljs from 'highlight.js';
const props = defineProps();
const previewImage = ref(null);
// 处理点击事件
function handleClick(e) {
    const target = e.target;
    if (target.tagName === 'IMG' && target.classList.contains('markdown-image')) {
        previewImage.value = target.src;
    }
}
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
// 图片 - 限制大小并添加点击预览
// @ts-ignore - marked v17 类型定义问题
renderer.image = ({ href, title, text }) => {
    const titleAttr = title ? ` title="${title}"` : '';
    const altAttr = text ? ` alt="${text}"` : '';
    return `<div class="markdown-image-wrapper">
        <img src="${href}"${altAttr}${titleAttr} class="markdown-image" loading="lazy" />
    </div>`;
};
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
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ onClick: (__VLS_ctx.handleClick) },
    ...{ class: "markdown-body" },
});
__VLS_asFunctionalDirective(__VLS_directives.vHtml)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.renderedContent) }, null, null);
const __VLS_0 = {}.Teleport;
/** @type {[typeof __VLS_components.Teleport, typeof __VLS_components.Teleport, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    to: "body",
}));
const __VLS_2 = __VLS_1({
    to: "body",
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
__VLS_3.slots.default;
if (__VLS_ctx.previewImage) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.previewImage))
                    return;
                __VLS_ctx.previewImage = null;
            } },
        ...{ class: "image-preview-overlay" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "image-preview-container" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.img)({
        ...{ onClick: () => { } },
        src: (__VLS_ctx.previewImage),
        ...{ class: "image-preview" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.previewImage))
                    return;
                __VLS_ctx.previewImage = null;
            } },
        ...{ class: "image-preview-close" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.svg, __VLS_intrinsicElements.svg)({
        width: "24",
        height: "24",
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        'stroke-width': "2",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.line, __VLS_intrinsicElements.line)({
        x1: "18",
        y1: "6",
        x2: "6",
        y2: "18",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.line, __VLS_intrinsicElements.line)({
        x1: "6",
        y1: "6",
        x2: "18",
        y2: "18",
    });
}
var __VLS_3;
/** @type {__VLS_StyleScopedClasses['markdown-body']} */ ;
/** @type {__VLS_StyleScopedClasses['image-preview-overlay']} */ ;
/** @type {__VLS_StyleScopedClasses['image-preview-container']} */ ;
/** @type {__VLS_StyleScopedClasses['image-preview']} */ ;
/** @type {__VLS_StyleScopedClasses['image-preview-close']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            previewImage: previewImage,
            handleClick: handleClick,
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
