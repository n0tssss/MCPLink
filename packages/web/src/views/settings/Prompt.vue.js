import { ref, onMounted } from 'vue';
import { useAppStore } from '@/stores/app';
import { api } from '@/api';
import { toast } from '@/composables/useToast';
const store = useAppStore();
const saving = ref(false);
const systemPrompt = ref('');
const maxIterations = ref(10);
const defaultPrompt = `你是一个智能助手，可以通过调用工具来帮助用户完成任务。

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
- 完成所有步骤后，用清晰的语言总结执行结果`;
onMounted(() => {
    systemPrompt.value = store.settings.systemPrompt || '';
    maxIterations.value = store.settings.maxIterations || 10;
});
async function saveSettings() {
    saving.value = true;
    try {
        await api.updateSettings({
            systemPrompt: systemPrompt.value,
            maxIterations: maxIterations.value,
        });
        toast.success('保存成功');
        store.fetchSettings();
    }
    catch (error) {
        toast.error('保存失败');
    }
    finally {
        saving.value = false;
    }
}
function resetToDefault() {
    systemPrompt.value = defaultPrompt;
    toast.info('已重置为默认提示词，请点击保存');
}
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['page-header']} */ ;
/** @type {__VLS_StyleScopedClasses['section']} */ ;
/** @type {__VLS_StyleScopedClasses['default-prompt-card']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "setting-page" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "page-header" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "description" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "card" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "form-group" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "form-label" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.textarea, __VLS_intrinsicElements.textarea)({
    ...{ class: "textarea" },
    value: (__VLS_ctx.systemPrompt),
    placeholder: "输入系统提示词...",
    rows: "10",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "form-group" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "form-label" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "input-inline" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    type: "number",
    ...{ class: "input" },
    min: "1",
    max: "50",
    ...{ style: {} },
});
(__VLS_ctx.maxIterations);
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "input-suffix" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "form-hint" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "form-actions" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.saveSettings) },
    ...{ class: "btn btn-primary" },
    disabled: (__VLS_ctx.saving),
});
(__VLS_ctx.saving ? '保存中...' : '保存');
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.resetToDefault) },
    ...{ class: "btn btn-secondary" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "section" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "section-desc" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "default-prompt-card" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.pre, __VLS_intrinsicElements.pre)({});
(__VLS_ctx.defaultPrompt);
/** @type {__VLS_StyleScopedClasses['setting-page']} */ ;
/** @type {__VLS_StyleScopedClasses['page-header']} */ ;
/** @type {__VLS_StyleScopedClasses['description']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['form-group']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['textarea']} */ ;
/** @type {__VLS_StyleScopedClasses['form-group']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['input-inline']} */ ;
/** @type {__VLS_StyleScopedClasses['input']} */ ;
/** @type {__VLS_StyleScopedClasses['input-suffix']} */ ;
/** @type {__VLS_StyleScopedClasses['form-hint']} */ ;
/** @type {__VLS_StyleScopedClasses['form-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['section']} */ ;
/** @type {__VLS_StyleScopedClasses['section-desc']} */ ;
/** @type {__VLS_StyleScopedClasses['default-prompt-card']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            saving: saving,
            systemPrompt: systemPrompt,
            maxIterations: maxIterations,
            defaultPrompt: defaultPrompt,
            saveSettings: saveSettings,
            resetToDefault: resetToDefault,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
