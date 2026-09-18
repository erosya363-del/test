/** Учебные темы русского — слова могут постепенно получать поля. */

export type SpellingTopic =
  | "unstressed_vowel"
  | "double_consonant"
  | "soft_sign"
  | "zhi_shi"
  | "cha_shcha"
  | "capital"
  | "other";

export type WordMeta = {
  spellingTopic?: SpellingTopic;
  difficulty?: 1 | 2 | 3;
  tags?: string[];
};

export const SPELLING_TOPIC_TITLES: Record<SpellingTopic, string> = {
  unstressed_vowel: "Безударная гласная",
  double_consonant: "Удвоенная согласная",
  soft_sign: "Мягкий знак",
  zhi_shi: "Жи–ши",
  cha_shcha: "Ча–ща",
  capital: "Заглавная буква",
  other: "Другое",
};

/** Постепенно заполняется; слова без записи работают как раньше. */
export const WORD_META_BY_PLAIN: Record<string, WordMeta> = {
  класс: { spellingTopic: "double_consonant", difficulty: 2, tags: ["школа"] },
  русский: { spellingTopic: "double_consonant", difficulty: 2, tags: ["школа"] },
  хорошо: { spellingTopic: "unstressed_vowel", difficulty: 2 },
  спасибо: { spellingTopic: "unstressed_vowel", difficulty: 2 },
  пожалуйста: { spellingTopic: "unstressed_vowel", difficulty: 3, tags: ["вежливость"] },
  тетрадь: { spellingTopic: "soft_sign", difficulty: 2, tags: ["школа"] },
  учитель: { spellingTopic: "unstressed_vowel", difficulty: 2, tags: ["школа"] },
  ученик: { spellingTopic: "unstressed_vowel", difficulty: 2, tags: ["школа"] },
  ученица: { spellingTopic: "unstressed_vowel", difficulty: 2, tags: ["школа"] },
  Москва: { spellingTopic: "capital", difficulty: 1, tags: ["имя"] },
  Россия: { spellingTopic: "capital", difficulty: 1, tags: ["имя"] },
  суббота: { spellingTopic: "double_consonant", difficulty: 2 },
  машина: { spellingTopic: "unstressed_vowel", difficulty: 1 },
  молоко: { spellingTopic: "unstressed_vowel", difficulty: 1 },
  собака: { spellingTopic: "unstressed_vowel", difficulty: 1 },
  карандаш: { spellingTopic: "unstressed_vowel", difficulty: 2, tags: ["школа"] },
  рисунок: { spellingTopic: "unstressed_vowel", difficulty: 2 },
  медведь: { spellingTopic: "soft_sign", difficulty: 2 },
  жизнь: { spellingTopic: "zhi_shi", difficulty: 2 },
  шишка: { spellingTopic: "zhi_shi", difficulty: 1 },
  чашка: { spellingTopic: "cha_shcha", difficulty: 1 },
  щавель: { spellingTopic: "cha_shcha", difficulty: 3 },
};

export function wordMetaFor(plain: string): WordMeta | undefined {
  return WORD_META_BY_PLAIN[plain] ?? WORD_META_BY_PLAIN[plain.toLowerCase()];
}
