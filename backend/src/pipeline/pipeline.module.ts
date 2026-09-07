import { Module } from '@nestjs/common'
import { ProvidersModule } from '../providers/providers.module'
import { JobsService } from './jobs.service'
import { StoryboardService } from './storyboard/storyboard.service'
import { RenderService } from './render/render.service'

@Module({
  imports: [ProvidersModule],
  providers: [JobsService, StoryboardService, RenderService],
  exports: [JobsService]
})
export class PipelineModule {}
