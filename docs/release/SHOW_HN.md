# Show HN — open-upsp v0.3.1

## Title Options (≤80 chars)

**Option A (Short + punchy)** ✅ RECOMMENDED — 67 chars:
> Show HN: AI agents that remember who you are across conversations

**Option B (Problem hook)** — 72 chars:
> Show HN: Every AI chat starts from zero. I fixed that.

**Option C (Feature-focused)** — 74 chars:
> Show HN: Zettelkasten knowledge graph for AI agents

**Option D (Curiosity-driven)** — 76 chars:
> Show HN: My AI agent unlocks new personality after 10 conversations

---

## Body (Option B — recommended)

I built **open-upsp** – a persona system for OpenClaw AI agents that gives them persistent identity, memory, and a Zettelkasten knowledge graph.

**The problem**: Every conversation with an AI agent starts from a blank slate. Context is lost when the session ends. The agent doesn't "know" you.

**The solution**:
- 🎭 **Persona context injection** – The agent loads its identity, state, memory, and knowledge before every reply
- 🧠 **Zettelkasten knowledge graph** – Persistent long-term memory via atomic notes, bidirectional links, and nightly distillation
- 🔓 **Progressive unlock** – The persona evolves over 10+ rounds. New behavioral rules unlock when trust (workhoodIndex ≥ 0.3) is established
- 🔄 **Session-end workflow** – Auto-distill → update state → sync to knowledge graph

**Built with**: TypeScript, Node.js 22, Zettelkasten plugin, 207 tests, 94% coverage.

**GitHub**: https://github.com/cx2002302-lang/open-upsp

**Install**: `npm install -g open-upsp`

Would love feedback on the progressive unlock concept – has anyone tried "evolving" AI agent behavior based on conversation depth?
