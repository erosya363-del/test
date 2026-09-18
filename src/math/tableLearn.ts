/** Учебный поток таблицы: a × b = a групп по b. */

export type TableLearnStep = "meaning" | "sum" | "formula" | "try";

export function tableFactKey(a: number, b: number): string {
  return `${a}x${b}`;
}

export function nextLearnPair(factor: number, seen: Set<string>): { a: number; b: number } {
  const a = factor;
  for (let b = 1; b <= 10; b += 1) {
    if (!seen.has(tableFactKey(a, b))) return { a, b };
  }
  const b = 1 + Math.floor(Math.random() * 10);
  return { a, b };
}

export function repeatedSum(a: number, b: number): string {
  return Array.from({ length: a }, () => String(b)).join(" + ");
}

export function meaningText(a: number, b: number): string {
  return `${a} группы по ${b}`;
}
