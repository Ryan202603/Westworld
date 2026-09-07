import { Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { LLM_PROVIDER } from './llm/llm.interface'
import { OpenAICompatibleProvider } from './llm/openai-compatible.provider'
import { IMAGE_PROVIDER } from './image/image.interface'
import { MockImageProvider } from './image/mock.image.provider'

/**
 * ★ 适配器注册表: 想切换/新增模型, 只需要改这里的 useFactory。
 * pipeline 及其它模块一律只依赖 LLM_PROVIDER / IMAGE_PROVIDER 这两个 token。
 */
@Module({
  providers: [
    {
      provide: LLM_PROVIDER,
      useFactory: (config: ConfigService) => new OpenAICompatibleProvider(config),
      inject: [ConfigService]
    },
    {
      provide: IMAGE_PROVIDER,
      // TODO(下一步): 在这里换成真实的出图 provider, 例如
      //   useFactory: (config) => new SeedreamProvider(config)
      useFactory: () => new MockImageProvider()
    }
  ],
  exports: [LLM_PROVIDER, IMAGE_PROVIDER]
})
export class ProvidersModule {}
