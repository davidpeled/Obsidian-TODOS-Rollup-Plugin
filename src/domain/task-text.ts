// Turns a task's text into display tokens + metadata (due date, priority).
// Understands the Tasks plugin emoji format and Dataview inline fields.

export type Priority = "highest" | "high" | "medium" | "low" | "lowest";

export type Token =
  | { kind: "text"; value: string }
  | { kind: "bold"; value: string }
  | { kind: "italic"; value: string }
  | { kind: "code"; value: string }
  | { kind: "highlight"; value: string }
  | { kind: "tag"; value: string }
  | { kind: "wikilink"; target: string; label: string }
  | { kind: "link"; href: string; label: string };

export interface TaskText {
  tokens: Token[];
  due?: string; // YYYY-MM-DD
  priority?: Priority;
}

const PRIORITY: Record<string, Priority> = {
  "🔺": "highest",
  "⏫": "high",
  "🔼": "medium",
  "🔽": "low",
  "⏬": "lowest",
};

const DATE = "(\\d{4}-\\d{2}-\\d{2})";
const DUE_RE = new RegExp(`(?:📅|📆|🗓️?)\\s*${DATE}`, "u");
const DV_DUE_RE = new RegExp(`\\[due::\\s*${DATE}\\]`, "i");
// Metadata we hide from the visible text
const STRIP_RES = [
  new RegExp(`(?:📅|📆|🗓️?|⏳|🛫|✅|➕|❌)\\s*${DATE}`, "gu"),
  /🔁[^📅📆🗓⏳🛫✅➕❌🔺⏫🔼🔽⏬]*/gu,
  /🆔\s*\S+/gu,
  /⛔\s*\S+/gu,
  /[🔺⏫🔼🔽⏬]️?/gu,
  /\[(?:due|scheduled|start|completion|created|priority)::[^\]]*\]/gi,
];

const INLINE_RE =
  /(\[\[([^\]|]+)(?:\|([^\]]+))?\]\])|(\[([^\]]+)\]\(([^)\s]+)\))|(`([^`]+)`)|(\*\*([^*]+)\*\*)|(==([^=]+)==)|(\*([^*\s][^*]*)\*)|((^|\s)#([^\s#.,;:!?()[\]{}"'`]+))/gu;

const SAFE_HREF_RE = /^(?:https?:|mailto:)/i;

/** Only web and mail links become clickable; anything else (javascript:, data:, ...) stays plain text. */
export function isSafeHref(href: string): boolean {
  return SAFE_HREF_RE.test(href.trim());
}

export function parseTaskText(input: string): TaskText {
  const out: TaskText = { tokens: [] };

  const due = DUE_RE.exec(input) ?? DV_DUE_RE.exec(input);
  if (due) out.due = due[1];
  for (const [emoji, p] of Object.entries(PRIORITY)) {
    if (input.includes(emoji)) {
      out.priority = p;
      break;
    }
  }
  const dvPriority = /\[priority::\s*(highest|high|medium|low|lowest)\]/i.exec(input);
  if (dvPriority) out.priority = dvPriority[1].toLowerCase() as Priority;

  let text = input;
  for (const re of STRIP_RES) text = text.replace(re, "");
  text = text.replace(/\s{2,}/g, " ").trim();

  let last = 0;
  const push = (t: Token) => out.tokens.push(t);
  const pushText = (s: string) => {
    if (!s) return;
    const prev = out.tokens[out.tokens.length - 1];
    if (prev && prev.kind === "text") prev.value += s;
    else push({ kind: "text", value: s });
  };

  INLINE_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = INLINE_RE.exec(text))) {
    pushText(text.slice(last, m.index));
    if (m[1]) {
      const target = m[2].trim();
      const label = (m[3] ?? target.split("#")[0].split("/").pop() ?? target).trim();
      push({ kind: "wikilink", target, label });
    } else if (m[4]) {
      if (isSafeHref(m[6])) push({ kind: "link", label: m[5], href: m[6] });
      else pushText(m[0]);
    }
    else if (m[7]) push({ kind: "code", value: m[8] });
    else if (m[9]) push({ kind: "bold", value: m[10] });
    else if (m[11]) push({ kind: "highlight", value: m[12] });
    else if (m[13]) push({ kind: "italic", value: m[14] });
    else if (m[15]) {
      pushText(m[16]);
      push({ kind: "tag", value: m[17] });
    }
    last = m.index + m[0].length;
  }
  pushText(text.slice(last));
  return out;
}
