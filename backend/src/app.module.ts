import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { StoreModule } from './store/store.module'
import { ProvidersModule } from './providers/providers.module'
import { PipelineModule } from './pipeline/pipeline.module'
import { ApiModule } from './modules/api.module'

@Module({
  imports: [
    // 读取 backend/.env (isGlobal: 任何模块都能注入 ConfigService)
    ConfigModule.forRoot({ isGlobal: true }),
    StoreModule,
    ProvidersModule,
    PipelineModule,
    ApiModule
  ]
})
export class AppModule {}
