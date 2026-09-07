import { Module } from '@nestjs/common'
import { StoreModule } from '../store/store.module'
import { PipelineModule } from '../pipeline/pipeline.module'
import { ProjectsController } from './projects/projects.controller'
import { JobsController } from './jobs/jobs.controller'

@Module({
  imports: [StoreModule, PipelineModule],
  controllers: [ProjectsController, JobsController]
})
export class ApiModule {}
