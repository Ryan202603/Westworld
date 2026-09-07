import { BadRequestException, Body, Controller, Delete, Get, NotFoundException, Param, Post } from '@nestjs/common'
import { randomUUID } from 'node:crypto'
import { Project } from '../../domain/types'
import { FileStoreService } from '../../store/file-store.service'
import { JobsService } from '../../pipeline/jobs.service'
import { chapterize } from '../../utils/chapterize'

@Controller('projects')
export class ProjectsController {
  constructor(
    private readonly store: FileStoreService,
    private readonly jobs: JobsService
  ) {}

  @Post()
  create(@Body() body: { title?: string; content?: string }): Project {
    const content = typeof body?.content === 'string' ? body.content.trim() : ''
    if (!content) throw new BadRequestException('内容不能为空')
    const title = typeof body?.title === 'string' && body.title.trim() ? body.title.trim() : '未命名作品'

    const now = new Date().toISOString()
    const project: Project = {
      id: randomUUID(),
      title,
      content,
      chapters: chapterize(content).map(c => ({ id: randomUUID(), ...c })),
      createdAt: now,
      updatedAt: now
    }
    this.store.upsertProject(project)
    return project
  }

  @Get()
  list(): Project[] {
    return this.store.listProjects()
  }

  @Get(':id')
  get(@Param('id') id: string): Project {
    const project = this.store.getProject(id)
    if (!project) throw new NotFoundException('作品不存在')
    return project
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    if (!this.store.getProject(id)) throw new NotFoundException('作品不存在')
    this.store.removeProject(id)
    return { ok: true }
  }

  /** 发起"文本→分镜→漫画格"生成任务, 立即返回 jobId(结果用轮询拿) */
  @Post(':id/chapters/:chapterId/generate')
  generate(@Param('id') id: string, @Param('chapterId') chapterId: string) {
    const project = this.store.getProject(id)
    if (!project) throw new NotFoundException('作品不存在')
    if (!project.chapters.some(c => c.id === chapterId)) {
      throw new NotFoundException('章节不存在')
    }
    const job = this.jobs.startJob(id, chapterId)
    return { jobId: job.id, status: job.status, chapterId }
  }

  /** 该章节最近一次成功生成的成果(页面刷新后仍能恢复展示) */
  @Get(':id/chapters/:chapterId/storyboard')
  latestStoryboard(@Param('id') id: string, @Param('chapterId') chapterId: string) {
    const job = this.store.latestDoneJobForChapter(id, chapterId)
    if (!job?.result) throw new NotFoundException('该章节还没有生成结果')
    return job.result
  }
}
