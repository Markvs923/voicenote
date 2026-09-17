(function (root) {
  function norm(s) {
    return String(s || "").replace(/\s+/g, " ").trim();
  }

  function newFinalTail(committed, piece, lastChunk) {
    const c = norm(committed);
    const p = norm(piece);
    if (!p) return "";
    if (lastChunk && p === norm(lastChunk)) return "";
    if (!c) return p;
    if (p === c) return "";
    if (c.endsWith(" " + p)) return "";
    if (p.startsWith(c + " ")) return norm(p.slice(c.length));
    const cWords = c.split(" ");
    const pWords = p.split(" ");
    const max = Math.min(cWords.length, pWords.length);
    for (let n = max; n > 0; n--) {
      if (cWords.slice(-n).join(" ") === pWords.slice(0, n).join(" ")) {
        return pWords.slice(n).join(" ");
      }
    }
    return p;
  }

  function commitFinals(committed, finals, lastChunk) {
    let c = norm(committed);
    let chunk = lastChunk ? norm(lastChunk) : "";
    const kept = [];
    const list = finals || [];
    for (let i = 0; i < list.length; i++) {
      const tail = newFinalTail(c, list[i], chunk);
      if (!tail) continue;
      if (tail === kept[kept.length - 1]) continue;
      kept.push(tail);
      c = norm(c + " " + tail);
      chunk = tail;
    }
    return { committed: c, lastChunk: chunk };
  }

  function paint(committed, sessionFinals, interim, lastChunk) {
    const next = commitFinals(committed, sessionFinals, lastChunk);
    let im = newFinalTail(next.committed, interim, next.lastChunk);
    if (im && next.committed.endsWith(" " + im)) im = "";
    if (im && im === next.committed) im = "";
    return norm(next.committed + " " + im);
  }

  const api = { norm, newFinalTail, commitFinals, paint };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.VNTranscript = api;
})(typeof window !== "undefined" ? window : globalThis);
