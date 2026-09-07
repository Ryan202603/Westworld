<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { api } from '../api'
import type { Project } from '../types'

const emit = defineEmits<{
  (e: 'open', id: string): void
  (e: 'create'): void
}>()

const projects = ref<Project[]>([])
const loading = ref(true)
const error = ref('')

async function load() {
  loading.value = true
  error.value = ''
  try {
    projects.value = await api.listProjects()
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    loading.value = false
  }
}

async function remove(p: Project) {
  if (!window.confirm(`确定删除《${p.title}》? 其分镜与任务记录会一并删除。`)) return
  try {
    await api.deleteProject(p.id)
    await load()
  } catch (e) {
    error.value = (e as Error).message
  }
}

onMounted(load)

function fmt(iso: string) {
  return new Date(iso).toLocaleString('zh-CN', { hour12: false })
}
</script>

<template>
  <section>
    <div class="head">
      <h2>作品库</h2>
      <button class="primary" @click="emit('create')">＋ 导入新书</button>
    </div>

    <p v-if="loading" class="dim">加载中…</p>
    <p v-if="error" class="err">加载失败: {{ error }}</p>
    <p v-if="!loading && !projects.length" class="empty">
      还没有作品。点击「导入新书」，粘贴一段小说或上传 .txt，即可体验最小闭环。
    </p>

    <div v-else class="grid">
      <article v-for="p in projects" :key="p.id" class="card" @click="emit('open', p.id)">
        <div class="row">
          <h3>{{ p.title }}</h3>
          <span class="badge">{{ p.chapters.length }} 章</span>
        </div>
        <p class="preview dim">{{ p.content.slice(0, 160) }}…</p>
        <div class="row foot">
          <span class="dim">{{ fmt(p.createdAt) }}</span>
          <div class="ops">
            <button @click.stop="emit('open', p.id)">打开</button>
            <button class="danger" @click.stop="remove(p)">删除</button>
          </div>
        </div>
      </article>
    </div>
  </section>
</template>

<style scoped>
.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

h2 {
  margin: 0;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

article {
  cursor: pointer;
  transition: 0.15s;
}

article:hover {
  border-color: var(--accent);
  transform: translateY(-2px);
}

.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

h3 {
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.preview {
  height: 40px;
  overflow: hidden;
  margin: 8px 0 12px;
  line-height: 1.5;
}

.foot {
  align-items: flex-end;
}

.ops {
  display: flex;
  gap: 8px;
}

button.danger {
  color: var(--danger);
}

button.danger:hover {
  border-color: var(--danger);
  color: var(--danger);
}

.empty {
  text-align: center;
  padding: 60px 0;
  color: var(--text-dim);
  border: 1px dashed var(--border);
  border-radius: 12px;
}

.err {
  color: var(--danger);
}
</style>
