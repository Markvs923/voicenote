const assert = require("assert");
const { norm, newFinalTail, commitFinals, paint } = require("../transcript-model.js");
const fs = require("fs");
const path = require("path");

function eq(actual, expected, msg) {
  assert.strictEqual(actual, expected, msg || `${actual} !== ${expected}`);
}

eq(norm("  hello   there\n"), "hello there");

eq(newFinalTail("hello there", "hello there", ""), "");
eq(newFinalTail("hello there friend", "friend", "friend"), "");
eq(newFinalTail("hello there friend", "friend", ""), "");
eq(newFinalTail("hello there", "hello there friend", ""), "friend");
eq(newFinalTail("one two three", "two three four", ""), "four");
eq(newFinalTail("", "new words", ""), "new words");
eq(newFinalTail("keep this", "brand new sentence", ""), "brand new sentence");
eq(newFinalTail("the cat sat", "sat", "sat"), "");

let s1 = commitFinals("", ["hello how are you"], "");
eq(s1.committed, "hello how are you");
eq(s1.lastChunk, "hello how are you");

let restart = commitFinals(s1.committed, ["hello how are you"], s1.lastChunk);
eq(restart.committed, "hello how are you", "restart replay must not duplicate");

let restart2 = commitFinals(s1.committed, ["hello how are you", "hello how are you"], s1.lastChunk);
eq(restart2.committed, "hello how are you", "triple replay of same final must collapse");

let cont = commitFinals(s1.committed, ["hello how are you", "today was fine"], s1.lastChunk);
eq(cont.committed, "hello how are you today was fine");

let vn3Bug = paint(
  "the same sentence repeats",
  ["the same sentence repeats"],
  "the same sentence repeats",
  "the same sentence repeats"
);
eq(vn3Bug, "the same sentence repeats", "lock + full session finals overlap");

eq(paint("", ["one", "one"], "one", ""), "one");
eq(paint("alpha beta", ["beta"], "", "beta"), "alpha beta");
eq(paint("alpha beta", ["alpha beta gamma"], "", "alpha beta"), "alpha beta gamma");

const liveSession = paint("", ["hello"], "hello there", "");
eq(liveSession, "hello there");

const afterEnd = commitFinals("hello there", [], "hello there");
eq(afterEnd.committed, "hello there");
const afterRestartPaint = paint(afterEnd.committed, ["hello there"], "", afterEnd.lastChunk);
eq(afterRestartPaint, "hello there");

const oldLockModel = ("hello there " + ["hello there"].join(" ")).replace(/\s+/g, " ").trim();
eq(oldLockModel, "hello there hello there");
eq(
  paint("hello there", ["hello there"], "", "hello there"),
  "hello there",
  "new model must not match old lock+session overlap"
);

const sw = fs.readFileSync(path.join(__dirname, "..", "sw.js"), "utf8");
assert.match(sw, /vn-4/);
assert.match(sw, /skipWaiting/);
assert.match(sw, /clients\.claim/);
assert.match(sw, /cache:\s*["']no-store["']/);
assert.doesNotMatch(sw, /vn-3/);

const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
assert.match(html, /transcript-model\.js/);
assert.match(html, /committed/);
assert.match(html, /sessionFinals/);
assert.match(html, /recGen/);
assert.match(html, /isPhone/);
assert.doesNotMatch(html, /\block\s*=/);
assert.doesNotMatch(html, /replayGuard/);

function fakeResult(text, isFinal) {
  const row = [{ transcript: text }];
  row.isFinal = isFinal;
  return row;
}

function runPhoneLoop(sessions) {
  let committed = "";
  let lastChunk = "";
  let recGen = 0;
  let shown = "";
  for (const results of sessions) {
    const myGen = ++recGen;
    if (myGen !== recGen) throw new Error("stale");
    const sessionFinals = [];
    let interim = "";
    for (const row of results) {
      const t = norm(row[0].transcript);
      if (!t) continue;
      if (row.isFinal) {
        if (t !== sessionFinals[sessionFinals.length - 1]) sessionFinals.push(t);
      } else {
        interim += (interim ? " " : "") + t;
      }
    }
    shown = paint(committed, sessionFinals, interim, lastChunk);
    const next = commitFinals(committed, sessionFinals, lastChunk);
    committed = next.committed;
    lastChunk = next.lastChunk;
    shown = paint(committed, [], "", lastChunk);
  }
  return shown;
}

const ghosted = runPhoneLoop([
  [fakeResult("the same sentence repeats", true)],
  [fakeResult("the same sentence repeats", true)],
  [fakeResult("the same sentence repeats", true)]
]);
eq(ghosted, "the same sentence repeats", "mobile auto-restart must not triple the sentence");

const continued = runPhoneLoop([
  [fakeResult("buy milk", true)],
  [fakeResult("buy milk", true), fakeResult("and eggs", true)]
]);
eq(continued, "buy milk and eggs");

console.log("ok");
