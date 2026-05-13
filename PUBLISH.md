# open-upsp 发布清单

> v0.3.0 Production Beta 发布步骤

---

## ✅ 发布前检查

### 代码质量
- [x] 所有测试通过 (104/104)
- [x] 覆盖率达标 (行 94.39%, 函数 97.7%, 分支 88.47%)
- [x] biome 检查通过 (0 errors, 0 warnings)
- [x] TypeScript 编译通过
- [x] 压力测试通过 (10/10 场景)

### 文档完整性
- [x] README.md (英文)
- [x] README.zh.md (中文)
- [x] CHANGELOG.md (Keep a Changelog 格式)
- [x] releases/RELEASE_NOTES-v0.3.0.md
- [x] docs/DEPLOY.md
- [x] docs/DEPLOY_QUICK.md
- [x] docs/EVOLUTION.md
- [x] docs/release/SHOWCASE.md
- [x] docs/release/INDEX.md

### Zettelkasten 插件
- [x] vendor/zettelkasten-plugin-v1.0.0-beta.4.tar.gz 存在
- [x] 图片已压缩 (15MB → 594KB)
- [x] Schema 版本兼容 (v2.0.0)

### 发布脚本
- [x] scripts/publish.sh 可执行
- [x] scripts/install.sh 可执行
- [x] scripts/uninstall.sh 可执行
- [x] postinstall.js 正常

---

## 🎨 信息图生成 (手动步骤)

使用 `docs/assets/infographic-prompt.md` 中的提示词，通过 AI 图像生成工具创建：

### 必需图片

| # | 文件名 | 用途 | 尺寸要求 |
|---|--------|------|----------|
| 1 | `docs/assets/open-upsp-infographic.jpg` | README 顶部横幅 | ≥1200px 宽, <200KB |
| 2 | `docs/assets/test-metrics-infographic.jpg` | 测试数据展示 | ≥1200px 宽, <200KB |

### 推荐工具
- **Midjourney** — 最佳视觉效果
- **DALL·E 3** — 文字渲染较好
- **Stable Diffusion XL** — 本地运行，免费
- **Canva AI** — 快速迭代，适合信息图

> 💡 提示：先用 Midjourney 生成背景视觉元素，再用 Canva 叠加文字和数据图表，效果最佳。

---

## 📦 打包发布

```bash
# 1. 运行发布脚本
./scripts/publish.sh

# 2. 检查输出目录
ls -la open-upsp-release/

# 3. 创建 git tag
git tag -a v0.3.0 -m "open-upsp v0.3.0 — Production Beta"
git push origin v0.3.0

# 4. 在 GitHub 创建 Release
# 使用 releases/RELEASE_NOTES-v0.3.0.md 作为 Release 说明
# 上传 open-upsp-release/ 目录内容为附件
```

---

## 🚀 发布后验证

- [ ] GitHub Release 页面显示正确
- [ ] 下载附件可正常解压
- [ ] `npm install -g open-upsp` 可正常安装
- [ ] ZK 插件自动安装提示正常
- [ ] `open-upsp init test-persona` 正常工作

---

## 📝 发布信息摘要

```
版本:     v0.3.0
代号:     Production Beta
日期:     2026-05-13
许可证:   MIT
Node.js:  >= 18.0.0 (测试于 22.22.2)

测试:     104 passed
覆盖率:   94.39% line, 97.7% function, 88.47% branch
ZK 插件:  v1.0.0-beta.4 (Schema v2.0.0)
大小:     ~2MB (不含 ZK 插件)
```

---

*发布清单版本: v0.3.0 | 最后更新: 2026-05-13*
