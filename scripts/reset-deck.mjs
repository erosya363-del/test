import { commitDeck, loadDeck, shuffleWordIds, newId } from "../src/data/cloud.ts";

// Чистый общий старт для проверки двух браузеров
const ids = shuffleWordIds(80, 50);
const saved = await commitDeck(() => ({
  ids,
  pos: 0,
  updatedAt: Date.now(),
  seed: newId(),
}));
const check = await loadDeck();
console.log("ready", {
  pos: check?.pos,
  len: check?.ids.length,
  first: check?.ids[0],
  ok: Boolean(check && check.pos === 0 && check.ids[0] === ids[0]),
});
if (!check || check.pos !== 0) process.exit(1);
