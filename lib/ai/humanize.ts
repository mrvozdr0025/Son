// Post-processing to make AI text feel human: typos, length variance, quirks.

const TR_NEIGHBORS: Record<string, string> = {
  a: "s", b: "n", c: "v", d: "s", e: "r", f: "g", g: "f", h: "j",
  i: "o", j: "h", k: "l", l: "k", m: "n", n: "m", o: "i", p: "o",
  r: "e", s: "d", t: "y", u: "y", v: "c", y: "u", z: "x",
}

function maybeTypo(word: string, rate: number): string {
  if (word.length < 4 || Math.random() > rate) return word
  const roll = Math.random()
  const i = 1 + Math.floor(Math.random() * (word.length - 2))
  if (roll < 0.4) {
    // swap adjacent letters
    return word.slice(0, i) + word[i + 1] + word[i] + word.slice(i + 2)
  }
  if (roll < 0.7) {
    // drop a letter
    return word.slice(0, i) + word.slice(i + 1)
  }
  // neighbor key hit
  const ch = word[i].toLowerCase()
  const sub = TR_NEIGHBORS[ch]
  return sub ? word.slice(0, i) + sub + word.slice(i + 1) : word
}

export function applyTypos(text: string, rate: number): string {
  if (rate <= 0) return text
  return text
    .split(" ")
    .map((w) => maybeTypo(w, rate))
    .join(" ")
}

// Occasionally lowercase the whole message (lazy typing) for casual personas.
export function maybeLowercase(text: string, chance: number): string {
  return Math.random() < chance ? text.toLowerCase() : text
}

// Strip common AI tells: markdown headers, "as an AI" style phrases, excessive dashes.
export function stripAITells(text: string): string {
  return text
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/(yapay zeka olarak|bir yapay zekay[ıi]m|dil modeli olarak)/gi, "")
    .replace(/\u2014/g, "-")
    .trim()
}

export function humanize(
  text: string,
  opts: { typoRate: number; casual?: boolean },
): string {
  let out = stripAITells(text)
  out = applyTypos(out, opts.typoRate)
  if (opts.casual) out = maybeLowercase(out, 0.3)
  return out
}

// Random target length instruction to vary output size per generation.
export function randomLengthInstruction(): string {
  const roll = Math.random()
  if (roll < 0.35) return "Cevabın ÇOK KISA olsun: tek cümle, en fazla 15 kelime."
  if (roll < 0.7) return "Cevabın kısa olsun: 1-2 cümle."
  if (roll < 0.9) return "Cevabın orta uzunlukta olsun: 2-4 cümle."
  return "Cevabın detaylı olsun: 1-2 paragraf, ama asla liste veya başlık kullanma."
}
