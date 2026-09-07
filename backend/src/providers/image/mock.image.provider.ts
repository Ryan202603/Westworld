import { ImageGenRequest, ImageGenResult, ImageProvider } from './image.interface'

/**
 * Mock 图像 Provider —— 返回一张 SVG 占位图(data URI)。
 * 用于在"不花一分钱/不需要 key"的情况下跑通 文本→分镜→漫画格 的整条链路。
 * 每个格子按 prompt 哈希出一个稳定色相, 视觉上略有区分。
 */
export class MockImageProvider implements ImageProvider {
  readonly name = 'mock-svg'

  async generate(request: ImageGenRequest): Promise<ImageGenResult> {
    const width = request.width ?? 512
    const height = request.height ?? 768
    const prompt = (request.prompt ?? '').trim() || '空白画面'
    const hue = hashHue(prompt)

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="hsl(${hue},72%,30%)"/>
      <stop offset="1" stop-color="hsl(${(hue + 45) % 360},72%,14%)"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#g)"/>
  <rect x="14" y="14" width="${width - 28}" height="${height - 28}" fill="none" stroke="rgba(255,255,255,0.4)" stroke-width="2" stroke-dasharray="9 7"/>
  <text x="50%" y="52%" text-anchor="middle" fill="rgba(255,255,255,0.9)" font-family="sans-serif" font-size="${Math.round(width / 26)}">漫画格占位 · mock</text>
  <foreignObject x="26" y="62%" width="${width - 52}" height="${Math.min(Math.round(height * 0.26), 240)}">
    <div xmlns="http://www.w3.org/1999/xhtml" style="font-family:sans-serif;font-size:${Math.max(11, Math.round(width / 42))}px;color:rgba(255,255,255,0.92);line-height:1.5;overflow-wrap:anywhere;">${escapeXml(prompt)}</div>
  </foreignObject>
</svg>`

    return {
      provider: this.name,
      imageDataUri: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
      note: 'mock 占位图: 在 providers.module 换成真实 image provider 后即为真实漫画格'
    }
  }
}

function hashHue(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h % 360
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
