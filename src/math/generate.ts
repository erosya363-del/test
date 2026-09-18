import type { CompareOp, MathCategory, MathExercise } from "./types";

function rid(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function withId(ex: Omit<MathExercise, "id">): MathExercise {
  return { ...ex, id: rid() };
}

function makeCalc(): MathExercise {
  const add = Math.random() < 0.55;
  if (add) {
    const a = rand(3, 40);
    const b = rand(2, 40);
    const sum = a + b;
    const similarA = rand(3, 40);
    const similarB = rand(2, 40);
    return withId({
      category: "calc",
      skill: "add",
      prompt: `${a} + ${b} = ?`,
      answerKind: "number",
      answer: sum,
      hint: `Сложи: ${a} + ${Math.min(b, 10)} = ${a + Math.min(b, 10)}, потом остаток.`,
      explanation: `${a} + ${b} = ${sum}`,
      similar: {
        category: "calc",
        skill: "add",
        prompt: `${similarA} + ${similarB} = ?`,
        answerKind: "number",
        answer: similarA + similarB,
        hint: "Сложи по частям",
        explanation: `${similarA} + ${similarB} = ${similarA + similarB}`,
      },
    });
  }
  const a = rand(10, 50);
  const b = rand(2, Math.min(20, a - 1));
  const similarA = rand(10, 50);
  const similarB = rand(2, Math.min(20, similarA - 1));
  return withId({
    category: "calc",
    skill: "sub",
    prompt: `${a} − ${b} = ?`,
    answerKind: "number",
    answer: a - b,
    hint: `${a} − ${Math.min(b, 3)} = ${a - Math.min(b, 3)}. Осталось вычесть ещё ${b - Math.min(b, 3)}.`,
    explanation: `${a} − ${b} = ${a - b}`,
    similar: {
      category: "calc",
      skill: "sub",
      prompt: `${similarA} − ${similarB} = ?`,
      answerKind: "number",
      answer: similarA - similarB,
      hint: "Вычитай по частям",
      explanation: `${similarA} − ${similarB} = ${similarA - similarB}`,
    },
  });
}

function makeCompare(): MathExercise {
  const leftA = rand(2, 20);
  const leftB = rand(2, 20);
  const right = rand(5, 40);
  const left = leftA + leftB;
  let op: CompareOp = "=";
  if (left < right) op = "<";
  else if (left > right) op = ">";
  return withId({
    category: "compare",
    skill: "compare",
    prompt: `${leftA} + ${leftB} ○ ${right}`,
    answerKind: "compare",
    answer: op,
    hint: `Сначала сложи: ${leftA} + ${leftB} = ${left}. Потом сравни с ${right}.`,
    explanation: `${leftA} + ${leftB} = ${left}, значит ${left} ${op} ${right}`,
    similar: {
      category: "compare",
      skill: "compare",
      prompt: `${leftA} + ${Math.max(1, leftB - 1)} ○ ${right}`,
      answerKind: "compare",
      answer: (() => {
        const L = leftA + Math.max(1, leftB - 1);
        if (L < right) return "<";
        if (L > right) return ">";
        return "=";
      })(),
      hint: "Сложи и сравни",
      explanation: "Сравни суммы",
    },
  });
}

function makeMissing(): MathExercise {
  const mode = rand(0, 2);
  if (mode === 0) {
    const a = rand(2, 15);
    const sum = rand(a + 2, 25);
    const miss = sum - a;
    return withId({
      category: "missing",
      skill: "missing_add",
      prompt: `${a} + □ = ${sum}`,
      answerKind: "number",
      answer: miss,
      hint: `Какое число добавить к ${a}, чтобы получить ${sum}? ${sum} − ${a} = ?`,
      explanation: `${a} + ${miss} = ${sum}`,
      similar: {
        category: "missing",
        skill: "missing_add",
        prompt: `${a + 1} + □ = ${sum + 1}`,
        answerKind: "number",
        answer: sum - a,
        hint: "Вычти известное",
        explanation: `${a + 1} + ${sum - a} = ${sum + 1}`,
      },
    });
  }
  if (mode === 1) {
    const b = rand(2, 12);
    const result = rand(5, 20);
    const miss = result + b;
    return withId({
      category: "missing",
      skill: "missing_sub",
      prompt: `□ − ${b} = ${result}`,
      answerKind: "number",
      answer: miss,
      hint: `Какое число минус ${b} даёт ${result}? ${result} + ${b} = ?`,
      explanation: `${miss} − ${b} = ${result}`,
      similar: {
        category: "missing",
        skill: "missing_sub",
        prompt: `□ − ${b} = ${result + 1}`,
        answerKind: "number",
        answer: result + 1 + b,
        hint: "Прибавь вычитаемое",
        explanation: `${result + 1 + b} − ${b} = ${result + 1}`,
      },
    });
  }
  const a = rand(8, 25);
  const b = rand(2, 10);
  const miss = a - b;
  return withId({
    category: "missing",
    skill: "missing_sub2",
    prompt: `${a} − □ = ${miss}`,
    answerKind: "number",
    answer: b,
    hint: `${a} − ? = ${miss}. Значит ? = ${a} − ${miss}`,
    explanation: `${a} − ${b} = ${miss}`,
  });
}

function makeWord(): MathExercise {
  const templates: Array<() => MathExercise> = [
    () => {
      const had = rand(6, 15);
      const gave = rand(2, Math.min(5, had - 1));
      const bought = rand(2, 8);
      const ans = had - gave + bought;
      return withId({
        category: "word",
        skill: "word_mix",
        prompt: "Сколько стало?",
        lines: [
          `У Маши было ${had} карандашей.`,
          `${gave} она подарила.`,
          `Потом мама купила ещё ${bought}.`,
        ],
        answerKind: "number",
        answer: ans,
        hint: `Сначала ${had} − ${gave} = ${had - gave}. Потом + ${bought}.`,
        explanation: `${had} − ${gave} = ${had - gave}; ${had - gave} + ${bought} = ${ans}`,
      });
    },
    () => {
      const a = rand(4, 12);
      const b = rand(3, 10);
      return withId({
        category: "word",
        skill: "word_add",
        prompt: "Сколько всего?",
        lines: [`В коробке ${a} яблок.`, `Положили ещё ${b}.`],
        answerKind: "number",
        answer: a + b,
        hint: `${a} + ${b} = ?`,
        explanation: `${a} + ${b} = ${a + b}`,
      });
    },
    () => {
      const a = rand(10, 20);
      const b = rand(3, 8);
      return withId({
        category: "word",
        skill: "word_sub",
        prompt: "Сколько осталось?",
        lines: [`Было ${a} конфет.`, `Съели ${b}.`],
        answerKind: "number",
        answer: a - b,
        hint: `${a} − ${b} = ?`,
        explanation: `${a} − ${b} = ${a - b}`,
      });
    },
  ];
  return pick(templates)();
}

function makeSeries(): MathExercise {
  const step = pick([2, 3, 5, 10]);
  const start = rand(1, 10);
  const seq = [start, start + step, start + step * 2];
  const next = start + step * 3;
  return withId({
    category: "series",
    skill: "series",
    prompt: `${seq.join(", ")}, □, …`,
    answerKind: "number",
    answer: next,
    hint: `Шаг +${step}. После ${seq[2]} будет ${next}.`,
    explanation: `Ряд с шагом ${step}: следующее ${next}`,
  });
}

function makeMultiply(): MathExercise {
  const a = rand(2, 9);
  const b = rand(1, 9);
  const product = a * b;
  return withId({
    category: "multiply",
    skill: `times_${a}`,
    prompt: `${a} × ${b} = ?`,
    answerKind: "number",
    answer: product,
    hint: `${a} группы по ${b}: ${Array(a).fill(b).join(" + ")} = ${product}`,
    explanation: `${a} × ${b} = ${product}`,
    similar: {
      category: "multiply",
      skill: `times_${a}`,
      prompt: `${a} × ${Math.max(1, b - 1)} = ?`,
      answerKind: "number",
      answer: a * Math.max(1, b - 1),
      hint: "Сложи группы",
      explanation: `${a} × ${Math.max(1, b - 1)} = ${a * Math.max(1, b - 1)}`,
    },
  });
}

const BUILDERS: Record<MathCategory, () => MathExercise> = {
  calc: makeCalc,
  compare: makeCompare,
  missing: makeMissing,
  word: makeWord,
  series: makeSeries,
  multiply: makeMultiply,
};

/** Сессия «Сегодня»: смесь блоков 2 класса. */
export function buildTodaySession(count = 10): MathExercise[] {
  const mix: MathCategory[] = [
    "calc",
    "calc",
    "compare",
    "missing",
    "word",
    "series",
    "multiply",
    "calc",
    "missing",
    "multiply",
  ];
  const out: MathExercise[] = [];
  for (let i = 0; i < count; i += 1) {
    const cat = mix[i % mix.length]!;
    out.push(BUILDERS[cat]());
  }
  // Перемешать, чтобы не было жёсткого шаблона
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

export function buildTrainSession(category: MathCategory, count = 10): MathExercise[] {
  return Array.from({ length: count }, () => BUILDERS[category]());
}

export function buildTableSession(factor: number, count = 10): MathExercise[] {
  const out: MathExercise[] = [];
  const used = new Set<number>();
  while (out.length < count) {
    const b = rand(1, 10);
    if (used.has(b) && used.size < 10) continue;
    used.add(b);
    const product = factor * b;
    out.push(
      withId({
        category: "multiply",
        skill: `times_${factor}`,
        prompt: `${factor} × ${b} = ?`,
        answerKind: "number",
        answer: product,
        hint: `${factor} по ${b}: сложи ${b} раз по ${factor}`,
        explanation: `${factor} × ${b} = ${product}`,
      }),
    );
  }
  return out;
}
