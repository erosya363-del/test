/**
 * Виртуальные «два телефона / два ярлыка» против живого облака.
 * Запуск: npx tsx scripts/sync-stress.mts
 */
import {
  commitEvent,
  ensureCloudSeeded,
  loadCloud,
  loadCloudMetaState,
  newId,
  peekCloudMeta,
} from "../src/data/cloud.ts";
import type { GameEvent, SharedState } from "../src/data/types.ts";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function setMoney(money: number, reason: string) {
  const remote = (await loadCloud()) ?? (await loadCloudMetaState()) ?? (await ensureCloudSeeded());
  const delta = money - remote.money;
  const event: GameEvent = {
    id: newId(),
    ts: Date.now(),
    kind: delta >= 0 ? "seed" : "pay",
    moneyDelta: delta,
    reason,
    device: "stress",
  };
  return commitEvent(event, remote);
}

async function play(device: string, delta: number, kind: GameEvent["kind"] = delta >= 0 ? "ok" : "bad") {
  const remote = (await loadCloud()) ?? (await loadCloudMetaState());
  if (!remote) throw new Error(`${device}: нет облака`);
  const event: GameEvent = {
    id: newId(),
    ts: Date.now(),
    kind,
    moneyDelta: delta,
    word: device,
    reason: `ход ${device}`,
    device,
  };
  return commitEvent(event, remote);
}

async function assertMoney(label: string, expected: number) {
  await sleep(200);
  const peek = await peekCloudMeta();
  const full = await loadCloud();
  const metaOnly = await loadCloudMetaState();
  const values = [peek?.money, full?.money, metaOnly?.money];
  console.log(label, { peek: peek?.money, full: full?.money, metaOnly: metaOnly?.money, expected });
  if (values.some((v) => v !== expected)) {
    throw new Error(`${label}: ждали ${expected}, получили ${values.join("/")}`);
  }
}

async function parallelRace() {
  const before = await peekCloudMeta();
  if (!before) throw new Error("нет meta");
  await Promise.all([play("old-shortcut", 10), play("new-shortcut", -5)]);
  await sleep(500);
  const after = await peekCloudMeta();
  if (!after) throw new Error("нет meta после гонки");
  const expected = before.money + 5;
  console.log("race results", { before: before.money, after: after.money, expected });
  if (after.money !== expected) {
    throw new Error(`гонка: ждали ${expected}, получили ${after.money}`);
  }
  return after.money;
}

async function sequentialTwoClients() {
  await setMoney(2068, "Эталон 2068");
  await assertMoney("старт 2068", 2068);

  await play("son-old", 20);
  await assertMoney("сын старый +20", 2088);

  const freshIcon = await loadCloudMetaState();
  if (!freshIcon || freshIcon.money !== 2088) {
    throw new Error(`новый ярлык видит ${freshIcon?.money}, а не 2088`);
  }
  console.log("новый ярлык видит", freshIcon.money);

  await play("dad", 12);
  await assertMoney("папа +12", 2100);

  await play("dad-admin", -32, "pay");
  await assertMoney("снятие 32", 2068);

  let remote = (await loadCloud())!;
  for (const [device, delta] of [
    ["son-old", 5],
    ["son-new", -3],
    ["dad", 10],
    ["son-old", -5],
  ] as const) {
    const event: GameEvent = {
      id: newId(),
      ts: Date.now(),
      kind: delta >= 0 ? "ok" : "bad",
      moneyDelta: delta,
      device,
      reason: "очередь",
    };
    remote = await commitEvent(event, remote);
  }
  await assertMoney("очередь ходов", 2075);

  await play("dad-admin", -7, "pay");
  await assertMoney("финал после снятия", 2068);
}

async function staleLocalCannotOverwrite() {
  await setMoney(2068, "Эталон перед stale");
  const live = (await loadCloud())!;
  const staleLocal: SharedState = { ...live, money: 2000 };
  const event: GameEvent = {
    id: newId(),
    ts: Date.now(),
    kind: "ok",
    moneyDelta: 0,
    reason: "stale icon touch",
    device: "stale-new-icon",
  };
  const merged = await commitEvent(event, staleLocal);
  if (merged.money !== 2068) {
    throw new Error(`stale overwrite: ${merged.money}`);
  }
  await assertMoney("stale ярлык не затёр 2068", 2068);
}

async function main() {
  console.log("=== sync stress ===");
  await sequentialTwoClients();
  await staleLocalCannotOverwrite();
  await parallelRace();
  await setMoney(2068, "Вернули эталон 2068");
  await assertMoney("эталон восстановлен", 2068);
  console.log("OK");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
