import { Inject, Injectable } from '@nestjs/common';
import { Chapter, Panel } from '../../domain/types';
import { LLM_PROVIDER, LLMProvider } from '../../providers/llm/llm.interface';

export interface StoryboardOutcome {
  source: 'llm' | 'local';
  model: string;
  panels: Panel[];
}

const SHOT_TYPES = ['远景', '全景', '中景', '近景', '特写', '过肩'];

const SYSTEM_PROMPT = `你是一位资深漫画分镜师。根据用户提供的小说/剧本文本, 把它改写成一组漫画分镜。
只输出合法 JSON, 不要任何解释、不要代码围栏。输出格式:
{ "panels": [ { "shotType": "中景/近景/全景/特写等", "description": "该格画面详细描述, 含人物动作、表情、环境、构图, 可直接用于文生图", "dialogue": "该格角色台词, 没有则留空字符串" } ] }
要求:
- 每格一个明确的镜头, 突出戏剧性与动作;
- description 要"视觉化", 避免"他思考着说"这类抽象叙述;
- dialogue 尽量来自原文或做合理口语化改写;
- 通常给出 4~10 格, 场景与人物保持一致。`;

/**
 * Stage 1: 章节文本 → 分镜 Panel 列表。
 * 有可用 LLM → 走大模型(带容错与本地回退); 没有 key → 本地兜底算法, 保证离线可跑。
 */
@Injectable()
export class StoryboardService {
  constructor(@Inject(LLM_PROVIDER) private readonly llm: LLMProvider) {}

  async generate(chapter: Chapter): Promise<StoryboardOutcome> {
    if (this.llm.available()) {
      try {
        const prompt = this.buildPrompt(chapter);
        const data = (await this.llm.generateStructured(prompt, {
          system: SYSTEM_PROMPT,
          temperature: 0.8,
          jsonMode: true,
        })) as { panels?: unknown[] } | unknown[];
        const list = Array.isArray(data) ? data : (data as { panels?: unknown[] })?.panels;
        const rows = (list ?? []) as Array<Record<string, unknown>>;
        if (rows.length) {
          const panels: Panel[] = rows
            .slice(0, 12)
            .map((p, i) => ({
              panel: i + 1,
              shotType: String((p.shotType as string) ?? '中景'),
              description: String((p.description as string) ?? '').trim(),
              dialogue: p.dialogue ? String(p.dialogue) : undefined,
            }));
          if (panels.every((x) => x.description)) {
            return { source: 'llm', model: this.llm.name, panels };
          }
        }
        console.warn('[Storyboard] LLM 返回结构不合法, 回退本地算法');
      } catch (e) {
        console.warn('[Storyboard] LLM 调用失败, 回退本地算法:', (e as Error).message);
      }
    }
    return { source: 'local', model: 'local-fallback', panels: this.localFallback(chapter.content) };
  }

  private buildPrompt(chapter: Chapter): string {
    return `章节标题: ${chapter.title}\n章节正文:\n${truncate(chapter.content, 6000)}`;
  }

  /** 本地兜底: 按句子切块 → 每块一格(保证离线也有输出) */
  private localFallback(content: string): Panel[] {
    const clean = content.replace(/\s+/g, ' ').trim();
    if (!clean) return [{ panel: 1, shotType: '中景', description: '(本章节内容为空)' }];

    const sentences = clean.split(/(?<=[。！？!?；;])/).map((s) => s.trim()).filter(Boolean);
    const chunks: string[] = [];
    let buf = '';
    for (const s of sentences) {
      if (buf && (buf + s).length > 110) {
        chunks.push(buf);
        buf = s;
      } else {
        buf += s;
      }
      if (chunks.length >= 9) break;
    }
    if (buf) chunks.push(buf);

    return chunks.slice(0, 10).map((c, i) => ({
      panel: i + 1,
      shotType: SHOT_TYPES[i % SHOT_TYPES.length],
      description: `画面 ${i + 1}: ${c.slice(0, 96)}`,
      dialogue: undefined,
    }));
  }
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n)}……` : s;
}
