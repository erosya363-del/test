import type {
  CompareOp,
  LengthPair,
  MathCategory,
  MathExercise,
  MathSkillId,
} from "./types";
import { timesSkillId } from "./types";
import { DEFAULT_TODAY_SKILLS } from "./curriculum";

function rid(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function withId(ex: Omit<MathExercise, "id">): MathExercise {
  return { ...ex, id: rid() };
}

function skillField(skillId: MathSkillId, legacy?: string): Pick<MathExercise, "skill" | "skillId"> {
  return { skillId, skill: legacy ?? skillId };
}

function addBridgeHint(a: number, b: number): { hint: string; explanation: string } {
  const toTen = 10 - a;
  const rest = b - toTen;
  const sum = a + b;
  return {
    hint: `${a} + ${b}: сначала ${a} + ${toTen} = 10, осталось ${rest}, 10 + ${rest} = ${sum}`,
    explanation: `${a} + ${toTen} = 10\nосталось ${rest}\n10 + ${rest} = ${sum}`,
  };
}

function subBridgeHint(a: number, b: number): { hint: string; explanation: string } {
  const toTen = a - 10;
  const rest = b - toTen;
  const result = a - b;
  return {
    hint: `${a} − ${b}: сначала ${a} − ${toTen} = 10, потом 10 − ${rest} = ${result}`,
    explanation: `${a} − ${toTen} = 10\n10 − ${rest} = ${result}`,
  };
}

function makeSimilarNumber(
  base: Omit<MathExercise, "id" | "similar">,
  prompt: string,
  answer: number,
  hint: string,
  explanation: string,
): Omit<MathExercise, "id" | "similar"> {
  return { ...base, prompt, answer, hint, explanation };
}

// --- Сложение ---

export function makeAddTo10(): MathExercise {
  const a = rand(1, 9);
  const b = rand(1, 10 - a);
  const sum = a + b;
  const base = {
    category: "calc" as const,
    ...skillField("add_to_10", "add"),
    prompt: `${a} + ${b} = ?`,
    answerKind: "number" as const,
    answer: sum,
    hint: `Сложи на пальцах или в уме: ${a} + ${b}`,
    explanation: `${a} + ${b} = ${sum}`,
  };
  const sa = rand(1, 9);
  const sb = rand(1, 10 - sa);
  return withId({
    ...base,
    similar: makeSimilarNumber(base, `${sa} + ${sb} = ?`, sa + sb, "Сложи до 10", `${sa} + ${sb} = ${sa + sb}`),
  });
}

export function makeAddTo20NoBridge(): MathExercise {
  const a = rand(1, 9);
  const b = rand(1, Math.min(9, 10 - a));
  const tens = rand(0, 1) * 10;
  const left = tens + a;
  const sum = left + b;
  const base = {
    category: "calc" as const,
    ...skillField("add_to_20_no_bridge", "add"),
    prompt: `${left} + ${b} = ?`,
    answerKind: "number" as const,
    answer: sum,
    hint: `Единицы: ${a} + ${b} = ${a + b}, без перехода через десяток.`,
    explanation: `${left} + ${b} = ${sum}`,
  };
  return withId({
    ...base,
    similar: makeSimilarNumber(
      base,
      `${left} + ${Math.max(1, b - 1)} = ?`,
      left + Math.max(1, b - 1),
      "Сложи единицы",
      `${left} + ${Math.max(1, b - 1)} = ${left + Math.max(1, b - 1)}`,
    ),
  });
}

export function makeAddTo20Bridge(): MathExercise {
  const a = rand(2, 9);
  const need = 10 - a;
  const b = rand(need + 1, 9);
  const sum = a + b;
  const tips = addBridgeHint(a, b);
  const base = {
    category: "calc" as const,
    ...skillField("add_to_20_bridge", "add"),
    prompt: `${a} + ${b} = ?`,
    answerKind: "number" as const,
    answer: sum,
    hint: tips.hint,
    explanation: tips.explanation,
  };
  const a2 = rand(2, 9);
  const need2 = 10 - a2;
  const b2 = rand(need2 + 1, 9);
  const tips2 = addBridgeHint(a2, b2);
  return withId({
    ...base,
    similar: makeSimilarNumber(base, `${a2} + ${b2} = ?`, a2 + b2, tips2.hint, tips2.explanation),
  });
}

export function makeAddTens(): MathExercise {
  const a = rand(1, 8) * 10;
  const b = rand(1, 9 - a / 10) * 10;
  const sum = a + b;
  const base = {
    category: "calc" as const,
    ...skillField("add_tens", "add"),
    prompt: `${a} + ${b} = ?`,
    answerKind: "number" as const,
    answer: sum,
    hint: `${a / 10} десятков + ${b / 10} десятков = ${sum / 10} десятков`,
    explanation: `${a} + ${b} = ${sum}`,
  };
  return withId({ ...base });
}

export function makeAdd2digit1digit(): MathExercise {
  const a = rand(11, 39);
  const b = rand(2, 9);
  const sum = a + b;
  const units = a % 10;
  const bridge = units + b >= 10;
  const hint = bridge
    ? addBridgeHint(units, b).hint.replace(String(units), String(a))
    : `${a} + ${b}: прибавь ${b} к единицам.`;
  const base = {
    category: "calc" as const,
    ...skillField("add_2digit_1digit", "add"),
    prompt: `${a} + ${b} = ?`,
    answerKind: "number" as const,
    answer: sum,
    hint,
    explanation: `${a} + ${b} = ${sum}`,
  };
  return withId({ ...base });
}

export function makeAdd2digit2digit(): MathExercise {
  const a = rand(12, 45);
  const b = rand(11, 40);
  const sum = a + b;
  const base = {
    category: "calc" as const,
    ...skillField("add_2digit_2digit", "add"),
    prompt: `${a} + ${b} = ?`,
    answerKind: "number" as const,
    answer: sum,
    hint: `Сложи десятки и единицы отдельно: ${a} + ${b}`,
    explanation: `${a} + ${b} = ${sum}`,
  };
  return withId({ ...base });
}

// --- Вычитание ---

export function makeSubTo10(): MathExercise {
  const a = rand(2, 10);
  const b = rand(1, a);
  const base = {
    category: "calc" as const,
    ...skillField("sub_to_10", "sub"),
    prompt: `${a} − ${b} = ?`,
    answerKind: "number" as const,
    answer: a - b,
    hint: `От ${a} отними ${b}`,
    explanation: `${a} − ${b} = ${a - b}`,
  };
  return withId({ ...base });
}

export function makeSubTo20NoBridge(): MathExercise {
  const a = rand(11, 19);
  const units = a % 10;
  const b = rand(1, Math.max(1, units));
  const base = {
    category: "calc" as const,
    ...skillField("sub_to_20_no_bridge", "sub"),
    prompt: `${a} − ${b} = ?`,
    answerKind: "number" as const,
    answer: a - b,
    hint: `Единиц хватает: ${units} − ${b} = ${units - b}`,
    explanation: `${a} − ${b} = ${a - b}`,
  };
  return withId({ ...base });
}

export function makeSubTo20Bridge(): MathExercise {
  const a = rand(11, 18);
  const units = a % 10;
  const b = rand(units + 1, 9);
  const tips = subBridgeHint(a, b);
  const base = {
    category: "calc" as const,
    ...skillField("sub_to_20_bridge", "sub"),
    prompt: `${a} − ${b} = ?`,
    answerKind: "number" as const,
    answer: a - b,
    hint: tips.hint,
    explanation: tips.explanation,
  };
  const a2 = rand(11, 18);
  const u2 = a2 % 10;
  const b2 = rand(u2 + 1, 9);
  const tips2 = subBridgeHint(a2, b2);
  return withId({
    ...base,
    similar: makeSimilarNumber(base, `${a2} − ${b2} = ?`, a2 - b2, tips2.hint, tips2.explanation),
  });
}

export function makeSubTens(): MathExercise {
  const a = rand(2, 9) * 10;
  const b = rand(1, a / 10 - 1) * 10;
  const base = {
    category: "calc" as const,
    ...skillField("sub_tens", "sub"),
    prompt: `${a} − ${b} = ?`,
    answerKind: "number" as const,
    answer: a - b,
    hint: `${a / 10} десятков − ${b / 10} = ${(a - b) / 10}`,
    explanation: `${a} − ${b} = ${a - b}`,
  };
  return withId({ ...base });
}

export function makeSub2digit1digit(): MathExercise {
  const a = rand(15, 49);
  const b = rand(2, 9);
  const units = a % 10;
  const bridge = b > units;
  const hint = bridge ? subBridgeHint(a, b).hint : `${a} − ${b}: вычти из единиц.`;
  const base = {
    category: "calc" as const,
    ...skillField("sub_2digit_1digit", "sub"),
    prompt: `${a} − ${b} = ?`,
    answerKind: "number" as const,
    answer: a - b,
    hint,
    explanation: `${a} − ${b} = ${a - b}`,
  };
  return withId({ ...base });
}

export function makeSub2digit2digit(): MathExercise {
  const a = rand(25, 70);
  const b = rand(11, Math.min(40, a - 1));
  const base = {
    category: "calc" as const,
    ...skillField("sub_2digit_2digit", "sub"),
    prompt: `${a} − ${b} = ?`,
    answerKind: "number" as const,
    answer: a - b,
    hint: `Вычитай десятки и единицы: ${a} − ${b}`,
    explanation: `${a} − ${b} = ${a - b}`,
  };
  return withId({ ...base });
}

function makeCalc(): MathExercise {
  return pick([
    makeAddTo10,
    makeAddTo20NoBridge,
    makeAddTo20Bridge,
    makeAddTens,
    makeSubTo10,
    makeSubTo20NoBridge,
    makeSubTo20Bridge,
    makeSubTens,
  ])();
}

// --- Сравнение ---

export function makeCompareNumbers(): MathExercise {
  const a = rand(1, 40);
  let b = rand(1, 40);
  if (Math.random() < 0.2) b = a;
  let op: CompareOp = "=";
  if (a < b) op = "<";
  else if (a > b) op = ">";
  return withId({
    category: "compare",
    ...skillField("compare_numbers", "compare"),
    prompt: `${a} ○ ${b}`,
    answerKind: "compare",
    answer: op,
    hint: `Какое число больше: ${a} или ${b}?`,
    explanation: `${a} ${op} ${b}`,
  });
}

export function makeCompareExpressionNumber(): MathExercise {
  const leftA = rand(2, 15);
  const leftB = rand(2, 12);
  const right = rand(5, 30);
  const left = leftA + leftB;
  let op: CompareOp = "=";
  if (left < right) op = "<";
  else if (left > right) op = ">";
  return withId({
    category: "compare",
    ...skillField("compare_expression_number", "compare"),
    prompt: `${leftA} + ${leftB} ○ ${right}`,
    answerKind: "compare",
    answer: op,
    hint: `Сначала сложи: ${leftA} + ${leftB} = ${left}. Потом сравни с ${right}.`,
    explanation: `${leftA} + ${leftB} = ${left}, значит ${left} ${op} ${right}`,
    similar: {
      category: "compare",
      ...skillField("compare_expression_number", "compare"),
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

export function makeCompareExpressions(): MathExercise {
  const a = rand(2, 12);
  const b = rand(2, 10);
  const c = rand(2, 12);
  const d = rand(2, 10);
  const left = a + b;
  const right = c + d;
  let op: CompareOp = "=";
  if (left < right) op = "<";
  else if (left > right) op = ">";
  return withId({
    category: "compare",
    ...skillField("compare_expressions", "compare"),
    prompt: `${a} + ${b} ○ ${c} + ${d}`,
    answerKind: "compare",
    answer: op,
    hint: `Слева ${a}+${b}=${left}, справа ${c}+${d}=${right}`,
    explanation: `${left} ${op} ${right}`,
  });
}

function makeCompare(): MathExercise {
  return pick([makeCompareNumbers, makeCompareExpressionNumber, makeCompareExpressions])();
}

// --- Неизвестное ---

export function makeMissingAddend(): MathExercise {
  const a = rand(2, 15);
  const sum = rand(a + 2, 25);
  const miss = sum - a;
  return withId({
    category: "missing",
    ...skillField("missing_addend", "missing_add"),
    prompt: `${a} + □ = ${sum}`,
    answerKind: "number",
    answer: miss,
    hint: `Какое число добавить к ${a}, чтобы получить ${sum}? ${sum} − ${a} = ?`,
    explanation: `${a} + ${miss} = ${sum}`,
    similar: {
      category: "missing",
      ...skillField("missing_addend", "missing_add"),
      prompt: `${a + 1} + □ = ${sum + 1}`,
      answerKind: "number",
      answer: sum - a,
      hint: "Вычти известное",
      explanation: `${a + 1} + ${sum - a} = ${sum + 1}`,
    },
  });
}

export function makeMissingMinuend(): MathExercise {
  const b = rand(2, 12);
  const result = rand(5, 20);
  const miss = result + b;
  return withId({
    category: "missing",
    ...skillField("missing_minuend", "missing_sub"),
    prompt: `□ − ${b} = ${result}`,
    answerKind: "number",
    answer: miss,
    hint: `Какое число минус ${b} даёт ${result}? ${result} + ${b} = ?`,
    explanation: `${miss} − ${b} = ${result}`,
  });
}

export function makeMissingSubtrahend(): MathExercise {
  const a = rand(8, 25);
  const b = rand(2, Math.min(10, a - 1));
  const miss = a - b;
  return withId({
    category: "missing",
    ...skillField("missing_subtrahend", "missing_sub2"),
    prompt: `${a} − □ = ${miss}`,
    answerKind: "number",
    answer: b,
    hint: `${a} − ? = ${miss}. Значит ? = ${a} − ${miss}`,
    explanation: `${a} − ${b} = ${miss}`,
  });
}

function makeMissing(): MathExercise {
  return pick([makeMissingAddend, makeMissingMinuend, makeMissingSubtrahend])();
}

// --- Задачи ---

export function makeWordAdd(): MathExercise {
  const a = rand(4, 12);
  const b = rand(3, 10);
  return withId({
    category: "word",
    ...skillField("word_add", "word_add"),
    prompt: "Сколько всего?",
    lines: [`В коробке ${a} яблок.`, `Положили ещё ${b}.`],
    answerKind: "number",
    answer: a + b,
    hint: `${a} + ${b} = ?`,
    explanation: `${a} + ${b} = ${a + b}`,
  });
}

export function makeWordSub(): MathExercise {
  const a = rand(10, 20);
  const b = rand(3, Math.min(8, a - 1));
  return withId({
    category: "word",
    ...skillField("word_sub", "word_sub"),
    prompt: "Сколько осталось?",
    lines: [`Было ${a} конфет.`, `Съели ${b}.`],
    answerKind: "number",
    answer: a - b,
    hint: `${a} − ${b} = ?`,
    explanation: `${a} − ${b} = ${a - b}`,
  });
}

export function makeWordTwoStep(): MathExercise {
  const had = rand(6, 15);
  const gave = rand(2, Math.min(5, had - 1));
  const bought = rand(2, 8);
  const ans = had - gave + bought;
  return withId({
    category: "word",
    ...skillField("word_two_step", "word_mix"),
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
}

export function makeWordCompareMore(): MathExercise {
  const small = rand(5, 15);
  const more = rand(2, 8);
  const big = small + more;
  return withId({
    category: "word",
    ...skillField("word_compare_more"),
    prompt: "На сколько больше?",
    lines: [`У Пети ${big} марок.`, `У Коли ${small} марок.`, `На сколько у Пети больше?`],
    answerKind: "number",
    answer: more,
    hint: `${big} − ${small} = ?`,
    explanation: `${big} − ${small} = ${more}`,
  });
}

export function makeWordCompareLess(): MathExercise {
  const small = rand(5, 15);
  const less = rand(2, 8);
  const big = small + less;
  return withId({
    category: "word",
    ...skillField("word_compare_less"),
    prompt: "На сколько меньше?",
    lines: [`Лента ${big} см.`, `Другая лента ${small} см.`, `На сколько вторая короче?`],
    answerKind: "number",
    answer: less,
    hint: `${big} − ${small} = ?`,
    explanation: `${big} − ${small} = ${less}`,
  });
}

export function makeWordMoney(): MathExercise {
  const had = rand(20, 50);
  const spent = rand(5, Math.min(25, had - 1));
  return withId({
    category: "word",
    ...skillField("word_money"),
    prompt: "Сколько рублей осталось?",
    lines: [`Было ${had} ₽.`, `Купили тетрадь за ${spent} ₽.`],
    answerKind: "number",
    answer: had - spent,
    hint: `${had} − ${spent} = ?`,
    explanation: `${had} − ${spent} = ${had - spent}`,
  });
}

export function makeWordLength(): MathExercise {
  const a = rand(8, 20);
  const b = rand(3, 10);
  return withId({
    category: "word",
    ...skillField("word_length"),
    prompt: "Какая длина всего?",
    lines: [`Первый отрезок ${a} см.`, `Второй ${b} см.`, `Сколько см вместе?`],
    answerKind: "number",
    answer: a + b,
    hint: `${a} + ${b} = ?`,
    explanation: `${a} + ${b} = ${a + b}`,
  });
}

function makeWord(): MathExercise {
  return pick([
    makeWordTwoStep,
    makeWordAdd,
    makeWordSub,
    makeWordCompareMore,
    makeWordCompareLess,
    makeWordMoney,
    makeWordLength,
  ])();
}

// --- Ряды ---

export function makeSeriesAdd(): MathExercise {
  const step = pick([2, 3, 5, 10]);
  const start = rand(1, 10);
  const seq = [start, start + step, start + step * 2];
  const next = start + step * 3;
  return withId({
    category: "series",
    ...skillField("series_add", "series"),
    prompt: `${seq.join(", ")}, □, …`,
    answerKind: "number",
    answer: next,
    hint: `Шаг +${step}. После ${seq[2]} будет ${next}.`,
    explanation: `Ряд с шагом +${step}: следующее ${next}`,
  });
}

export function makeSeriesSub(): MathExercise {
  const step = pick([2, 3, 5]);
  const start = rand(20, 40);
  const seq = [start, start - step, start - step * 2];
  const next = start - step * 3;
  return withId({
    category: "series",
    ...skillField("series_sub", "series"),
    prompt: `${seq.join(", ")}, □, …`,
    answerKind: "number",
    answer: next,
    hint: `Шаг −${step}. После ${seq[2]} будет ${next}.`,
    explanation: `Убывающий ряд с шагом ${step}: следующее ${next}`,
  });
}

function makeSeries(): MathExercise {
  return pick([makeSeriesAdd, makeSeriesSub])();
}

// --- Величины ---

export function makeLengthDmCm(): MathExercise {
  const dm = rand(1, 5);
  const cm = rand(0, 9);
  const total = dm * 10 + cm;
  return withId({
    category: "length",
    ...skillField("length_dm_cm"),
    prompt: `${dm} дм ${cm} см = ? см`,
    answerKind: "number",
    answer: total,
    hint: `1 дм = 10 см. ${dm} × 10 + ${cm} = ?`,
    explanation: `${dm} дм ${cm} см = ${total} см`,
  });
}

export function makeLengthCmDm(): MathExercise {
  const dm = rand(1, 5);
  const cm = rand(1, 9);
  const total = dm * 10 + cm;
  const answer: LengthPair = { dm, cm };
  return withId({
    category: "length",
    ...skillField("length_cm_dm"),
    prompt: `${total} см = ? дм ? см`,
    answerKind: "pair",
    answer,
    hint: `Сколько целых десятков в ${total}? Остаток — сантиметры.`,
    explanation: `${total} см = ${dm} дм ${cm} см`,
  });
}

export function makeLengthCompare(): MathExercise {
  const a = rand(5, 25);
  const bDm = rand(1, 3);
  const bCm = rand(0, 9);
  const b = bDm * 10 + bCm;
  let op: CompareOp = "=";
  if (a < b) op = "<";
  else if (a > b) op = ">";
  return withId({
    category: "length",
    ...skillField("length_compare"),
    prompt: `${a} см ○ ${bDm} дм ${bCm} см`,
    answerKind: "compare",
    answer: op,
    hint: `${bDm} дм ${bCm} см = ${b} см. Сравни с ${a}.`,
    explanation: `${a} см ${op} ${b} см`,
  });
}

function makeLength(): MathExercise {
  return pick([makeLengthDmCm, makeLengthCmDm, makeLengthCompare])();
}

// --- Геометрия ---

export function makeSegmentLength(): MathExercise {
  const whole = rand(12, 30);
  const part = rand(3, whole - 3);
  const other = whole - part;
  return withId({
    category: "geometry",
    ...skillField("segment_length"),
    prompt: "Длина второго отрезка?",
    lines: [`Весь отрезок ${whole} см.`, `Первая часть ${part} см.`, `Сколько см вторая?`],
    answerKind: "number",
    answer: other,
    hint: `${whole} − ${part} = ?`,
    explanation: `${whole} − ${part} = ${other}`,
  });
}

export function makeSegmentLonger(): MathExercise {
  const a = rand(5, 20);
  const n = rand(2, 10);
  return withId({
    category: "geometry",
    ...skillField("segment_longer"),
    prompt: "Какая длина?",
    lines: [`Отрезок AB = ${a} см.`, `Отрезок CD на ${n} см длиннее.`, `Чему равна длина CD?`],
    answerKind: "number",
    answer: a + n,
    hint: `${a} + ${n} = ?`,
    explanation: `${a} + ${n} = ${a + n}`,
  });
}

export function makeSegmentShorter(): MathExercise {
  const a = rand(10, 30);
  const n = rand(2, Math.min(9, a - 1));
  return withId({
    category: "geometry",
    ...skillField("segment_shorter"),
    prompt: "Какая длина?",
    lines: [`Отрезок AB = ${a} см.`, `Отрезок CD на ${n} см короче.`, `Чему равна длина CD?`],
    answerKind: "number",
    answer: a - n,
    hint: `${a} − ${n} = ?`,
    explanation: `${a} − ${n} = ${a - n}`,
  });
}

function makeGeometry(): MathExercise {
  return pick([makeSegmentLength, makeSegmentLonger, makeSegmentShorter])();
}

// --- Умножение ---

export function makeMultiplyFact(factor?: number, other?: number): MathExercise {
  const a = factor ?? rand(2, 9);
  const b = other ?? rand(1, 9);
  const product = a * b;
  const groups = Array(a).fill(b).join(" + ");
  return withId({
    category: "multiply",
    ...skillField(timesSkillId(a), `times_${a}`),
    prompt: `${a} × ${b} = ?`,
    answerKind: "number",
    answer: product,
    hint: `${a} группы по ${b}: ${groups} = ${product}`,
    explanation: `${a} × ${b} = ${product} (${a} групп по ${b})`,
    similar: {
      category: "multiply",
      ...skillField(timesSkillId(a), `times_${a}`),
      prompt: `${a} × ${Math.max(1, b === 1 ? 2 : b - 1)} = ?`,
      answerKind: "number",
      answer: a * Math.max(1, b === 1 ? 2 : b - 1),
      hint: `${a} группы по ${Math.max(1, b === 1 ? 2 : b - 1)}`,
      explanation: `${a} × ${Math.max(1, b === 1 ? 2 : b - 1)} = ${a * Math.max(1, b === 1 ? 2 : b - 1)}`,
    },
  });
}

function makeMultiply(): MathExercise {
  return makeMultiplyFact();
}

export function makeBySkillId(skillId: MathSkillId): MathExercise {
  switch (skillId) {
    case "add_to_10":
      return makeAddTo10();
    case "add_to_20_no_bridge":
      return makeAddTo20NoBridge();
    case "add_to_20_bridge":
      return makeAddTo20Bridge();
    case "add_tens":
      return makeAddTens();
    case "add_2digit_1digit":
      return makeAdd2digit1digit();
    case "add_2digit_2digit":
      return makeAdd2digit2digit();
    case "sub_to_10":
      return makeSubTo10();
    case "sub_to_20_no_bridge":
      return makeSubTo20NoBridge();
    case "sub_to_20_bridge":
      return makeSubTo20Bridge();
    case "sub_tens":
      return makeSubTens();
    case "sub_2digit_1digit":
      return makeSub2digit1digit();
    case "sub_2digit_2digit":
      return makeSub2digit2digit();
    case "compare_numbers":
      return makeCompareNumbers();
    case "compare_expression_number":
      return makeCompareExpressionNumber();
    case "compare_expressions":
      return makeCompareExpressions();
    case "missing_addend":
      return makeMissingAddend();
    case "missing_minuend":
      return makeMissingMinuend();
    case "missing_subtrahend":
      return makeMissingSubtrahend();
    case "word_add":
      return makeWordAdd();
    case "word_sub":
      return makeWordSub();
    case "word_compare_more":
      return makeWordCompareMore();
    case "word_compare_less":
      return makeWordCompareLess();
    case "word_two_step":
      return makeWordTwoStep();
    case "word_money":
      return makeWordMoney();
    case "word_length":
      return makeWordLength();
    case "series_add":
      return makeSeriesAdd();
    case "series_sub":
      return makeSeriesSub();
    case "length_cm_dm":
      return makeLengthCmDm();
    case "length_dm_cm":
      return makeLengthDmCm();
    case "length_compare":
      return makeLengthCompare();
    case "segment_length":
      return makeSegmentLength();
    case "segment_longer":
      return makeSegmentLonger();
    case "segment_shorter":
      return makeSegmentShorter();
    case "multiplication_concept":
    case "times_2":
    case "times_3":
    case "times_4":
    case "times_5":
    case "times_6":
    case "times_7":
    case "times_8":
    case "times_9": {
      const n = skillId === "multiplication_concept" ? rand(2, 5) : Number(skillId.replace("times_", ""));
      return makeMultiplyFact(n);
    }
    case "division_concept":
    case "division_by_2":
    case "division_by_3":
    case "division_by_4":
    case "division_by_5":
    case "division_by_6":
    case "division_by_7":
    case "division_by_8":
    case "division_by_9":
      // Деление пока не в UI — безопасный fallback на умножение
      return makeMultiplyFact(2);
    default: {
      const _exhaustive: never = skillId;
      return _exhaustive;
    }
  }
}

const BUILDERS: Record<MathCategory, () => MathExercise> = {
  calc: makeCalc,
  compare: makeCompare,
  missing: makeMissing,
  word: makeWord,
  series: makeSeries,
  multiply: makeMultiply,
  length: makeLength,
  geometry: makeGeometry,
};

function shuffleInPlace<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
}

/** Сессия «Сегодня»: без умножения, пока навыки не открыты явно. */
export function buildTodaySession(
  count = 10,
  allowedSkills: MathSkillId[] = DEFAULT_TODAY_SKILLS,
): MathExercise[] {
  const pool = allowedSkills.length > 0 ? allowedSkills : DEFAULT_TODAY_SKILLS;
  const out: MathExercise[] = [];
  for (let i = 0; i < count; i += 1) {
    out.push(makeBySkillId(pool[i % pool.length]!));
  }
  return shuffleInPlace(out);
}

export function buildTrainSession(category: MathCategory, count = 10): MathExercise[] {
  return Array.from({ length: count }, () => BUILDERS[category]());
}

export function buildSkillSession(skillId: MathSkillId, count = 10): MathExercise[] {
  return Array.from({ length: count }, () => makeBySkillId(skillId));
}

export function buildCheckSession(count = 10, skills: MathSkillId[] = DEFAULT_TODAY_SKILLS): MathExercise[] {
  return buildTodaySession(count, skills);
}

export function buildTableSession(factor: number, count = 10): MathExercise[] {
  const out: MathExercise[] = [];
  const used = new Set<number>();
  while (out.length < count) {
    const b = rand(1, 10);
    if (used.has(b) && used.size < 10) continue;
    used.add(b);
    out.push(makeMultiplyFact(factor, b === 10 ? 10 : b));
  }
  return out;
}

/** Исправить hint в таблице: a групп по b (не наоборот). */
export function multiplicationGroupsHint(a: number, b: number): string {
  return `${a} группы по ${b}: ${Array(a).fill(b).join(" + ")} = ${a * b}`;
}
