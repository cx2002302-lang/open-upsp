# Reddit 发布详细步骤

## 路径选择

| 路径 | 时间 | 难度 | 适合度 |
|---|---|---|---|
| **A. r/OpenClaw Weekend Showcase** | 周六/周日 | 低 | ⭐⭐⭐⭐⭐ |
| **B. r/selfhosted / r/LocalLLaMA** | 现在 | 中 | ⭐⭐⭐⭐ |
| **C. Discussion 形式（绕过限制）** | 现在 | 中 | ⭐⭐⭐ |

---

## 路径 A：r/OpenClaw Weekend Showcase（推荐）

### 1. 确认时间
- Showcase 线程通常在 **周六 00:00 UTC** 开启
- 北京时间：**周六早上 8 点**
- 检查：https://www.reddit.com/r/OpenClaw/ 置顶帖

### 2. 帖子格式

**标题**：
```
[Showcase] open-upsp – Zettelkasten knowledge graph with progressive persona evolution
```

**正文**：
```markdown
I built **open-upsp**, a persona system for OpenClaw that gives AI agents persistent identity and memory.

**What it does:**
- Injects persona context (identity + state + memory + knowledge) before every agent reply
- Zettelkasten knowledge graph for long-term memory with nightly distillation
- Progressive unlock: personality evolves after 10+ conversations when trust threshold is met
- Auto session-end workflow: distill → update → sync

**Tech stack:** TypeScript, Node.js 22, OpenClaw 2026.4.24+
**Tests:** 207 tests, 94% coverage

**Links:**
- GitHub: https://github.com/cx2002302-lang/open-upsp
- Install: `npm install -g open-upsp`

Feedback welcome!
```

### 3. 发布步骤
1. 周六早上打开 https://www.reddit.com/r/OpenClaw/
2. 找到置顶 "Weekly Showcase" 线程
3. 在评论中粘贴正文
4. 提交

---

## 路径 B：r/selfhosted 或 r/LocalLLaMA（现在就能发）

### r/selfhosted（自托管工具社区）

**标题**：
```
open-upsp – Give your OpenClaw AI agent persistent memory and evolving personality
```

**正文**：
```markdown
I built a self-hosted persona system for OpenClaw agents:

**Key features:**
- Zettelkasten knowledge graph (atomic notes + bidirectional links)
- Progressive personality unlock after N conversations
- Session-end auto-sync to knowledge base
- 207 tests, 94% coverage

**Install:** `npm install -g open-upsp`
**Repo:** https://github.com/cx2002302-lang/open-upsp

Works fully offline with local LLMs. No cloud dependency.
```

**发布步骤**：
1. 打开 https://www.reddit.com/r/selfhosted/submit
2. 选择 "Link" 或 "Text Post"
3. 建议用 Text Post（社区更偏好）
4. 粘贴标题和正文
5. 添加 flair：「Software」
6. 提交

### r/LocalLLaMA（本地 AI 社区）

**标题**：
```
Built a Zettelkasten memory system for AI agents with progressive personality evolution
```

**正文**：类似，强调本地/离线能力。

---

## 路径 C：Discussion 形式（绕过 self-promotion）

**核心策略**：不发 "Show my project"，而是发技术讨论，自然引入项目。

**标题**：
```
Has anyone tried giving their AI agent a persistent memory system?
```

**正文**：
```markdown
I've been experimenting with ways to make AI agents remember context across sessions. The standard approach seems to be simple vector DBs, but they don't capture relationships between ideas well.

I tried using Zettelkasten principles (atomic notes + bidirectional links) combined with a persona system. The interesting part is adding a "progressive unlock" mechanic — the agent's personality and available knowledge expand as conversations deepen (kind of like RPG character progression).

**My current approach:**
- Zettelkasten for structured long-term memory
- Persona state that persists across sessions
- New behavioral rules unlock after trust threshold (measured by conversation depth + engagement metrics)
- Auto-distillation at session end

**Questions:**
1. How do you handle memory in your agents?
2. Have you tried "evolving" agent behavior over time?
3. Any concerns with agent personality drift?

For those interested in the implementation details: [GitHub link]
```

**发布步骤**：
1. 打开 https://www.reddit.com/r/OpenClaw/submit
2. 选择 "Text"
3. 粘贴标题和正文
4. 添加 flair：「Discussion」
5. 提交

---

## 通用避坑指南

### Karma 要求
| 子版块 | 最低 Karma | 账号年龄 |
|---|---|---|
| r/OpenClaw | 无明确要求 | 建议 >1 天 |
| r/selfhosted | 无 | 建议 >1 天 |
| r/LocalLLaMA | 无 | 建议 >1 天 |

### 必做（防删帖）
- [ ] 发布前先在其他帖子里评论几条（证明不是机器人）
- [ ] 正文中加「Feedback welcome」邀请讨论
- [ ] 回复每一条评论（算法会提升帖子热度）
- [ ] 不要带短链接（bit.ly 等会被自动过滤）

### 禁做（会被删/封号）
- [ ] 同一个内容发多个子版块（会被检测 crosspost spam）
- [ ] 用多个账号互相点赞
- [ ] 标题全大写或过多感叹号
- [ ] 正文中「please upvote」「check out my project」

### 最佳发布时间（美国时间）
| 时段 | 说明 |
|---|---|
| 周二-周四 9:00-11:00 AM EST | 工作日高峰 |
| 周末 10:00 AM - 2:00 PM EST | 休闲浏览高峰 |

北京时间对应：晚上 10 点 - 凌晨 2 点。

---

## 发布后跟进

**发布后 1 小时内：**
1. 回复所有评论（即使只是 "Thanks!"）
2. 如果有人提 issue，24 小时内 GitHub 回复
3. 如果帖子被 downvote，不要删除，让自然发酵

**发布后 24 小时内：**
1. 更新 GitHub README，加 Reddit 讨论链接（反向引流）
2. 如果有人提 feature request，记入 backlog
