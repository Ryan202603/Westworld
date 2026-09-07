<script setup lang="ts">
import { ref, shallowRef, markRaw, type Component } from 'vue'
import ProjectListView from './views/ProjectListView.vue'
import CreateProjectView from './views/CreateProjectView.vue'
import ProjectDetailView from './views/ProjectDetailView.vue'
import type { Project } from './types'

type ViewName = 'list' | 'create' | 'detail'

const view = ref<ViewName>('list')
const currentView = shallowRef<Component>(markRaw(ProjectListView))
const selectedId = ref('')
const listKey = ref(0)

function go(viewName: ViewName) {
  view.value = viewName
  if (viewName === 'list') listKey.value++
  currentView.value = markRaw(
    viewName === 'create' ? CreateProjectView : viewName === 'detail' ? ProjectDetailView : ProjectListView
  )
}

function openProject(id: string) {
  selectedId.value = id
  go('detail')
}

function onCreated(p: Project) {
  openProject(p.id)
}
</script>

<template>
  <header class="topbar">
    <div class="brand" @click="go('list')">
      <span class="logo">W</span>
      <div>
        <h1>Westworld</h1>
        <p class="dim">把书变成漫画 · 文本 → 分镜 → 漫画格</p>
      </div>
    </div>
    <nav>
      <button :class="{ active: view === 'list' }" @click="go('list')">作品库</button>
      <button class="primary" @click="go('create')">＋ 新建作品</button>
    </nav>
  </header>

  <main>
    <component :is="currentView" v-if="view === 'list'" :key="listKey" @open="openProject" @create="go('create')" />
    <component :is="currentView" v-else-if="view === 'create'" @created="onCreated" @cancel="go('list')" />
    <component
      :is="currentView"
      v-else-if="view === 'detail'"
      :key="selectedId"
      :project-id="selectedId"
      @back="go('list')"
    />
  </main>
</template>

<style scoped>
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 28px;
  border-bottom: 1px solid var(--border);
  background: var(--bg-soft);
  position: sticky;
  top: 0;
  z-index: 10;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  user-select: none;
}

.logo {
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  background: radial-gradient(circle at 30% 30%, #f4c66a, #b97f2a);
  color: #201408;
  font-weight: 800;
  font-size: 24px;
  border-radius: 12px;
  box-shadow: 0 0 18px rgba(230, 179, 90, 0.35);
}

h1 {
  margin: 0;
  font-size: 20px;
  letter-spacing: 2px;
}

p {
  margin: 0;
}

nav {
  display: flex;
  gap: 10px;
}

button.active {
  border-color: var(--accent);
  color: var(--accent);
}

main {
  flex: 1;
  width: 100%;
  max-width: 1080px;
  margin: 0 auto;
  padding: 24px 20px 60px;
}
</style>
