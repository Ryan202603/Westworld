<script setup lang="ts">
import { ref } from 'vue'
import { api } from '../api'
import type { Project } from '../types'

const emit = defineEmits<{
  (e: 'created', p: Project): void
  (e: 'cancel'): void
}>()

const title = ref('')
const content = ref('')
const submitting = ref(false)
const error = ref('')

function onPickFile(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    content.value = String(reader.result ?? '')
    if (!title.value) title.value = file.name.replace(/\.(txt|md|epub|pdf)$/i, '')
  }
  reader.readAsText(file, 'utf-8')
  input.value = ''
}

async function submit() {
  if (!content.value.trim()) {
    error.value = '请先粘贴文本或上传 .txt 文件'
    return
  }
  submitting.value = true
  error.value = ''
  try {
    const project = await api.createProject({ title: title.value.trim(), content: content.value })
    emit('created', project)
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <section class="card form">
    <h2>导入书籍 / 文本</h2>
    <p class="dim">
      后端会自动拆分章节。MVP 为离线 mock 模式；配好
      <code>LLM_API_KEY</code>
      后同一流程走真实大模型出分镜。
    </p>

    <label>作品标题(留空自动取名)</label>
    <input v-model="title" placeholder="例如: 西部世界的黎明" />

    <div class="file-row">
      <label class="dim">正文(粘贴 或 上传 .txt)</label>
      <label class="upload">
        选择 .txt 文件
        <input type="file" accept=".txt,text/plain" @change="onPickFile" />
      </label>
    </div>
    <textarea v-model="content" rows="16" placeholder="把小说 / 剧本文本粘贴到这里……"></textarea>

    <p class="dim count">共 {{ content.length }} 字</p>
    <p v-if="error" class="err">{{ error }}</p>

    <div class="actions">
      <button @click="emit('cancel')">取消</button>
      <button class="primary" :disabled="submitting" @click="submit">
        {{ submitting ? '导入中…' : '导入并拆章' }}
      </button>
    </div>
  </section>
</template>

<style scoped>
.form {
  max-width: 720px;
  margin: 0 auto;
}

h2 {
  margin: 0 0 6px;
}

label {
  display: block;
  margin: 16px 0 6px;
  font-weight: 600;
}

.file-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.upload {
  font-weight: 400;
  cursor: pointer;
  color: var(--accent);
}

.upload input {
  display: none;
}

textarea {
  width: 100%;
  resize: vertical;
  line-height: 1.7;
}

.count {
  text-align: right;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 8px;
}

.err {
  color: var(--danger);
}

code {
  background: var(--bg);
  padding: 1px 5px;
  border-radius: 5px;
}
</style>
