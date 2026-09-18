import { playClickSound, resumeAudio } from "./sounds";
import { todayDayKey } from "./data/cloud";
import type { TodayTask } from "./data/types";
import { useGameStore } from "./data/GameStore";

type Props = {
  onBack: () => void;
  onStartTask: (task: TodayTask) => void;
};

export function TodayScreen({ onBack, onStartTask }: Props) {
  const store = useGameStore();
  const day = todayDayKey();
  const today = store.tasks.filter((row) => row.day === day);
  const waiting = today.filter((row) => row.status === "wait");
  const done = today.filter((row) => row.status === "done");

  return (
    <div className="app-screen">
      <div className="play-stage">
        <div className="text-center mb-3">
          <div className="text-6xl mb-2 animate-float">☀️</div>
          <h1 className="text-3xl font-black">
            <span className="bg-gradient-to-r from-yellow-200 via-pink-200 to-purple-200 bg-clip-text text-transparent">
              Сегодня
            </span>
          </h1>
          <p className="text-purple-200/80 text-sm mt-1">Задания от папы</p>
        </div>

        <div className="glass-card w-full !p-3 mb-3">
          <div className="flex justify-between items-center text-sm">
            <span className="text-white/50">Ждут</span>
            <span className="font-black text-yellow-300">{waiting.length}</span>
          </div>
          <div className="flex justify-between items-center text-sm mt-1">
            <span className="text-white/50">Сделано</span>
            <span className="font-black text-green-300">{done.length}</span>
          </div>
        </div>

        {today.length === 0 ? (
          <div className="glass-card w-full text-center space-y-2 mb-3">
            <p className="font-black text-lg">Пока пусто</p>
            <p className="text-white/60 text-sm">Папа ещё не задал. Можно играть в Русский или Математику.</p>
          </div>
        ) : (
          <div className="space-y-2 w-full mb-3">
            {today.map((task) => (
              <button
                key={task.id}
                type="button"
                disabled={task.status === "done"}
                className="w-full glass-card !p-4 text-left active:scale-[0.98] transition-transform disabled:opacity-50"
                onClick={() => {
                  if (task.status === "done") return;
                  playClickSound();
                  resumeAudio();
                  onStartTask(task);
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-black text-base">{task.title}</p>
                    <p className="text-white/50 text-xs mt-1">
                      {task.status === "done" ? "Готово" : "Нажми, чтобы начать"}
                    </p>
                  </div>
                  <p className={`font-black tabular-nums shrink-0 ${task.reward >= 0 ? "text-yellow-300" : "text-orange-300"}`}>
                    {task.reward > 0 ? `+${task.reward}` : task.reward} ₽
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}

        <button type="button" className="play-cta btn-secondary" onClick={onBack}>
          ← Назад
        </button>
      </div>
    </div>
  );
}
