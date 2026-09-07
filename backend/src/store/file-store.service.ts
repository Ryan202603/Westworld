import { Injectable, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { DbShape, GenerateJob, Project } from '../domain/types'

/**
 * 极简 JSON 文件存储 —— MVP 阶段代替数据库。
 * 未来可平滑替换为 Postgres/TypeORM: 只要保持这些方法签名, 上层不用动。
 */
@Injectable()
export class FileStoreService implements OnModuleInit {
  private filePath = ''
  private db: DbShape = { projects: [], jobs: [] }

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const dir = this.config.get<string>('DATA_DIR', 'data')
    this.filePath = join(process.cwd(), dir, 'db.json')
    if (existsSync(this.filePath)) {
      try {
        this.db = { projects: [], jobs: [], ...JSON.parse(readFileSync(this.filePath, 'utf8')) }
      } catch {
        this.db = { projects: [], jobs: [] }
      }
    }
    this.persist()
  }

  /** 落盘(同步, 数据量小足够用) */
  private persist() {
    mkdirSync(dirname(this.filePath), { recursive: true })
    const tmp = `${this.filePath}.tmp`
    writeFileSync(tmp, JSON.stringify(this.db, null, 2), 'utf8')
    renameSync(tmp, this.filePath)
  }

  private clone<T>(v: T): T {
    return JSON.parse(JSON.stringify(v)) as T
  }

  // ---------- Projects ----------
  listProjects(): Project[] {
    return this.clone(this.db.projects).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }

  getProject(id: string): Project | undefined {
    const p = this.db.projects.find(x => x.id === id)
    return p ? this.clone(p) : undefined
  }

  upsertProject(project: Project) {
    const i = this.db.projects.findIndex(x => x.id === project.id)
    if (i >= 0) this.db.projects[i] = project
    else this.db.projects.push(project)
    this.persist()
  }

  removeProject(id: string) {
    this.db.projects = this.db.projects.filter(x => x.id !== id)
    this.db.jobs = this.db.jobs.filter(j => j.projectId !== id)
    this.persist()
  }

  // ---------- Jobs ----------
  getJob(id: string): GenerateJob | undefined {
    const j = this.db.jobs.find(x => x.id === id)
    return j ? this.clone(j) : undefined
  }

  saveJob(job: GenerateJob) {
    const i = this.db.jobs.findIndex(x => x.id === job.id)
    if (i >= 0) this.db.jobs[i] = job
    else this.db.jobs.push(job)
    this.persist()
  }

  /** 某章节最近一次成功(done)的结果任务 */
  latestDoneJobForChapter(projectId: string, chapterId: string): GenerateJob | undefined {
    const hits = this.db.jobs.filter(j => j.projectId === projectId && j.chapterId === chapterId && j.status === 'done')
    if (!hits.length) return undefined
    hits.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    return this.clone(hits[0])
  }
}
