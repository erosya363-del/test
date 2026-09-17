import { commitDeck, loadDeck, shuffleWordIds, newId } from "../src/data/cloud.ts";

const before = await loadDeck();
console.log("before", before);

const ids = shuffleWordIds(80, 50);
const saved = await commitDeck(() => ({
  ids,
  pos: 5,
  updatedAt: Date.now(),
  seed: newId(),
}));
console.log("saved", saved && { pos: saved.pos, len: saved.ids.length, first: saved.ids[0] });

const after = await loadDeck();
console.log(
  "after",
  after && {
    pos: after.pos,
    len: after.ids.length,
    first: after.ids[0],
    match: after.pos === 5 && after.ids[0] === ids[0],
  },
);

if (!after || after.pos !== 5) process.exit(1);
