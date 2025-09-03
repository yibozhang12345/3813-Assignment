// src/app/core/utils.ts
// 生成一个稳定且足够随机的短 id
export function uid(prefix = ''): string {
  const r = Math.random().toString(36).slice(2, 8);
  const t = Date.now().toString(36).slice(-4);
  return prefix + r + t;
}
