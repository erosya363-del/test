import { useEffect, useMemo, useState } from "react";
import {
  MATH_CURRICULUM,
  SECTION_TITLES,
  skillsBySection,
  type MathSection,
} from "../math/curriculum";
import {
  encodeMathStatsCompact,
  encodeSkillStatesCompact,
  loadMathProgress,
  pullAndMergeMathCloud,
  saveMathProgress,
  setSkillState,
  type MathProgressBundle,
} from "../math/progress";
import { loadMathCloudStats, loadMathCloudStates, saveMathCloudStats, saveMathCloudStates } from "../data/cloud";
import { STAT_MIN_SEEN, type SkillState } from "../math/types";
import type { Settings } from "../data/types";
import { WORD_META_BY_PLAIN } from "../data/ruCurriculum";

const GROUP_SKILLS: { label: string; ids: string[] }[] = [
  { label: "Сложение до 20", ids: ["add_to_10", "add_to_20_no_bridge"] },
  { label: "Вычитание до 20", ids: ["sub_to_10", "sub_to_20_no_bridge"] },
  { label: "Через десяток", ids: ["add_to_20_bridge", "sub_to_20_bridge"] },
  { label: "Сравнение", ids: ["compare_numbers", "compare_expression_number", "compare_expressions"] },
  { label: "Найди число", ids: ["missing_addend", "missing_minuend", "missing_subtrahend"] },
  { label: "Задачи", ids: ["word_add", "word_sub", "word_two_step", "word_compare_more", "word_money"] },
  { label: "×2", ids: ["times_2"] },
  { label: "×3", ids: ["times_3"] },
];

function pctFor(progress: MathProgressBundle, ids: string[]): string {
  let seen = 0;
  let first = 0;
  for (const id of ids) {
    const s = progress.stats[id];
    if (!s) continue;
    seen += s.seen;
    first += s.firstTryCorrect;
  }
  if (seen < STAT_MIN_SEEN) return "мало данных";
  return `${Math.round((first / seen) * 100)}%`;
}

export function PapaStudyPanel({
  settings,
  onSaveMathRewards,
}: {
  settings: Settings;
  onSaveMathRewards: (patch: Partial<Settings>) => void;
}) {
  const [progress, setProgress] = useState(() => loadMathProgress());
  const [section, setSection] = useState<MathSection>("addition");
  const [studySub, setStudySub] = useState<"math" | "ru">("math");
  const [mFirst, setMFirst] = useState(String(settings.mathRewardFirst ?? 2));
  const [mRetry, setMRetry] = useState(String(settings.mathRewardRetry ?? 1));
  const [mHint, setMHint] = useState(String(settings.mathRewardHint ?? 0));
  const [mGave, setMGave] = useState(String(settings.mathRewardGaveUp ?? 0));

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const merged = await pullAndMergeMathCloud(
          loadMathCloudStats,
          loadMathCloudStates,
          saveMathCloudStats,
          saveMathCloudStates,
        );
        if (!cancelled) setProgress(merged);
      } catch {
        /* offline */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const hard = useMemo(() => {
    return Object.values(progress.stats)
      .filter((s) => s.seen >= STAT_MIN_SEEN && s.mastery < 0.55)
      .sort((a, b) => a.mastery - b.mastery)
      .slice(0, 5);
  }, [progress]);

  const persist = (next: MathProgressBundle) => {
    setProgress(next);
    saveMathProgress(next);
    void saveMathCloudStats(encodeMathStatsCompact(next.stats));
    void saveMathCloudStates(encodeSkillStatesCompact(next.states));
  };

  const changeState = (skillId: string, state: SkillState) => {
    if (state === "mastered") {
      const ok = window.confirm("Отметить навык как освоенный?");
      if (!ok) return;
    }
    persist(setSkillState(progress, skillId as never, state));
  };

  return (
    <div className="w-full space-y-4">
      <div className="papa-tabs">
        <button
          type="button"
          className={studySub === "math" ? "btn-primary papa-tab" : "btn-secondary papa-tab"}
          onClick={() => setStudySub("math")}
        >
          Математика
        </button>
        <button
          type="button"
          className={studySub === "ru" ? "btn-primary papa-tab" : "btn-secondary papa-tab"}
          onClick={() => setStudySub("ru")}
        >
          Русский
        </button>
      </div>

      {studySub === "ru" && (
        <div className="glass-card w-full space-y-2">
          <p className="font-black text-lg">Русский</p>
          <p className="text-white/60 text-sm">Буквы · Ударения · Слух · Диктант · трудные слова</p>
          <p className="text-white/50 text-sm">
            Тем с метками: {Object.keys(WORD_META_BY_PLAIN).length}. Полная статистика по темам — во вкладке «Сводка» и словах с ошибками.
          </p>
        </div>
      )}

      {studySub === "math" && (
        <>
          <div className="glass-card w-full space-y-2">
            <p className="font-black text-lg">Прогресс</p>
            {GROUP_SKILLS.map((g) => (
              <div key={g.label} className="flex justify-between gap-2 text-sm">
                <span className="text-white/80">{g.label}</span>
                <span className="font-black text-yellow-200 tabular-nums">{pctFor(progress, g.ids)}</span>
              </div>
            ))}
          </div>

          <div className="glass-card w-full space-y-2">
            <p className="font-black text-lg">Сейчас сложно</p>
            {hard.length === 0 ? (
              <p className="text-white/50 text-sm">Пока недостаточно данных.</p>
            ) : (
              hard.map((s) => (
                <div key={s.skillId} className="bg-white/5 rounded-2xl p-3 border border-white/10">
                  <p className="font-black text-sm">{MATH_CURRICULUM.find((c) => c.skillId === s.skillId)?.title ?? s.skillId}</p>
                  <p className="text-orange-300 text-xs">
                    mastery {Math.round(s.mastery * 100)}% · ошибок {s.failed}/{s.seen}
                  </p>
                </div>
              ))
            )}
          </div>

          <div className="glass-card w-full space-y-3">
            <p className="font-black text-lg">Темы</p>
            <div className="flex flex-wrap gap-1">
              {(Object.keys(SECTION_TITLES) as MathSection[])
                .filter((s) => s !== "division")
                .map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={section === s ? "btn-primary papa-tab" : "btn-secondary papa-tab"}
                    onClick={() => setSection(s)}
                  >
                    {SECTION_TITLES[s]}
                  </button>
                ))}
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {skillsBySection(section).map((skill) => {
                const st = progress.states[skill.skillId] ?? skill.defaultState;
                return (
                  <div key={skill.skillId} className="bg-white/5 rounded-2xl p-3 border border-white/10">
                    <p className="font-black text-sm mb-2">{skill.title}</p>
                    <select
                      className="game-input text-sm"
                      value={st}
                      onChange={(e) => changeState(skill.skillId, e.target.value as SkillState)}
                    >
                      <option value="locked">Закрыт</option>
                      <option value="learning">Учу</option>
                      <option value="practice">Тренирую</option>
                      <option value="mastered">Освоен</option>
                    </select>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="glass-card w-full space-y-3">
            <p className="font-black text-lg">Награды математики</p>
            <label className="block">
              <span className="field-label">С первой попытки</span>
              <input className="game-input" inputMode="numeric" value={mFirst} onChange={(e) => setMFirst(e.target.value.replace(/\D/g, ""))} />
            </label>
            <label className="block">
              <span className="field-label">Исправил сам</span>
              <input className="game-input" inputMode="numeric" value={mRetry} onChange={(e) => setMRetry(e.target.value.replace(/\D/g, ""))} />
            </label>
            <label className="block">
              <span className="field-label">С подсказкой</span>
              <input className="game-input" inputMode="numeric" value={mHint} onChange={(e) => setMHint(e.target.value.replace(/\D/g, ""))} />
            </label>
            <label className="block">
              <span className="field-label">Не решил</span>
              <input className="game-input" inputMode="numeric" value={mGave} onChange={(e) => setMGave(e.target.value.replace(/\D/g, ""))} />
            </label>
            <button
              type="button"
              className="w-full btn-primary play-cta"
              onClick={() =>
                onSaveMathRewards({
                  mathRewardFirst: Number(mFirst) || 0,
                  mathRewardRetry: Number(mRetry) || 0,
                  mathRewardHint: Number(mHint) || 0,
                  mathRewardGaveUp: Number(mGave) || 0,
                })
              }
            >
              Сохранить награды
            </button>
          </div>
        </>
      )}
    </div>
  );
}
