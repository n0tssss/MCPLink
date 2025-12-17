import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { api } from '@/api'
import type { Model, MCPServer, Conversation, Settings, MCPTool } from '@/api/types'

export const useAppStore = defineStore('app', () => {
  // 状态
  const models = ref<Model[]>([])
  const mcpServers = ref<MCPServer[]>([])
  const conversations = ref<Conversation[]>([])
  const settings = ref<Settings>({})
  const currentConversationId = ref<string | null>(null)
  const currentModelId = ref<string | null>(null)
  const serverUrl = ref(localStorage.getItem('serverUrl') || 'http://localhost:3000')
  const isConnected = ref(false)
  const sidebarOpen = ref(true)
  const theme = ref<'light' | 'dark'>(
    (localStorage.getItem('theme') as 'light' | 'dark') || 
    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
  )
  
  // 工具相关状态
  const allTools = ref<MCPTool[]>([])
  const selectedToolNames = ref<string[]>([]) // 选中的工具名称列表，空表示全选

  // 监听主题变化并应用
  watch(theme, (newTheme) => {
    document.documentElement.setAttribute('data-theme', newTheme)
    localStorage.setItem('theme', newTheme)
  }, { immediate: true })

  // 计算属性
  const enabledModels = computed(() => models.value.filter(m => m.enabled))
  const currentModel = computed(() => models.value.find(m => m.id === currentModelId.value))
  const currentConversation = computed(() => 
    conversations.value.find(c => c.id === currentConversationId.value)
  )
  
  // 启用的 MCP 服务器
  const enabledMCPServers = computed(() => mcpServers.value.filter(s => s.enabled))
  
  // 可用的工具（来自启用的 MCP 服务器）
  const availableTools = computed(() => {
    const tools: MCPTool[] = []
    for (const server of enabledMCPServers.value) {
      if (server.tools) {
        tools.push(...server.tools)
      }
    }
    return tools
  })
  
  // 当前选中的工具（空数组表示全选）
  const activeTools = computed(() => {
    if (selectedToolNames.value.length === 0) {
      return availableTools.value.map(t => t.name)
    }
    return selectedToolNames.value
  })
  
  // 是否全选工具
  const isAllToolsSelected = computed(() => {
    return selectedToolNames.value.length === 0 || 
      selectedToolNames.value.length === availableTools.value.length
  })

  // 模型相关
  async function fetchModels() {
    try {
      const data = await api.getModels()
      models.value = data.models
      // 如果没有选择模型，选择第一个启用的
      if (!currentModelId.value && enabledModels.value.length > 0) {
        currentModelId.value = enabledModels.value[0].id
      }
    } catch (error) {
      console.error('Failed to fetch models:', error)
    }
  }

  function setCurrentModel(id: string) {
    currentModelId.value = id
  }

  // MCP 服务器相关
  async function fetchMCPServers() {
    try {
      const data = await api.getMCPServers()
      mcpServers.value = data.servers
      // 刷新可用工具列表
      await fetchAllTools()
    } catch (error) {
      console.error('Failed to fetch MCP servers:', error)
    }
  }
  
  // 获取所有可用工具
  async function fetchAllTools() {
    try {
      const data = await api.getAllTools()
      allTools.value = data.tools
    } catch (error) {
      console.error('Failed to fetch tools:', error)
      allTools.value = []
    }
  }
  
  // 选择/取消选择工具
  function toggleTool(toolName: string) {
    const index = selectedToolNames.value.indexOf(toolName)
    if (index === -1) {
      // 如果当前是全选状态，先设置为只选中这个工具之外的所有工具
      if (selectedToolNames.value.length === 0) {
        selectedToolNames.value = availableTools.value
          .map(t => t.name)
          .filter(n => n !== toolName)
      } else {
        selectedToolNames.value.push(toolName)
      }
    } else {
      selectedToolNames.value.splice(index, 1)
    }
  }
  
  // 全选/取消全选工具
  function toggleAllTools() {
    if (isAllToolsSelected.value) {
      selectedToolNames.value = []
    } else {
      selectedToolNames.value = []
    }
  }
  
  // 设置选中的工具
  function setSelectedTools(toolNames: string[]) {
    selectedToolNames.value = toolNames
  }
  
  // 清空选中（恢复全选）
  function clearSelectedTools() {
    selectedToolNames.value = []
  }

  // 会话相关
  async function fetchConversations() {
    try {
      const data = await api.getConversations()
      conversations.value = data.conversations
    } catch (error) {
      console.error('Failed to fetch conversations:', error)
    }
  }

  async function createConversation() {
    const data = await api.createConversation({
      title: '新对话',
      modelId: currentModelId.value || undefined,
    })
    conversations.value.unshift(data.conversation)
    currentConversationId.value = data.conversation.id
    return data.conversation
  }

  async function deleteConversation(id: string) {
    await api.deleteConversation(id)
    conversations.value = conversations.value.filter(c => c.id !== id)
    if (currentConversationId.value === id) {
      currentConversationId.value = conversations.value[0]?.id || null
    }
  }

  function setCurrentConversation(id: string | null) {
    currentConversationId.value = id
  }

  // 设置相关
  async function fetchSettings() {
    try {
      const data = await api.getSettings()
      settings.value = data.settings
    } catch (error) {
      console.error('Failed to fetch settings:', error)
    }
  }

  // 服务连接
  function setServerUrl(url: string) {
    serverUrl.value = url
    localStorage.setItem('serverUrl', url)
    api.setBaseUrl(url)
  }

  async function checkConnection() {
    try {
      await api.healthCheck()
      isConnected.value = true
      return true
    } catch {
      isConnected.value = false
      return false
    }
  }

  // 侧边栏
  function toggleSidebar() {
    sidebarOpen.value = !sidebarOpen.value
  }

  // 主题切换
  function toggleTheme() {
    theme.value = theme.value === 'dark' ? 'light' : 'dark'
  }

  function setTheme(newTheme: 'light' | 'dark') {
    theme.value = newTheme
  }

  // 初始化
  async function initialize() {
    api.setBaseUrl(serverUrl.value)
    
    const connected = await checkConnection()
    if (connected) {
      await Promise.all([
        fetchModels(),
        fetchMCPServers(),
        fetchConversations(),
        fetchSettings(),
      ])
    }
  }

  return {
    // 状态
    models,
    mcpServers,
    conversations,
    settings,
    currentConversationId,
    currentModelId,
    serverUrl,
    isConnected,
    sidebarOpen,
    theme,
    allTools,
    selectedToolNames,
    
    // 计算属性
    enabledModels,
    currentModel,
    currentConversation,
    enabledMCPServers,
    availableTools,
    activeTools,
    isAllToolsSelected,
    
    // 方法
    fetchModels,
    setCurrentModel,
    fetchMCPServers,
    fetchAllTools,
    toggleTool,
    toggleAllTools,
    setSelectedTools,
    clearSelectedTools,
    fetchConversations,
    createConversation,
    deleteConversation,
    setCurrentConversation,
    fetchSettings,
    setServerUrl,
    checkConnection,
    toggleSidebar,
    toggleTheme,
    setTheme,
    initialize,
  }
})
