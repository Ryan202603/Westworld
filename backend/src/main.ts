import { NestFactory } from '@nestjs/core'
import { Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  // MVP: 直接放开 CORS(前端也可走 Vite 代理, 双保险)
  app.enableCors()
  app.setGlobalPrefix('api')

  const config = app.get(ConfigService)
  const port = config.get<number>('PORT', 3000)
  await app.listen(port)
  Logger.log(`Westworld backend 已启动: http://localhost:${port}/api`, 'Bootstrap')
  Logger.log('健康检查: http://localhost:' + port + '/api/projects', 'Bootstrap')
}
void bootstrap()
