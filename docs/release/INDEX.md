# open-upsp v0.3.0 发布物料索引

> 所有内容均来自真实测试执行，可直接用于宣传页面、技术分享或发布说明。

---

## 物料清单

| 文件 | 用途 | 说明 |
|------|------|------|
| `SHOWCASE.md` | 宣传页 / GitHub README 补充 | 10 个实机演示场景，全部真实 CLI 输出 |
| `benchmarks/v0.3.0-test-metrics.json` | 技术可信度背书 | 104 个单元测试基准数据 |
| `benchmarks/v0.3.0-stress-metrics.json` | 生产稳定性背书 | 10 场景压力测试基准数据 |

---

## SHOWCASE.md 内容导览

| 章节 | 展示能力 | 真实数据来源 |
|------|---------|-------------|
| 1. 一键创建位格 | `init` 命令 | scene1 init |
| 2. 状态面板 | `status` 六轴可视化 | scene1 status |
| 3. 上下文组装 | `context` 完整输出 | scene1 context |
| 4. 会话闭环 | `session-end` 生命周期 | scene2 session-end + STM |
| 5. 状态演进 | 3 轮状态对比 | scene3 Round 0→3 |
| 6. 关系网络 | 20 实体共振度矩阵 | scene7 relation.md |
| 7. ZK 桥梁 | search + 大数据量性能 | scene7 search + context (69ms) |
| 8. 10 轮演化 | 长期稳定性 | scene8 全部 10 轮快照 |
| 9. 错误恢复 | 3 种降级场景 | scene10 错误注入 |
| 10. 边界条件 | 极端输入处理 | scene9 边界测试 |

---

## 质量指标速览

- **单元测试**: 104 个 | 行覆盖率 94.39% | 分支 88.47% | 函数 97.7%
- **压力测试**: 10 场景全部通过
- **代码规范**: biome 0 错误 0 警告
- **性能**: 50 STM + 20 关系下 context 构建 69ms

---

## 使用建议

### 宣传页
直接引用 `SHOWCASE.md` 中的代码块和输出示例，配合截图效果更佳。

### GitHub Release Note
引用质量指标表格和 10 场景通过率。

### 技术分享
重点展示第 3 章（上下文组装）、第 5 章（状态演进）、第 7 章（ZK 桥梁）。

---

*生成日期: 2026-05-13 | 测试基目录: /tmp/open-upsp-stress-test-451232*
