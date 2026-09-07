import { Controller, Get, NotFoundException, Param } from '@nestjs/common'
import { JobsService } from '../../pipeline/jobs.service'
import { GenerateJob } from '../../domain/types'

@Controller('projects/:projectId/jobs')
export class JobsController {
  constructor(private readonly jobs: JobsService) {}

  @Get(':jobId')
  status(@Param('projectId') projectId: string, @Param('jobId') jobId: string): GenerateJob {
    const job = this.jobs.getJob(jobId)
    if (!job || job.projectId !== projectId) throw new NotFoundException('任务不存在')
    return job
  }
}
