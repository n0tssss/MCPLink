import { ref, reactive } from 'vue';
import { useAppStore } from '@/stores/app';
import { api } from '@/api';
import { toast } from '@/composables/useToast';
const store = useAppStore();
const modalVisible = ref(false);
const editingModel = ref(null);
const saving = ref(false);
const fetchingModels = ref(false);
const availableModels = ref([]);
const selectedModels = ref(new Set());
const form = reactive({
    name: '',
    model: '',
    baseURL: '',
    apiKey: '',
    enabled: true,
    manualModels: '',
    namePrefix: '',
});
function showAddModal() {
    editingModel.value = null;
    form.name = '';
    form.model = '';
    form.baseURL = '';
    form.apiKey = '';
    form.enabled = true;
    form.manualModels = '';
    form.namePrefix = '';
    availableModels.value = [];
    selectedModels.value.clear();
    modalVisible.value = true;
}
function editModel(model) {
    editingModel.value = model;
    form.name = model.name;
    form.model = model.model;
    form.baseURL = model.baseURL;
    form.apiKey = model.apiKey || '';
    form.enabled = model.enabled;
    form.manualModels = '';
    form.namePrefix = '';
    availableModels.value = [];
    selectedModels.value.clear();
    modalVisible.value = true;
}
function closeModal() {
    modalVisible.value = false;
}
function onBaseURLChange() {
    // 当 URL 变化时清空模型列表
    availableModels.value = [];
    selectedModels.value.clear();
}
function onModelSelect(model) {
    // 编辑模式下选择模型时，如果名称是旧模型名，则更新为新模型名
    if (editingModel.value && (form.name === editingModel.value.model || form.name === form.model)) {
        form.name = model;
    }
    form.model = model;
}
async function fetchModels() {
    if (!form.baseURL) {
        toast.warning('请先填写 Base URL');
        return;
    }
    fetchingModels.value = true;
    availableModels.value = [];
    selectedModels.value.clear();
    try {
        const result = await api.fetchRemoteModels(form.baseURL, form.apiKey);
        if (result.models && result.models.length > 0) {
            availableModels.value = result.models.sort();
            if (editingModel.value) {
                // 编辑模式：如果当前模型在列表中，保持选中
                if (!result.models.includes(form.model)) {
                    // 当前模型不在列表中，提示用户
                    toast.info('当前模型不在远程列表中，可以选择新模型');
                }
            }
            else {
                // 新增模式：默认选中常用模型
                const commonModels = ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo', 'claude-3-5-sonnet-20241022'];
                for (const m of result.models) {
                    if (commonModels.some(c => m.toLowerCase().includes(c.toLowerCase()))) {
                        selectedModels.value.add(m);
                    }
                }
            }
            toast.success(`获取到 ${result.models.length} 个模型`);
        }
        else {
            toast.warning('未获取到模型列表，请手动输入模型名称');
        }
    }
    catch (error) {
        console.error('获取模型列表失败:', error);
        toast.error(`获取模型列表失败: ${error.response?.data?.error || error.message || '未知错误'}`);
    }
    finally {
        fetchingModels.value = false;
    }
}
function toggleModelSelection(model) {
    if (selectedModels.value.has(model)) {
        selectedModels.value.delete(model);
    }
    else {
        selectedModels.value.add(model);
    }
}
function selectAllModels() {
    for (const model of availableModels.value) {
        selectedModels.value.add(model);
    }
}
function clearSelectedModels() {
    selectedModels.value.clear();
}
function getModelsToAdd() {
    if (availableModels.value.length > 0) {
        return Array.from(selectedModels.value);
    }
    else {
        // 从手动输入中解析模型名称
        return form.manualModels
            .split(/[,\n]/)
            .map(m => m.trim())
            .filter(m => m.length > 0);
    }
}
function getSubmitButtonText() {
    if (editingModel.value) {
        return '保存';
    }
    const count = getModelsToAdd().length;
    return count > 0 ? `添加 ${count} 个模型` : '添加模型';
}
async function saveModel() {
    // 编辑模式
    if (editingModel.value) {
        if (!form.model || !form.baseURL) {
            toast.warning('请填写必填项');
            return;
        }
        saving.value = true;
        try {
            await api.updateModel(editingModel.value.id, {
                name: form.name || form.model,
                model: form.model,
                baseURL: form.baseURL,
                apiKey: form.apiKey,
                enabled: form.enabled,
            });
            toast.success('保存成功');
            closeModal();
            store.fetchModels();
        }
        catch (error) {
            toast.error('操作失败');
        }
        finally {
            saving.value = false;
        }
        return;
    }
    // 新增模式
    const modelsToAdd = getModelsToAdd();
    if (modelsToAdd.length === 0) {
        toast.warning('请选择或输入至少一个模型');
        return;
    }
    if (!form.baseURL) {
        toast.warning('请填写 Base URL');
        return;
    }
    saving.value = true;
    try {
        // 批量添加模型
        for (const modelId of modelsToAdd) {
            const displayName = form.namePrefix ? `${form.namePrefix}${modelId}` : modelId;
            await api.createModel({
                name: displayName,
                model: modelId,
                baseURL: form.baseURL,
                apiKey: form.apiKey,
                enabled: true,
            });
        }
        closeModal();
        store.fetchModels();
        toast.success(`成功添加 ${modelsToAdd.length} 个模型`);
    }
    catch (error) {
        toast.error('操作失败');
    }
    finally {
        saving.value = false;
    }
}
async function toggleModel(id) {
    try {
        await api.toggleModel(id);
        store.fetchModels();
    }
    catch (error) {
        toast.error('操作失败');
    }
}
async function deleteModel(id) {
    if (!confirm('确定要删除这个模型吗？'))
        return;
    try {
        await api.deleteModel(id);
        toast.success('删除成功');
        store.fetchModels();
    }
    catch (error) {
        toast.error('删除失败');
    }
}
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['page-header']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label-row']} */ ;
/** @type {__VLS_StyleScopedClasses['input-row']} */ ;
/** @type {__VLS_StyleScopedClasses['model-checkbox']} */ ;
/** @type {__VLS_StyleScopedClasses['model-radio']} */ ;
/** @type {__VLS_StyleScopedClasses['model-checkbox']} */ ;
/** @type {__VLS_StyleScopedClasses['model-radio']} */ ;
/** @type {__VLS_StyleScopedClasses['selected']} */ ;
/** @type {__VLS_StyleScopedClasses['model-checkbox']} */ ;
/** @type {__VLS_StyleScopedClasses['model-radio']} */ ;
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
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.showAddModal) },
    ...{ class: "btn btn-primary" },
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
__VLS_asFunctionalElement(__VLS_intrinsicElements.line, __VLS_intrinsicElements.line)({
    x1: "12",
    y1: "5",
    x2: "12",
    y2: "19",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.line, __VLS_intrinsicElements.line)({
    x1: "5",
    y1: "12",
    x2: "19",
    y2: "12",
});
if (__VLS_ctx.store.models.length > 0) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "model-list" },
    });
    for (const [model] of __VLS_getVForSourceType((__VLS_ctx.store.models))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            key: (model.id),
            ...{ class: "model-card" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "model-header" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "model-info" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "model-name" },
        });
        (model.name);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "tag" },
            ...{ class: (model.enabled ? 'tag-success' : '') },
        });
        (model.enabled ? '已启用' : '已停用');
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "model-actions" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.store.models.length > 0))
                        return;
                    __VLS_ctx.toggleModel(model.id);
                } },
            ...{ class: "switch" },
            ...{ class: ({ active: model.enabled }) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.store.models.length > 0))
                        return;
                    __VLS_ctx.editModel(model);
                } },
            ...{ class: "btn btn-ghost btn-icon" },
            title: "编辑",
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
            d: "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.path, __VLS_intrinsicElements.path)({
            d: "M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.store.models.length > 0))
                        return;
                    __VLS_ctx.deleteModel(model.id);
                } },
            ...{ class: "btn btn-ghost btn-icon" },
            title: "删除",
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
            points: "3 6 5 6 21 6",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.path, __VLS_intrinsicElements.path)({
            d: "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "model-details" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "detail-row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "detail-label" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (model.model);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "detail-row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "detail-label" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "truncate" },
        });
        (model.baseURL);
    }
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "empty" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "empty-icon" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "empty-text" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "empty-hint" },
    });
}
if (__VLS_ctx.modalVisible) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onClick: (__VLS_ctx.closeModal) },
        ...{ class: "modal-overlay" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "modal modal-lg" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "modal-header" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "modal-title" },
    });
    (__VLS_ctx.editingModel ? '编辑模型' : '添加模型');
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.closeModal) },
        ...{ class: "btn btn-ghost btn-icon" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.svg, __VLS_intrinsicElements.svg)({
        xmlns: "http://www.w3.org/2000/svg",
        width: "18",
        height: "18",
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
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "modal-body" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "form-group" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "form-label" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
        ...{ onBlur: (__VLS_ctx.onBaseURLChange) },
        type: "text",
        ...{ class: "input" },
        value: (__VLS_ctx.form.baseURL),
        placeholder: "如: https://api.openai.com/v1",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "form-hint" },
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
        value: (__VLS_ctx.form.apiKey),
        placeholder: "sk-...",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.fetchModels) },
        ...{ class: "btn btn-secondary" },
        disabled: (__VLS_ctx.fetchingModels || !__VLS_ctx.form.baseURL),
    });
    if (__VLS_ctx.fetchingModels) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.svg, __VLS_intrinsicElements.svg)({
            ...{ class: "spin" },
            xmlns: "http://www.w3.org/2000/svg",
            width: "16",
            height: "16",
            viewBox: "0 0 24 24",
            fill: "none",
            stroke: "currentColor",
            'stroke-width': "2",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.line, __VLS_intrinsicElements.line)({
            x1: "12",
            y1: "2",
            x2: "12",
            y2: "6",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.line, __VLS_intrinsicElements.line)({
            x1: "12",
            y1: "18",
            x2: "12",
            y2: "22",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.line, __VLS_intrinsicElements.line)({
            x1: "4.93",
            y1: "4.93",
            x2: "7.76",
            y2: "7.76",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.line, __VLS_intrinsicElements.line)({
            x1: "16.24",
            y1: "16.24",
            x2: "19.07",
            y2: "19.07",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.line, __VLS_intrinsicElements.line)({
            x1: "2",
            y1: "12",
            x2: "6",
            y2: "12",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.line, __VLS_intrinsicElements.line)({
            x1: "18",
            y1: "12",
            x2: "22",
            y2: "12",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.line, __VLS_intrinsicElements.line)({
            x1: "4.93",
            y1: "19.07",
            x2: "7.76",
            y2: "16.24",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.line, __VLS_intrinsicElements.line)({
            x1: "16.24",
            y1: "7.76",
            x2: "19.07",
            y2: "4.93",
        });
    }
    (__VLS_ctx.fetchingModels ? '获取中...' : '获取模型列表');
    if (__VLS_ctx.availableModels.length > 0) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "form-group" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "form-label-row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "form-label" },
        });
        (__VLS_ctx.editingModel ? '切换模型' : '选择模型');
        if (!__VLS_ctx.editingModel) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "select-actions" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (__VLS_ctx.selectAllModels) },
                ...{ class: "btn btn-sm btn-ghost" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (__VLS_ctx.clearSelectedModels) },
                ...{ class: "btn btn-sm btn-ghost" },
            });
        }
        if (__VLS_ctx.editingModel) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "model-select-list" },
            });
            for (const [model] of __VLS_getVForSourceType((__VLS_ctx.availableModels))) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
                    key: (model),
                    ...{ class: "model-radio" },
                    ...{ class: ({ selected: __VLS_ctx.form.model === model }) },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
                    ...{ onChange: (...[$event]) => {
                            if (!(__VLS_ctx.modalVisible))
                                return;
                            if (!(__VLS_ctx.availableModels.length > 0))
                                return;
                            if (!(__VLS_ctx.editingModel))
                                return;
                            __VLS_ctx.onModelSelect(model);
                        } },
                    type: "radio",
                    value: (model),
                });
                (__VLS_ctx.form.model);
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: "model-id" },
                });
                (model);
            }
        }
        else {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "model-select-list" },
            });
            for (const [model] of __VLS_getVForSourceType((__VLS_ctx.availableModels))) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
                    key: (model),
                    ...{ class: "model-checkbox" },
                    ...{ class: ({ selected: __VLS_ctx.selectedModels.has(model) }) },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
                    ...{ onChange: (...[$event]) => {
                            if (!(__VLS_ctx.modalVisible))
                                return;
                            if (!(__VLS_ctx.availableModels.length > 0))
                                return;
                            if (!!(__VLS_ctx.editingModel))
                                return;
                            __VLS_ctx.toggleModelSelection(model);
                        } },
                    type: "checkbox",
                    checked: (__VLS_ctx.selectedModels.has(model)),
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: "model-id" },
                });
                (model);
            }
        }
        if (!__VLS_ctx.editingModel) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                ...{ class: "form-hint" },
            });
            (__VLS_ctx.selectedModels.size);
        }
    }
    if (!__VLS_ctx.availableModels.length) {
        if (__VLS_ctx.editingModel) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "form-group" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
                ...{ class: "form-label" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
                type: "text",
                ...{ class: "input" },
                value: (__VLS_ctx.form.name),
                placeholder: "如: GPT-4o",
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "form-group" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
                ...{ class: "form-label" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
                type: "text",
                ...{ class: "input" },
                value: (__VLS_ctx.form.model),
                placeholder: "如: gpt-4o",
            });
        }
        else {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "form-group" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
                ...{ class: "form-label" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "form-label-row" },
                ...{ style: {} },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "form-hint" },
                ...{ style: {} },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.textarea, __VLS_intrinsicElements.textarea)({
                ...{ class: "textarea" },
                value: (__VLS_ctx.form.manualModels),
                placeholder: "gpt-4o, gpt-4o-mini, gpt-3.5-turbo&#10;或每行一个模型名称",
                rows: "4",
            });
        }
    }
    if (__VLS_ctx.editingModel && __VLS_ctx.availableModels.length > 0) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "form-group" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "form-label" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            type: "text",
            ...{ class: "input" },
            value: (__VLS_ctx.form.name),
            placeholder: "如: GPT-4o",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "form-hint" },
        });
    }
    if (!__VLS_ctx.editingModel) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "form-group" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
            ...{ class: "form-label" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
            type: "text",
            ...{ class: "input" },
            value: (__VLS_ctx.form.namePrefix),
            placeholder: "如: OpenAI - ",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "form-hint" },
        });
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "form-group" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "form-label" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ onClick: (...[$event]) => {
                if (!(__VLS_ctx.modalVisible))
                    return;
                __VLS_ctx.form.enabled = !__VLS_ctx.form.enabled;
            } },
        ...{ class: "switch" },
        ...{ class: ({ active: __VLS_ctx.form.enabled }) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "modal-footer" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.closeModal) },
        ...{ class: "btn btn-secondary" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.saveModel) },
        ...{ class: "btn btn-primary" },
        disabled: (__VLS_ctx.saving),
    });
    (__VLS_ctx.saving ? '保存中...' : __VLS_ctx.getSubmitButtonText());
}
/** @type {__VLS_StyleScopedClasses['setting-page']} */ ;
/** @type {__VLS_StyleScopedClasses['page-header']} */ ;
/** @type {__VLS_StyleScopedClasses['description']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['model-list']} */ ;
/** @type {__VLS_StyleScopedClasses['model-card']} */ ;
/** @type {__VLS_StyleScopedClasses['model-header']} */ ;
/** @type {__VLS_StyleScopedClasses['model-info']} */ ;
/** @type {__VLS_StyleScopedClasses['model-name']} */ ;
/** @type {__VLS_StyleScopedClasses['tag']} */ ;
/** @type {__VLS_StyleScopedClasses['model-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['switch']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-ghost']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-ghost']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['model-details']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-row']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-label']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-row']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-label']} */ ;
/** @type {__VLS_StyleScopedClasses['truncate']} */ ;
/** @type {__VLS_StyleScopedClasses['empty']} */ ;
/** @type {__VLS_StyleScopedClasses['empty-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['empty-text']} */ ;
/** @type {__VLS_StyleScopedClasses['empty-hint']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-overlay']} */ ;
/** @type {__VLS_StyleScopedClasses['modal']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-lg']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-header']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-title']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-ghost']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-body']} */ ;
/** @type {__VLS_StyleScopedClasses['form-group']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['input']} */ ;
/** @type {__VLS_StyleScopedClasses['form-hint']} */ ;
/** @type {__VLS_StyleScopedClasses['form-group']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['input-row']} */ ;
/** @type {__VLS_StyleScopedClasses['input']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['spin']} */ ;
/** @type {__VLS_StyleScopedClasses['form-group']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label-row']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['select-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-ghost']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-ghost']} */ ;
/** @type {__VLS_StyleScopedClasses['model-select-list']} */ ;
/** @type {__VLS_StyleScopedClasses['model-radio']} */ ;
/** @type {__VLS_StyleScopedClasses['model-id']} */ ;
/** @type {__VLS_StyleScopedClasses['model-select-list']} */ ;
/** @type {__VLS_StyleScopedClasses['model-checkbox']} */ ;
/** @type {__VLS_StyleScopedClasses['model-id']} */ ;
/** @type {__VLS_StyleScopedClasses['form-hint']} */ ;
/** @type {__VLS_StyleScopedClasses['form-group']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['input']} */ ;
/** @type {__VLS_StyleScopedClasses['form-group']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['input']} */ ;
/** @type {__VLS_StyleScopedClasses['form-group']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label-row']} */ ;
/** @type {__VLS_StyleScopedClasses['form-hint']} */ ;
/** @type {__VLS_StyleScopedClasses['textarea']} */ ;
/** @type {__VLS_StyleScopedClasses['form-group']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['input']} */ ;
/** @type {__VLS_StyleScopedClasses['form-hint']} */ ;
/** @type {__VLS_StyleScopedClasses['form-group']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['input']} */ ;
/** @type {__VLS_StyleScopedClasses['form-hint']} */ ;
/** @type {__VLS_StyleScopedClasses['form-group']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['switch']} */ ;
/** @type {__VLS_StyleScopedClasses['modal-footer']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-primary']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            store: store,
            modalVisible: modalVisible,
            editingModel: editingModel,
            saving: saving,
            fetchingModels: fetchingModels,
            availableModels: availableModels,
            selectedModels: selectedModels,
            form: form,
            showAddModal: showAddModal,
            editModel: editModel,
            closeModal: closeModal,
            onBaseURLChange: onBaseURLChange,
            onModelSelect: onModelSelect,
            fetchModels: fetchModels,
            toggleModelSelection: toggleModelSelection,
            selectAllModels: selectAllModels,
            clearSelectedModels: clearSelectedModels,
            getSubmitButtonText: getSubmitButtonText,
            saveModel: saveModel,
            toggleModel: toggleModel,
            deleteModel: deleteModel,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
