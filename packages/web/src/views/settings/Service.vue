<template>
  <div class="setting-page">
    <div class="page-header">
      <div>
        <h2>服务配置</h2>
        <p class="description">配置后端服务地址，你可以本地部署后端服务，然后将地址改为本地地址。</p>
      </div>
    </div>

    <div class="card">
      <div class="form-group">
        <label class="form-label">服务地址</label>
        <div class="input-row">
          <input
            type="text"
            class="input"
            v-model="serverUrl"
            placeholder="http://localhost:3000"
          />
          <button class="btn btn-secondary" @click="testConnection" :disabled="testing">
            {{ testing ? '测试中...' : '测试连接' }}
          </button>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">连接状态</label>
        <span class="tag" :class="store.isConnected ? 'tag-success' : 'tag-error'">
          {{ store.isConnected ? '已连接' : '未连接' }}
        </span>
      </div>

      <div class="form-actions">
        <button class="btn btn-primary" @click="saveSettings">保存配置</button>
      </div>
    </div>

    <div class="section">
      <h3>快速配置</h3>
      <p class="section-desc">点击选择预设的服务地址</p>
      <div class="quick-list">
        <div
          v-for="config in quickConfigs"
          :key="config.url"
          class="quick-item"
          :class="{ active: serverUrl === config.url }"
          @click="selectConfig(config)"
        >
          <span class="quick-name">{{ config.name }}</span>
          <span class="quick-url">{{ config.url }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAppStore } from '@/stores/app'
import { toast } from '@/composables/useToast'

const store = useAppStore()
const testing = ref(false)
const serverUrl = ref('')

const quickConfigs = [
  { name: '本地开发', url: 'http://localhost:3000' },
  { name: '本地 (127.0.0.1)', url: 'http://127.0.0.1:3000' },
]

onMounted(() => {
  serverUrl.value = store.serverUrl
})

async function testConnection() {
  testing.value = true
  store.setServerUrl(serverUrl.value)
  const connected = await store.checkConnection()
  testing.value = false

  if (connected) {
    toast.success('连接成功')
  } else {
    toast.error('连接失败，请检查服务地址')
  }
}

async function saveSettings() {
  store.setServerUrl(serverUrl.value)
  const connected = await store.checkConnection()
  
  if (connected) {
    toast.success('保存成功')
    store.initialize()
  } else {
    toast.warning('配置已保存，但无法连接到服务')
  }
}

function selectConfig(config: { name: string; url: string }) {
  serverUrl.value = config.url
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

.input-row {
  display: flex;
  gap: 12px;
}

.input-row .input {
  flex: 1;
}

.form-actions {
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

.quick-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
}

.quick-item {
  padding: 16px 20px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.quick-item:hover {
  border-color: var(--accent-color);
}

.quick-item.active {
  border-color: var(--accent-color);
  background: rgba(16, 163, 127, 0.1);
}

.quick-name {
  display: block;
  font-weight: 500;
  margin-bottom: 4px;
}

.quick-url {
  font-size: 12px;
  color: var(--text-tertiary);
  font-family: 'SF Mono', Monaco, Consolas, monospace;
}
</style>
