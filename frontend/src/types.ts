/** 与 backend/src/domain/types.ts 保持一致(前后端契约) */

export interface Panel {
  panel: number;
  shotType: string;
  description: string;
  dialogue?: string;
}

export interface Chapter {
  id: string;
  index: number;
  title: string;
  content: string;
}

export interface Project {
  id: string;
  title: string;
  content: string;
  chapters: Chapter[];
  createdAt: string;
  updatedAt: string;
}

export type JobStatus = 'pending' | 'running' | 'done' | 'error';

export interface RenderedImage {
  panel: number;
  provider: string;
  imageDataUri?: string;
}

export interface StoryboardResult {
  chapterId: string;
  chapterTitle: string;
  source: 'llm' | 'local';
  model: string;
  createdAt: string;
  panels: Panel[];
  images: RenderedImage[];
}

export interface GenerateJob {
  id: string;
  projectId: string;
  chapterId: string;
  status: JobStatus;
  error?: string;
  result?: StoryboardResult;
  createdAt: string;
  updatedAt: string;
}
