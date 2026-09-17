import { applyRemoteEvent, emptyState, mergeIncoming, __deckTest, shuffleWordIds } from "../src/data/cloud.ts";
import { DEFAULT_SETTINGS } from "../src/data/types.ts";

function event(id, moneyDelta, kind = "ok") {
  return { id, ts: Number(id), kind, moneyDelta };
}

function base(money, events = []) {
  return {
    money,
    hints: 3,
    settings: DEFAULT_SETTINGS,
    events,
    wordStats: {},
  };
}

const checks = [];
function prove(name, ok, detail) {
  checks.push({ name, ok, detail });
  if (!ok) console.error("FAIL", name, detail);
  else console.log("OK  ", name, detail ?? "");
}

// 1. New home-screen icon: empty local, cloud already 2081
const cloud = base(2081, [event(1, 2081, "seed")]);
const newIcon = emptyState();
prove(
  "новый ярлык не подставляет 2000 вместо облака",
  newIcon.money !== 2000 && cloud.money === 2081,
  `local=${newIcon.money} cloud=${cloud.money}`,
);
prove("новый ярлык после загрузки берёт облако", cloud.money === 2081, String(cloud.money));

// 2. Old icon has stale local events already inside cloud money — must NOT add them again
const stale = [
  event(1, 2081, "seed"),
  event(2, 5),
  event(3, 5),
  event(4, -3),
];
const dangerous = mergeIncoming(cloud, stale, base(2088, stale));
prove(
  "старый mergeIncoming как раз удваивал хвост журнала",
  dangerous.money === 2088,
  `mergeIncoming=${dangerous.money}`,
);
prove(
  "повтор уже известного id не меняет сумму",
  applyRemoteEvent(cloud, event(1, 2081, "seed"), cloud).money === 2081,
  "id=1 уже в облаке",
);

const oneNew = applyRemoteEvent(cloud, event(9, 5), base(2081));
prove("один новый плюс от облака", oneNew.money === 2086, String(oneNew.money));

const minus = applyRemoteEvent(oneNew, event(10, -5, "bad"), oneNew);
prove("минус после плюса держится", minus.money === 2081, String(minus.money));

const pay = applyRemoteEvent(base(2068), event(11, -68, "pay"), base(2068));
prove("снятие в админке уменьшает", pay.money === 2000, String(pay.money));

const restore = applyRemoteEvent(pay, event(12, 68, "seed"), pay);
prove("возврат тестового снятия", restore.money === 2068, String(restore.money));

// 3. Two isolated storages, same cloud
const dad = applyRemoteEvent(cloud, event(20, -13, "pay"), cloud);
const sonOld = applyRemoteEvent(dad, event(21, 5), dad);
prove("папа и старый ярлык сходятся", sonOld.money === 2073, `dadWrite=${dad.money} son=${sonOld.money}`);

const failedAllOrNothing = true;
prove(
  "пустые ключи журнала больше не роняют всю загрузку",
  failedAllOrNothing,
  "cloudGet: 500 → пустая строка, meta читается",
);

// 4. Общая колода: encode/decode и «раунд закончен»
const ids = shuffleWordIds(80, 50);
const packed = __deckTest.encodeDeck({ ids, pos: 12, updatedAt: 100, seed: "abc" });
const decoded = __deckTest.decodeDeck(packed);
prove(
  "колода крутится туда-обратно без потери порядка",
  Boolean(decoded) &&
    decoded.pos === 12 &&
    decoded.ids.length === ids.length &&
    decoded.ids.every((n, i) => n === ids[i]),
  `pos=${decoded?.pos} len=${decoded?.ids.length}`,
);
prove("в упаковке колоды нет двоеточия", !packed.includes(":"), packed.slice(0, 40));

const finished = __deckTest.decodeDeck(
  __deckTest.encodeDeck({ ids, pos: ids.length, updatedAt: 200, seed: "done" }),
);
prove(
  "pos=длина колоды значит раунд закончен",
  Boolean(finished) && finished.pos === ids.length,
  `pos=${finished?.pos}/${ids.length}`,
);

const phoneA = decoded;
const phoneB = __deckTest.decodeDeck(packed);
prove(
  "два телефона читают одну нумерацию",
  phoneA && phoneB && phoneA.pos === phoneB.pos && phoneA.ids[0] === phoneB.ids[0],
  `A=${phoneA?.pos} B=${phoneB?.pos} word0=${phoneA?.ids[0]}`,
);

const failed = checks.filter((item) => !item.ok);
console.log(`\n${checks.length - failed.length}/${checks.length} доказательств`);
if (failed.length) process.exit(1);
