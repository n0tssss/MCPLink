import { ref, onMounted } from 'vue';
import { useAppStore } from '@/stores/app';
import { toast } from '@/composables/useToast';
const store = useAppStore();
const testing = ref(false);
const serverUrl = ref('');
const quickConfigs = [
    { name: '本地开发', url: 'http://localhost:3000' },
    { name: '本地 (127.0.0.1)', url: 'http://127.0.0.1:3000' },
];
onMounted(() => {
    serverUrl.value = store.serverUrl;
});
async function testConnection() {
    testing.value = true;
    store.setServerUrl(serverUrl.value);
    const connected = await store.checkConnection();
    testing.value = false;
    if (connected) {
        toast.success('连接成功');
    }
    else {
        toast.error('连接失败，请检查服务地址');
    }
}
async function saveSettings() {
    store.setServerUrl(serverUrl.value);
    const connected = await store.checkConnection();
    if (connected) {
        toast.success('保存成功');
        store.initialize();
    }
    else {
        toast.warning('配置已保存，但无法连接到服务');
    }
}
function selectConfig(config) {
    serverUrl.value = config.url;
}
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['page-header']} */ ;
/** @type {__VLS_StyleScopedClasses['input-row']} */ ;
/** @type {__VLS_StyleScopedClasses['section']} */ ;
/** @type {__VLS_StyleScopedClasses['quick-item']} */ ;
/** @type {__VLS_StyleScopedClasses['quick-item']} */ ;
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
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "input-row" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    type: "text",
    ...{ class: "input" },
    value: (__VLS_ctx.serverUrl),
    placeholder: "http://localhost:3000",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.testConnection) },
    ...{ class: "btn btn-secondary" },
    disabled: (__VLS_ctx.testing),
});
(__VLS_ctx.testing ? '测试中...' : '测试连接');
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "form-group" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "form-label" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "tag" },
    ...{ class: (__VLS_ctx.store.isConnected ? 'tag-success' : 'tag-error') },
});
(__VLS_ctx.store.isConnected ? '已连接' : '未连接');
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "form-actions" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.saveSettings) },
    ...{ class: "btn btn-primary" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "section" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "section-desc" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "quick-list" },
});
for (const [config] of __VLS_getVForSourceType((__VLS_ctx.quickConfigs))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.selectConfig(config);
            } },
        key: (config.url),
        ...{ class: "quick-item" },
        ...{ class: ({ active: __VLS_ctx.serverUrl === config.url }) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "quick-name" },
    });
    (config.name);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "quick-url" },
    });
    (config.url);
}
/** @type {__VLS_StyleScopedClasses['setting-page']} */ ;
/** @type {__VLS_StyleScopedClasses['page-header']} */ ;
/** @type {__VLS_StyleScopedClasses['description']} */ ;
/** @type {__VLS_StyleScopedClasses['card']} */ ;
/** @type {__VLS_StyleScopedClasses['form-group']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['input-row']} */ ;
/** @type {__VLS_StyleScopedClasses['input']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['form-group']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['tag']} */ ;
/** @type {__VLS_StyleScopedClasses['form-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['section']} */ ;
/** @type {__VLS_StyleScopedClasses['section-desc']} */ ;
/** @type {__VLS_StyleScopedClasses['quick-list']} */ ;
/** @type {__VLS_StyleScopedClasses['quick-item']} */ ;
/** @type {__VLS_StyleScopedClasses['quick-name']} */ ;
/** @type {__VLS_StyleScopedClasses['quick-url']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            store: store,
            testing: testing,
            serverUrl: serverUrl,
            quickConfigs: quickConfigs,
            testConnection: testConnection,
            saveSettings: saveSettings,
            selectConfig: selectConfig,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
