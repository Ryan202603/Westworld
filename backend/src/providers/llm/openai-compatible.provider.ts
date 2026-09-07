import { ConfigService } from '@nestjs/config';
import { LLMGenerateOptions, LLMProvider } from './llm.interface';

/**
 * OpenAI 兼容协议 Provider。
 * DeepSeek / 豆包 / 通义 / Kimi / OpenAI 等大多兼容 /chat/completions,
 * 换厂商通常只需要改 .env 的 LLM_BASE_URL + LLM_MODEL, 零代码。
 */
export class OpenAICompatibleProvider implements LLMProvider {
  readonly name = 'openai-compatible';

  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly jsonMode: boolean;

  constructor(config: ConfigService) {
    this.apiKey = (config.get<string>('LLM_API_KEY') ?? '').trim();
    this.baseUrl = (config.get<string>('LLM_BASE_URL') ?? 'https://api.deepseek.com/v1').replace(/\/+$/, '');
    this.model = config.get<string>('LLM_MODEL') ?? 'deepseek-chat';
    this.jsonMode = config.get<string>('LLM_JSON_MODE') !== 'false';
  }

  available(): boolean {
    return this.apiKey.length > 0;
  }

  async generateStructured(prompt: string, options: LLMGenerateOptions = {}): Promise<unknown> {
    if (!this.available()) {
      throw new Error('LLM_API_KEY 未配置, 无法调用真实模型');
    }

    const body: Record<string, unknown> = {
      model: this.model,
      temperature: options.temperature ?? 0.7,
      messages: [
        {
          role: 'system',
          content: options.system ?? '你是一个严谨的数据助手, 只输出合法 JSON, 不输出任何解释。',
        },
        { role: 'user', content: prompt },
      ],
    };
    if (this.jsonMode && options.jsonMode !== false) {
      body.response_format = { type: 'json_object' };
    }

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      throw new Error(`LLM 请求失败 HTTP ${res.status}: ${await res.text()}`);
    }
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content ?? '';
    if (!content.trim()) throw new Error('LLM 返回空内容');
    return parseLooseJson(content);
  }
}

/** 容错解析: 去掉 markdown 代码围栏/前后解释, 只取 JSON 主体 */
function parseLooseJson(raw: string): unknown {
  let text = raw.trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) text = fence[1].trim();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start >= 0 && end > start) text = text.slice(start, end + 1);
  return JSON.parse(text);
}
