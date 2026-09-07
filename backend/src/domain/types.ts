/**
 * 领域模型 —— 全链路的结构化中间产物都围绕这几个类型流转，
 * 保证「每个环节输入/输出可见」，方便学习与对比不同模型。
 */

/** 一格漫画 */
export interface Panel {
  /** 格序号, 从 1 开始 */
  panel: number
  /** 镜头类型: 远景/全景/中景/近景/特写 等 */
  shotType: string
  /** 该格画面详细描述(可直接用于文生图的 prompt) */
  description: string
  /** 该格角色台词(没有则为空) */
  dialogue?: string
}

/** 一章 */
export interface Chapter {
  id: string
  index: number
  title: string
  content: string
}

/** 一个「作品」(对应一本导入的书) */
export interface Project {
  id: string
  title: string
  /** 导入的原始全文 */
  content: string
  chapters: Chapter[]
  createdAt: string
  updatedAt: string
}

export type JobStatus = 'pending' | 'running' | 'done' | 'error'

/** 某格渲染出的图片 */
export interface RenderedImage {
  panel: number
  provider: string
  /** data URI 或对象存储 URL */
  imageDataUri?: string
}

/** 一章生成分镜的最终产物 */
export interface StoryboardResult {
  chapterId: string
  chapterTitle: string
  /** llm = 大模型产出; local = 本地兜底算法 */
  source: 'llm' | 'local'
  /** 实际使用的模型名 */
  model: string
  createdAt: string
  panels: Panel[]
  images: RenderedImage[]
}

/** 异步生成任务(简单队列, MVP 串行执行) */
export interface GenerateJob {
  id: string
  projectId: string
  chapterId: string
  status: JobStatus
  error?: string
  result?: StoryboardResult
  createdAt: string
  updatedAt: string
}

/** 持久化到 JSON 文件的整体形状 */
export interface DbShape {
  projects: Project[]
  jobs: GenerateJob[]
}
