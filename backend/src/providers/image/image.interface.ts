/**
 * 图像 Provider 抽象 —— 出图能力(文生图/图生图)统一走这里。
 * MVP 阶段用 MockImageProvider(SVG 占位); 后续接即梦/SD/Flux/ComfyUI
 * 只需新增实现并替换 providers.module 里的 factory。
 */

export interface ImageGenRequest {
  /** 画面描述(通常直接来自 Panel.description) */
  prompt: string
  width?: number
  height?: number
  seed?: number
}

export interface ImageGenResult {
  /** 实际使用的 provider 名 */
  provider: string
  /** data URI 或对象存储 URL */
  imageDataUri?: string
  note?: string
}

export interface ImageProvider {
  readonly name: string
  generate(request: ImageGenRequest): Promise<ImageGenResult>
}

export const IMAGE_PROVIDER = Symbol.for('IMAGE_PROVIDER')
