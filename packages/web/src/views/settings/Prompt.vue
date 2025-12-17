<template>
  <div class="setting-page">
    <div class="page-header">
      <div>
        <h2>系统提示词</h2>
        <p class="description">配置 AI 的系统提示词，指导 AI 如何理解和执行任务。</p>
      </div>
    </div>

    <div class="card">
      <div class="form-group">
        <label class="form-label">系统提示词</label>
        <textarea
          class="textarea"
          v-model="systemPrompt"
          placeholder="输入系统提示词..."
          rows="10"
        ></textarea>
      </div>

      <div class="form-group">
        <label class="form-label">最大迭代次数</label>
        <div class="input-inline">
          <input
            type="number"
            class="input"
            v-model.number="maxIterations"
            min="1"
            max="50"
            style="width: 100px"
          />
          <span class="input-suffix">次</span>
        </div>
        <p class="form-hint">AI 执行工具调用的最大循环次数，防止无限循环（建议 5-20）</p>
      </div>

      <div class="form-actions">
        <button class="btn btn-primary" @click="saveSettings" :disabled="saving">
          {{ saving ? '保存中...' : '保存' }}
        </button>
        <button class="btn btn-secondary" @click="resetToDefault">重置为默认</button>
      </div>
    </div>

    <div class="section">
      <h3>默认提示词参考</h3>
      <p class="section-desc">点击「重置为默认」可应用以下提示词</p>
      <div class="default-prompt-card">
        <pre>{{ defaultPrompt }}</pre>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAppStore } from '@/stores/app'
import { api } from '@/api'
import { toast } from '@/composables/useToast'

const store = useAppStore()
const saving = ref(false)
const systemPrompt = ref('')
const maxIterations = ref(10)

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
- 完成所有步骤后，用清晰的语言总结执行结果`

onMounted(() => {
  systemPrompt.value = store.settings.systemPrompt || ''
  maxIterations.value = store.settings.maxIterations || 10
})

async function saveSettings() {
  saving.value = true
  try {
    await api.updateSettings({
      systemPrompt: systemPrompt.value,
      maxIterations: maxIterations.value,
    })
    toast.success('保存成功')
    store.fetchSettings()
  } catch (error) {
    toast.error('保存失败')
  } finally {
    saving.value = false
  }
}

function resetToDefault() {
  systemPrompt.value = defaultPrompt
  toast.info('已重置为默认提示词，请点击保存')
}
</script>

<style scoped>
.setting-page {
  width: 100%;
}

.page-header {
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

.card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: 24px;
  margin-bottom: 40px;
}

.input-inline {
  display: flex;
  align-items: center;
  gap: 8px;
}

.input-suffix {
  color: var(--text-tertiary);
  font-size: 14px;
}

.form-actions {
  display: flex;
  gap: 12px;
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid var(--border-light);
}

.section {
  margin-bottom: 32px;
}

.section h3 {
  margin-bottom: 6px;
  font-size: 16px;
  font-weight: 600;
}

.section-desc {
  color: var(--text-tertiary);
  font-size: 13px;
  margin-bottom: 16px;
}

.default-prompt-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: 20px;
}

.default-prompt-card pre {
  white-space: pre-wrap;
  font-size: 13px;
  color: var(--text-secondary);
  margin: 0;
  font-family: inherit;
  line-height: 1.6;
}
</style>
