import { Inject, Injectable } from '@nestjs/common';
import { Panel, RenderedImage } from '../../domain/types';
import { IMAGE_PROVIDER, ImageProvider } from '../../providers/image/image.interface';

/**
 * Stage 2: 分镜 Panel → 漫画格图片。
 * 只依赖 IMAGE_PROVIDER 接口; 换真实出图模型时本文件不用改。
 */
@Injectable()
export class RenderService {
  constructor(@Inject(IMAGE_PROVIDER) private readonly image: ImageProvider) {}

  async renderPanelImages(panels: Panel[]): Promise<RenderedImage[]> {
    const out: RenderedImage[] = [];
    const BATCH = 4; // 简单并发限流, 方便将来接真实出图 API
    for (let i = 0; i < panels.length; i += BATCH) {
      const slice = panels.slice(i, i + BATCH);
      const results = await Promise.all(
        slice.map((p) =>
          this.image
            .generate({ prompt: p.description, width: 512, height: 768, seed: p.panel })
            .then((r) => ({ panel: p.panel, provider: r.provider, imageDataUri: r.imageDataUri }))
            .catch(() => ({ panel: p.panel, provider: this.image.name })),
        ),
      );
      out.push(...results);
    }
    return out;
  }
}
