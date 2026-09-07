/**
 * LLM Provider 抽象 —— 任何大模型只要实现这个接口即可接入。
 * 这正是"连接各种模型"的边界: pipeline 只依赖接口, 不认识任何厂商。
 */

export interface LLMGenerateOptions {
  /** 系统提示词 */
  system?: string;
  temperature?: number;
  /** 是否请求 JSON 结构化输出 */
  jsonMode?: boolean;
}

export interface LLMProvider {
  readonly name: string;
  /** 是否已配置可用(没配 key 时返回 false, 上层走本地兜底) */
  available(): boolean;
  /** 调用模型并解析为结构化 JSON */
  generateStructured(prompt: string, options?: LLMGenerateOptions): Promise<unknown>;
}

/** NestJS 依赖注入 token: 想要哪个模型, 就在 providers.module 里替换实现 */
export const LLM_PROVIDER = Symbol.for('LLM_PROVIDER');
