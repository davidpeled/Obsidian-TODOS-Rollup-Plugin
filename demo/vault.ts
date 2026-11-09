// An in-memory vault with realistic notes, so the demo behaves like the real plugin.

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

const pad = (n: number) => String(n).padStart(2, "0");

function ymd(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays); // calendar arithmetic, so DST changes can't shift the day
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function seed(): { path: string; ago: number; content: string }[] {
  const weekday = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" }).format(new Date());
  return [
    {
      path: `Daily/${ymd(0)}.md`,
      ago: 8 * MIN,
      content: `# ${weekday}

## Focus
- [ ] Ship the todos plugin 📅 ${ymd(0)} ⏫
- [x] Morning run, 5k
- [ ] Reply to Maya about the offsite, see [[Weekly sync]]
- [ ] Book a dentist appointment 📅 ${ymd(1)}

## Log
Paired with Sam on the sync bug. Turned out to be a race in the cache.
`,
    },
    {
      path: "Projects/Website redesign.md",
      ago: 2 * HOUR + 14 * MIN,
      content: `---
status: active
owner: me
---
# Website redesign

## Launch checklist
- [x] Finalize color tokens
- [x] Audit the typography scale
- [ ] Build the pricing page #design 📅 ${ymd(-1)} 🔼
  - [ ] Annual / monthly toggle
  - [x] Feature comparison table
- [ ] Write the migration guide for the \`v2\` API
- [/] QA on Safari and iOS #qa

## Notes
Todos inside code blocks are ignored:
\`\`\`md
- [ ] this one never shows up in the todo list
\`\`\`
`,
    },
    {
      path: "Ideas/Writing.md",
      ago: 6 * HOUR,
      content: `# Writing ideas

Essay on why the best tools feel invisible. Start with the Paul Graham quote.
`,
    },
    {
      path: "Meetings/Weekly sync.md",
      ago: DAY + 3 * HOUR,
      content: `# Weekly sync

Attendees: Maya, Sam, Lee

- [ ] Share the Q4 roadmap draft with [[Website redesign|the design team]] 📅 ${ymd(3)}
- [ ] Follow up on the hiring loop #hiring
- [x] Send meeting notes to the group
`,
    },
    {
      path: "Inbox.md",
      ago: 3 * DAY,
      content: `# Inbox

- [ ] Try the ==new espresso place== on 5th
- [ ] Read [Emil's design engineering notes](https://emilkowal.ski)
- [ ] Renew passport 📅 ${ymd(-5)} ⏫
- [-] Buy a second monitor
`,
    },
    {
      path: "Home/Groceries.md",
      ago: 5 * DAY,
      content: `# Groceries

- [ ] Oat milk
- [ ] Coffee beans
- [x] Bananas
- [ ] Olive oil
`,
    },
    {
      path: "Reading list.md",
      ago: 12 * DAY,
      content: `# Reading list

- [ ] *Thinking in Systems* by Donella Meadows
- [x] The Design of Everyday Things
- [ ] Shape Up #work
`,
    },
    {
      path: "Ideas/Side projects.md",
      ago: 45 * DAY,
      content: `# Side projects

- [ ] A tiny CLI that turns meeting notes into todos
- [ ] Mechanical keyboard build log
`,
    },
  ];
}

export interface DemoNote {
  path: string;
  content: string;
  mtime: number;
}

export class DemoVault {
  notes = new Map<string, DemoNote>();
  private listeners = new Set<() => void>();

  constructor() {
    this.reset();
  }

  reset() {
    const now = Date.now();
    this.notes.clear();
    for (const n of seed()) this.notes.set(n.path, { path: n.path, content: n.content, mtime: now - n.ago });
    this.emit();
  }

  onChange(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit() {
    this.listeners.forEach((fn) => fn());
  }

  get(path: string) {
    return this.notes.get(path);
  }

  update(path: string, content: string) {
    const n = this.notes.get(path);
    if (!n || n.content === content) return;
    n.content = content;
    n.mtime = Date.now();
    this.emit();
  }

  /** Resolve a wikilink target like "Weekly sync" or "Folder/Note#Heading". */
  resolve(link: string): string | undefined {
    const name = link.split("#")[0].split("|")[0].trim().toLowerCase();
    for (const p of this.notes.keys()) {
      const base = p.replace(/\.md$/, "").toLowerCase();
      if (base === name || base.split("/").pop() === name) return p;
    }
    return undefined;
  }

  all(): DemoNote[] {
    return [...this.notes.values()];
  }
}

export function noteMeta(n: DemoNote) {
  const parts = n.path.replace(/\.md$/, "").split("/");
  const title = parts.pop()!;
  return { path: n.path, title, folder: parts.join("/"), mtime: n.mtime };
}
