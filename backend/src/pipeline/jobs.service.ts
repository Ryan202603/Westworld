import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { FileStoreService } from '../store/file-store.service';
import { StoryboardService } from './storyboard/storyboard.service';
import { RenderService } from './render/render.service';
import { GenerateJob, StoryboardResult } from '../domain/types';

/**
 * ★ 编排层: 把一个"生成任务"串起来跑 —— storyboard → render → 存结果。
 * MVP 用内存串行队列(不依赖 Redis); 将来可直接替换成 BullMQ:
 *   把 enqueue() 换成 producer.add(), process() 换成一个 consumer。
 */
@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);
  private tail: Promise<void> = Promise.resolve();

  constructor(
    private readonly store: FileStoreService,
    private readonly storyboard: StoryboardService,
    private readonly render: RenderService,
  ) {}

  startJob(projectId: string, chapterId: string): GenerateJob {
    const job: GenerateJob = {
      id: randomUUID(),
      projectId,
      chapterId,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.store.saveJob(job);
    this.enqueue(() => this.process(job.id));
    return this.store.getJob(job.id)!;
  }

  getJob(id: string): GenerateJob | undefined {
    return this.store.getJob(id);
  }

  private enqueue(task: () => Promise<void>) {
    this.tail = this.tail.then(task).catch((e) => this.logger.error(`任务执行失败: ${e}`));
  }

  private async process(jobId: string): Promise<void> {
    const job = this.store.getJob(jobId);
    if (!job) return;
    this.patch(jobId, { status: 'running' });

    try {
      const project = this.store.getProject(job.projectId);
      const chapter = project?.chapters.find((c) => c.id === job.chapterId);
      if (!project || !chapter) throw new Error('章节不存在或作品已被删除');

      // Stage 1: 文本 → 分镜
      const outcome = await this.storyboard.generate(chapter);
      // Stage 2: 分镜 → 漫画格
      const images = await this.render.renderPanelImages(outcome.panels);

      const result: StoryboardResult = {
        chapterId: chapter.id,
        chapterTitle: chapter.title,
        source: outcome.source,
        model: outcome.model,
        createdAt: new Date().toISOString(),
        panels: outcome.panels,
        images,
      };
      this.patch(jobId, { status: 'done', result });
      this.logger.log(`章节「${chapter.title}」生成完成: ${outcome.source}(${outcome.model}) ${outcome.panels.length} 格`);
    } catch (e) {
      this.logger.error(`章节生成失败: ${(e as Error).message}`);
      this.patch(jobId, { status: 'error', error: (e as Error).message });
    }
  }

  private patch(id: string, patch: Partial<GenerateJob>) {
    const job = this.store.getJob(id);
    if (!job) return;
    this.store.saveJob({ ...job, ...patch, updatedAt: new Date().toISOString() } as GenerateJob);
  }
}
