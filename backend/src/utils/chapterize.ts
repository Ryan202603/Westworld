/**
 * 章节切分工具(纯函数)。
 * 1) 若正文含「第X章 / Chapter X」标题 → 按标题拆分;
 * 2) 否则按空行段落每 ~6 段聚合为一章;
 * 3) 最后兜底单章。
 */

export interface RawChapter {
  index: number;
  title: string;
  content: string;
}

const CHAPTER_RE =
  /^\s*(第\s*[0-9一二三四五六七八九十百千万零两]+\s*[章节回卷部篇]|(?:chapter|Chapter|CHAPTER)\s+\d+)/;

export function chapterize(raw: string): RawChapter[] {
  const text = (raw ?? '').trim();
  if (!text) return [];

  const lines = text.split(/\r?\n/);
  const headings: { title: string; start: number }[] = [];
  lines.forEach((line, i) => {
    if (CHAPTER_RE.test(line.trim())) headings.push({ title: line.trim(), start: i });
  });

  if (headings.length > 1) {
    const out: RawChapter[] = [];
    headings.forEach((h, idx) => {
      const end = idx + 1 < headings.length ? headings[idx + 1].start : lines.length;
      const body = lines.slice(h.start + 1, end).join('\n').trim();
      out.push({ index: idx + 1, title: h.title.replace(/\s+/g, ' '), content: body || h.title });
    });
    return out;
  }

  // 无标题 → 按空行段落聚合
  const paras = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
  const PER = 6;
  const out: RawChapter[] = [];
  for (let i = 0; i < paras.length; i += PER) {
    const part = paras.slice(i, i + PER).join('\n');
    out.push({ index: out.length + 1, title: `章节 ${out.length + 1}`, content: part });
  }
  return out.length ? out : [{ index: 1, title: '章节 1', content: text }];
}
