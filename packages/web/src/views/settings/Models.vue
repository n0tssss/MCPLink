<template>
  <div class="setting-page">
    <div class="page-header">
      <div>
        <h2>模型管理</h2>
        <p class="description">配置 AI 模型，支持任何 OpenAI 兼容的 API 接口。</p>
      </div>
      <button class="btn btn-primary" @click="showAddModal">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
        添加模型
      </button>
    </div>

    <div class="model-list" v-if="store.models.length > 0">
      <div v-for="model in store.models" :key="model.id" class="model-card">
        <div class="model-header">
          <div class="model-info">
            <span class="model-name">🤖 {{ model.name }}</span>
            <span class="tag" :class="model.enabled ? 'tag-success' : ''">
              {{ model.enabled ? '已启用' : '已停用' }}
            </span>
          </div>
          <div class="model-actions">
            <div
              class="switch"
              :class="{ active: model.enabled }"
              @click="toggleModel(model.id)"
            ></div>
            <button class="btn btn-ghost btn-icon" @click="editModel(model)" title="编辑">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </button>
            <button class="btn btn-ghost btn-icon" @click="deleteModel(model.id)" title="删除">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
        </div>
        <div class="model-details">
          <div class="detail-row">
            <span class="detail-label">模型</span>
            <span>{{ model.model }}</span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Base URL</span>
            <span class="truncate">{{ model.baseURL }}</span>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="empty">
      <div class="empty-icon">🤖</div>
      <p class="empty-text">暂无模型配置</p>
      <p class="empty-hint">点击上方「添加模型」按钮开始配置</p>
    </div>

    <!-- 添加/编辑模态框 -->
    <div v-if="modalVisible" class="modal-overlay" @click.self="closeModal">
      <div class="modal modal-lg">
        <div class="modal-header">
          <span class="modal-title">{{ editingModel ? '编辑模型' : '添加模型' }}</span>
          <button class="btn btn-ghost btn-icon" @click="closeModal">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">Base URL *</label>
            <input 
              type="text" 
              class="input" 
              v-model="form.baseURL" 
              placeholder="如: https://api.openai.com/v1"
              @blur="onBaseURLChange"
            />
            <p class="form-hint">填写 OpenAI 兼容的 API 地址（代理地址）</p>
          </div>
          
          <div class="form-group">
            <label class="form-label">API Key</label>
            <div class="input-row">
              <input 
                type="text" 
                class="input" 
                v-model="form.apiKey" 
                placeholder="sk-..."
              />
              <button 
                class="btn btn-secondary" 
                @click="fetchModels"
                :disabled="fetchingModels || !form.baseURL"
              >
                <svg v-if="fetchingModels" class="spin" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="12" y1="2" x2="12" y2="6"></line>
                  <line x1="12" y1="18" x2="12" y2="22"></line>
                  <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
                  <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
                  <line x1="2" y1="12" x2="6" y2="12"></line>
                  <line x1="18" y1="12" x2="22" y2="12"></line>
                  <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
                  <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
                </svg>
                {{ fetchingModels ? '获取中...' : '获取模型列表' }}
              </button>
            </div>
          </div>

          <!-- 模型列表选择（远程获取到时显示） -->
          <div v-if="availableModels.length > 0" class="form-group">
            <div class="form-label-row">
              <label class="form-label">{{ editingModel ? '切换模型' : '选择模型' }}</label>
              <div class="select-actions" v-if="!editingModel">
                <button class="btn btn-sm btn-ghost" @click="selectAllModels">全选</button>
                <button class="btn btn-sm btn-ghost" @click="clearSelectedModels">清空</button>
              </div>
            </div>
            
            <!-- 编辑模式：单选 -->
            <div v-if="editingModel" class="model-select-list">
              <label 
                v-for="model in availableModels" 
                :key="model" 
                class="model-radio"
                :class="{ selected: form.model === model }"
              >
                <input 
                  type="radio" 
                  :value="model"
                  v-model="form.model"
                  @change="onModelSelect(model)"
                />
                <span class="model-id">{{ model }}</span>
              </label>
            </div>
            
            <!-- 新增模式：多选 -->
            <div v-else class="model-select-list">
              <label 
                v-for="model in availableModels" 
                :key="model" 
                class="model-checkbox"
                :class="{ selected: selectedModels.has(model) }"
              >
                <input 
                  type="checkbox" 
                  :checked="selectedModels.has(model)"
                  @change="toggleModelSelection(model)"
                />
                <span class="model-id">{{ model }}</span>
              </label>
            </div>
            <p class="form-hint" v-if="!editingModel">已选择 {{ selectedModels.size }} 个模型</p>
          </div>

          <!-- 无法获取模型列表时或编辑模式，手动输入 -->
          <template v-if="!availableModels.length">
            <!-- 编辑模式 -->
            <template v-if="editingModel">
              <div class="form-group">
                <label class="form-label">名称 *</label>
                <input type="text" class="input" v-model="form.name" placeholder="如: GPT-4o" />
              </div>
              <div class="form-group">
                <label class="form-label">模型 *</label>
                <input type="text" class="input" v-model="form.model" placeholder="如: gpt-4o" />
              </div>
            </template>
            
            <!-- 新增模式 -->
            <template v-else>
              <div class="form-group">
                <label class="form-label">模型名称 *</label>
                <div class="form-label-row" style="margin-bottom: 8px;">
                  <span class="form-hint" style="margin: 0;">手动输入模型名称，多个模型用逗号或换行分隔</span>
                </div>
                <textarea 
                  class="textarea" 
                  v-model="form.manualModels" 
                  placeholder="gpt-4o, gpt-4o-mini, gpt-3.5-turbo&#10;或每行一个模型名称"
                  rows="4"
                ></textarea>
              </div>
            </template>
          </template>

          <!-- 编辑模式下显示名称输入（选择模型列表时） -->
          <div v-if="editingModel && availableModels.length > 0" class="form-group">
            <label class="form-label">显示名称</label>
            <input type="text" class="input" v-model="form.name" placeholder="如: GPT-4o" />
            <p class="form-hint">留空则使用模型 ID 作为名称</p>
          </div>

          <!-- 名称前缀（仅新增模式） -->
          <div v-if="!editingModel" class="form-group">
            <label class="form-label">名称前缀（可选）</label>
            <input type="text" class="input" v-model="form.namePrefix" placeholder="如: OpenAI - " />
            <p class="form-hint">为批量添加的模型名称添加前缀，便于区分</p>
          </div>

          <div class="form-group">
            <label class="form-label">启用</label>
            <div
              class="switch"
              :class="{ active: form.enabled }"
              @click="form.enabled = !form.enabled"
            ></div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="closeModal">取消</button>
          <button class="btn btn-primary" @click="saveModel" :disabled="saving">
            {{ saving ? '保存中...' : getSubmitButtonText() }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useAppStore } from '@/stores/app'
import { api } from '@/api'
import { toast } from '@/composables/useToast'
import type { Model } from '@/api/types'

const store = useAppStore()
const modalVisible = ref(false)
const editingModel = ref<Model | null>(null)
const saving = ref(false)
const fetchingModels = ref(false)
const availableModels = ref<string[]>([])
const selectedModels = ref(new Set<string>())

const form = reactive({
  name: '',
  model: '',
  baseURL: '',
  apiKey: '',
  enabled: true,
  manualModels: '',
  namePrefix: '',
})

function showAddModal() {
  editingModel.value = null
  form.name = ''
  form.model = ''
  form.baseURL = ''
  form.apiKey = ''
  form.enabled = true
  form.manualModels = ''
  form.namePrefix = ''
  availableModels.value = []
  selectedModels.value.clear()
  modalVisible.value = true
}

function editModel(model: Model) {
  editingModel.value = model
  form.name = model.name
  form.model = model.model
  form.baseURL = model.baseURL
  form.apiKey = model.apiKey || ''
  form.enabled = model.enabled
  form.manualModels = ''
  form.namePrefix = ''
  availableModels.value = []
  selectedModels.value.clear()
  modalVisible.value = true
}

function closeModal() {
  modalVisible.value = false
}

function onBaseURLChange() {
  // 当 URL 变化时清空模型列表
  availableModels.value = []
  selectedModels.value.clear()
}

function onModelSelect(model: string) {
  // 编辑模式下选择模型时，如果名称是旧模型名，则更新为新模型名
  if (editingModel.value && (form.name === editingModel.value.model || form.name === form.model)) {
    form.name = model
  }
  form.model = model
}

async function fetchModels() {
  if (!form.baseURL) {
    toast.warning('请先填写 Base URL')
    return
  }

  fetchingModels.value = true
  availableModels.value = []
  selectedModels.value.clear()

  try {
    const result = await api.fetchRemoteModels(form.baseURL, form.apiKey)
    
    if (result.models && result.models.length > 0) {
      availableModels.value = result.models.sort()
      
      if (editingModel.value) {
        // 编辑模式：如果当前模型在列表中，保持选中
        if (!result.models.includes(form.model)) {
          // 当前模型不在列表中，提示用户
          toast.info('当前模型不在远程列表中，可以选择新模型')
        }
      } else {
        // 新增模式：默认选中常用模型
        const commonModels = ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo', 'claude-3-5-sonnet-20241022']
        for (const m of result.models) {
          if (commonModels.some(c => m.toLowerCase().includes(c.toLowerCase()))) {
            selectedModels.value.add(m)
          }
        }
      }
      toast.success(`获取到 ${result.models.length} 个模型`)
    } else {
      toast.warning('未获取到模型列表，请手动输入模型名称')
    }
  } catch (error: any) {
    console.error('获取模型列表失败:', error)
    toast.error(`获取模型列表失败: ${error.response?.data?.error || error.message || '未知错误'}`)
  } finally {
    fetchingModels.value = false
  }
}

function toggleModelSelection(model: string) {
  if (selectedModels.value.has(model)) {
    selectedModels.value.delete(model)
  } else {
    selectedModels.value.add(model)
  }
}

function selectAllModels() {
  for (const model of availableModels.value) {
    selectedModels.value.add(model)
  }
}

function clearSelectedModels() {
  selectedModels.value.clear()
}

function getModelsToAdd(): string[] {
  if (availableModels.value.length > 0) {
    return Array.from(selectedModels.value)
  } else {
    // 从手动输入中解析模型名称
    return form.manualModels
      .split(/[,\n]/)
      .map(m => m.trim())
      .filter(m => m.length > 0)
  }
}

function getSubmitButtonText(): string {
  if (editingModel.value) {
    return '保存'
  }
  const count = getModelsToAdd().length
  return count > 0 ? `添加 ${count} 个模型` : '添加模型'
}

async function saveModel() {
  // 编辑模式
  if (editingModel.value) {
    if (!form.model || !form.baseURL) {
      toast.warning('请填写必填项')
      return
    }

    saving.value = true

    try {
      await api.updateModel(editingModel.value.id, {
        name: form.name || form.model,
        model: form.model,
        baseURL: form.baseURL,
        apiKey: form.apiKey,
        enabled: form.enabled,
      })
      toast.success('保存成功')
      closeModal()
      store.fetchModels()
    } catch (error) {
      toast.error('操作失败')
    } finally {
      saving.value = false
    }
    return
  }

  // 新增模式
  const modelsToAdd = getModelsToAdd()
  
  if (modelsToAdd.length === 0) {
    toast.warning('请选择或输入至少一个模型')
    return
  }

  if (!form.baseURL) {
    toast.warning('请填写 Base URL')
    return
  }

  saving.value = true

  try {
    // 批量添加模型
    for (const modelId of modelsToAdd) {
      const displayName = form.namePrefix ? `${form.namePrefix}${modelId}` : modelId
      
      await api.createModel({
        name: displayName,
        model: modelId,
        baseURL: form.baseURL,
        apiKey: form.apiKey,
        enabled: true,
      })
    }

    closeModal()
    store.fetchModels()
    toast.success(`成功添加 ${modelsToAdd.length} 个模型`)
  } catch (error) {
    toast.error('操作失败')
  } finally {
    saving.value = false
  }
}

async function toggleModel(id: string) {
  try {
    await api.toggleModel(id)
    store.fetchModels()
  } catch (error) {
    toast.error('操作失败')
  }
}

async function deleteModel(id: string) {
  if (!confirm('确定要删除这个模型吗？')) return
  
  try {
    await api.deleteModel(id)
    toast.success('删除成功')
    store.fetchModels()
  } catch (error) {
    toast.error('删除失败')
  }
}
</script>

<style scoped>
.setting-page {
  width: 100%;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 32px;
}

.page-header h2 {
  margin-bottom: 6px;
  font-size: 22px;
  font-weight: 600;
}

.description {
  color: var(--text-secondary);
  font-size: 14px;
}

.model-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.model-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: 20px;
}

.model-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.model-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.model-name {
  font-size: 16px;
  font-weight: 600;
}

.model-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.model-details {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 16px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-md);
}

.detail-row {
  display: flex;
  gap: 16px;
  font-size: 13px;
}

.detail-label {
  color: var(--text-tertiary);
  min-width: 70px;
}

.truncate {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.empty {
  text-align: center;
  padding: 80px 20px;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 20px;
}

.empty-text {
  color: var(--text-secondary);
  font-size: 16px;
  margin-bottom: 8px;
}

.empty-hint {
  color: var(--text-tertiary);
  font-size: 14px;
}

/* 模型选择列表 */
.form-label-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.form-label-row .form-label {
  margin-bottom: 0;
}

.select-actions {
  display: flex;
  gap: 8px;
}

.input-row {
  display: flex;
  gap: 12px;
}

.input-row .input {
  flex: 1;
}

.model-select-list {
  max-height: 280px;
  overflow-y: auto;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.model-checkbox,
.model-radio {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background var(--transition-fast);
}

.model-checkbox:hover,
.model-radio:hover {
  background: var(--bg-hover);
}

.model-checkbox.selected,
.model-radio.selected {
  background: rgba(16, 163, 127, 0.1);
}

.model-checkbox input,
.model-radio input {
  accent-color: var(--accent-color);
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.model-id {
  font-family: 'SF Mono', Monaco, Consolas, monospace;
  font-size: 13px;
  color: var(--text-primary);
}

.modal-lg {
  max-width: 600px;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
