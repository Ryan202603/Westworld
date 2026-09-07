<script setup lang="ts">
import { onMounted, onUnmounted, reactive, ref } from 'vue';
import { api } from '../api';
import type { Chapter, Panel, Project, StoryboardResult } from '../types';

const props = defineProps<{ projectId: string }>();
const emit = defineEmits<{ (e: 'back'): void }>();

const project = ref<Project | null>(null);
const loadError = ref('');

/** 各章节最近一次成功结果 */
const results = reactive<Record<string, StoryboardResult>>({});
/** 各章节正在跑的任务 */
const running = reactive<Record<string, { jobId: string; status: string }>>({});
/** 各章节最近错误 */
const errors = reactive<Record<string, string>>({});
/** 章节正文展开开关 */
const expanded = reactive<Record<string, boolean>>({});

const pollers: number[] = [];

async function load() {
  loadError.value = '';
  try {
    project.value = await api.getProject(props.projectId);
  } catch (e) {
    loadError.value = (e as Error).message;
    return;
  }
  // 页面刷新后恢复各章节的旧成果(忽略失败, 没有就为空)
  await Promise.allSettled(
    project.value.chapters.map(async (c) => {
      try {
        results[c.id] = await api.latestStoryboard(props.projectId, c.id);
      } catch {
        /* 尚无结果 */
      }
    }),
  );
}

async function generate(chapter: Chapter) {
  if (running[chapter.id]) return; // 已有一个在跑
  errors[chapter.id] = '';
  try {
    const res = await api.generate(props.projectId, chapter.id);
    running[chapter.id] = { jobId: res.jobId, status: 'pending' };
    pollChapter(props.projectId, chapter.id, res.jobId);
  } catch (e) {
    errors[chapter.id] = (e as Error).message;
  }
}

function pollChapter(projectId: string, chapterId: string, jobId: string) {
  const timer = window.setInterval(async () => {
    if (!running[chapterId] || running[chapterId].jobId !== jobId) {
      window.clearInterval(timer);
      return;
    }
    try {
      const job = await api.getJob(projectId, jobId);
      running[chapterId] = { jobId, status: job.status };
      if (job.status === 'done') {
        if (job.result) results[chapterId] = job.result;
        delete running[chapterId];
        window.clearInterval(timer);
      } else if (job.status === 'error') {
        errors[chapterId] = job.error ?? '生成失败';
        delete running[chapterId];
        window.clearInterval(timer);
      }
    } catch (e) {
      errors[chapterId] = (e as Error).message;
      delete running[chapterId];
      window.clearInterval(timer);
    }
  }, 1200);
  pollers.push(timer);
}

function imageFor(panel: Panel, result: StoryboardResult): string | undefined {
  return result.images.find((im) => im.panel === panel.panel)?.imageDataUri;
}

function fmt(iso: string) {
  return new Date(iso).toLocaleString('zh-CN', { hour12: false });
}

onMounted(load);
onUnmounted(() => pollers.forEach((t) => window.clearInterval(t)));
</script>

<template>
  <div>
    <div v-if="loadError" class="err">加载失败: {{ loadError }}</div>

    <template v-if="project">
      <div class="bar">
        <button @click="emit('back')">← 返回作品库</button>
        <h2>{{ project.title }}</h2>
        <span class="badge">{{ project.chapters.length }} 章 · {{ project.content.length }} 字</span>
      </div>

      <section v-for="ch in project.chapters" :key="ch.id" class="card chapter">
        <div class="ch-head">
          <div class="ch-title">
            <span class="idx">{{ ch.index }}</span>
            <strong>{{ ch.title }}</strong>
            <span v-if="results[ch.id]" class="badge" :class="results[ch.id].source === 'llm' ? 'llm' : 'local'">
              {{ results[ch.id].source === 'llm' ? `LLM · ${results[ch.id].model}` : '本地兜底算法' }}
              · {{ results[ch.id].panels.length }} 格
            </span>
            <span v-if="running[ch.id]" class="badge">生成中 {{ running[ch.id].status }}</span>
          </div>
          <div class="ch-ops">
            <button class="dim" @click="expanded[ch.id] = !expanded[ch.id]">
              {{ expanded[ch.id] ? '收起原文' : '展开原文' }}
            </button>
            <button class="primary" :disabled="!!running[ch.id]" @click="generate(ch)">
              {{ running[ch.id] ? '生成中…' : results[ch.id] ? '重新生成分镜' : '生成分镜' }}
            </button>
          </div>
        </div>

        <p v-if="expanded[ch.id]" class="source">{{ ch.content }}</p>
        <p v-if="errors[ch.id]" class="err">{{ errors[ch.id] }}</p>

        <!-- 分镜结果: 以"漫画页"网格呈现 -->
        <div v-if="results[ch.id]" class="panels">
          <div v-for="p in results[ch.id].panels" :key="p.panel" class="panel card">
            <div class="img-wrap">
              <img
                v-if="imageFor(p, results[ch.id])"
                :src="imageFor(p, results[ch.id])"
                :alt="`第${p.panel}格`"
              />
              <div v-else class="no-img">(图片生成失败)</div>
              <span class="panel-no">{{ p.panel }}</span>
            </div>
            <div class="meta">
              <span class="badge">{{ p.shotType }}</span>
              <p v-if="p.dialogue" class="dialogue">“{{ p.dialogue }}”</p>
              <p class="desc">{{ p.description }}</p>
            </div>
          </div>
        </div>
      </section>

      <p class="hint dim">
        结果生成时间: {{ results && Object.values(results)[0] ? fmt((Object.values(results)[0] as StoryboardResult).createdAt) : '—' }}
        （mock 模式为占位图；接真实出图模型后即真实漫画格）
      </p>
    </template>
  </div>
</template>

<style scoped>
.bar {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 18px;
}

.bar h2 {
  margin: 0;
  flex: 1;
}

.chapter {
  margin-bottom: 18px;
}

.ch-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.ch-title {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.idx {
  width: 28px;
  height: 28px;
  display: inline-grid;
  place-items: center;
  border-radius: 8px;
  background: var(--accent);
  color: #201408;
  font-weight: 700;
  font-size: 14px;
  flex: none;
}

.ch-ops {
  display: flex;
  gap: 8px;
  align-items: center;
}

.source {
  white-space: pre-wrap;
  color: var(--text-dim);
  font-size: 13px;
  line-height: 1.8;
  border-left: 3px solid var(--border);
  padding-left: 12px;
  margin: 12px 0 0;
}

.panels {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
  gap: 14px;
  margin-top: 16px;
}

.panel {
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.img-wrap {
  position: relative;
  border-radius: 8px;
  overflow: hidden;
  background: var(--bg);
  aspect-ratio: 2 / 3;
}

.img-wrap img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.panel-no {
  position: absolute;
  top: 8px;
  left: 8px;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  font-weight: 700;
  font-size: 13px;
  padding: 2px 8px;
  border-radius: 6px;
}

.no-img {
  height: 100%;
  display: grid;
  place-items: center;
  color: var(--text-dim);
  font-size: 13px;
}

.meta {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.dialogue {
  margin: 0;
  color: var(--accent);
  font-size: 13px;
}

.desc {
  margin: 0;
  font-size: 13px;
  color: var(--text-dim);
  line-height: 1.6;
}

.hint {
  text-align: center;
  margin-top: 8px;
}

.err {
  color: var(--danger);
  margin: 8px 0 0;
}
</style>
