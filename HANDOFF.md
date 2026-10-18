# HANDOFF — 个人 IP 网站（zhongjj2233/personal-ip）

> 本文件是 **2026-10-17 ~ 10-18 那次会话（session-167b935a）的归档交接**：
> 记录「对话里做了什么、结论是什么、现在处于什么状态、下一步怎么接」。
> 不是全量导出（没有搬运原始事件/截图附件），而是给下一个会话直接用的摘要。

## 0. 一句话现状

网站已上线：<https://zhongjj2233.github.io/personal-ip/>，最新**已发布**版本是点赞功能（`80c0162`）；
本地 HEAD `fe594e0` 的「B 站封面自动获取」**已做完、已提交、未发布**；
Supabase 真实数据库**大概率还没配**（页面可能仍显示「演示模式」提示条，需要用下面的方法确认）。

## 1. 项目是什么

- `E:\web myself`：个人 IP 单页网站，**Vite + React**，无前端路由（只有 `#about` 等锚点）。
- 线上托管：GitHub Pages（仓库 `zhongJJ2233/personal-ip`，Public，Build type = **GitHub Actions**）。
- 部署方式：`.github/workflows/deploy.yml`，`git push` 到 `main` 即自动构建部署。
- 内容：首页各板块 + 「影像」面板（B 站视频嵌入 / 站内弹幕墙 / 匿名评论 / 站主后台 / 点赞 / 自动封面）。

## 2. 归档来源

| 项 | 值 |
| --- | --- |
| 会话 ID | `session-167b935a-99b8-4127-b2dd-053a5355174d` |
| 标题 | 本地个人网站无法打开原因 |
| 时间 | 2026-10-17 23:12 ~ 2026-10-18 15:02（Asia/Shanghai），共 10 轮 |
| 原始日志 | `C:\Users\42898\.dsh\sessions\--D-harness--\session-167b935a-.../session.v4.jsonl.zstd`（1.6 MB，3729 个事件，31 张截图附件 6.3 MB） |
| 注意 | 原始会话 cwd 是 `D:\harness`，但所有实际工作都在 `E:\web myself`；DSH 没有「把会话移到另一个工作区」的功能，所以用这份文档在本工作区接力。 |

## 3. 目标是怎么一步步演变的

1. 网站双击 `index.html` 打不开 → 找原因（第 1 轮）
2. 担心别人访问不了、域名/托管怎么弄（第 2 轮）
3. 想用 GitHub Pages 但不会注册 → 帮上线（第 3~5 轮）
4. 新增「影像」面板：站主可编辑、访客只能看+评论、要弹幕（第 6 轮）
5. 移动端视频显示异常 → 修 CDD 布局 bug（第 7 轮）
6. 加视频点赞（第 8~9 轮）
7. 视频封面自动取自 B 站（第 10 轮，做完未发布）

## 4. 十轮对话：做了什么、结论是什么

### 第 1 轮 · 双击白屏的原因（10-17 23:12）

用户原话：「"E:\web myself\index.html"这是我的个人ip网站，但是无法正常用电脑浏览器打开，帮我找到原因。」

用 Playwright + Edge 实测三种打开方式，**站点本身没坏**：

| 打开方式 | 结果 | 控制台 |
| --- | --- | --- |
| 双击 `index.html` | 白屏 | `Access to script at 'file:///E:/src/main.jsx' from origin 'null' has been blocked by CORS policy` |
| 双击 `dist/index.html` | 白屏 | `file:///E:/assets/index-*.js ... blocked by CORS` |
| 本地服务器 | 正常 | 仅 favicon 404 |

三层原因：
1. 入口是开发入口：`index.html:12` 的 `<script type="module" src="/src/main.jsx">` 是 Vite 虚拟路径，双击后 `/` 被当成盘符根，实际请求不存在的 `E:\src\main.jsx`。
2. `.jsx` 必须经 Vite 编译，浏览器不能直接跑。
3. `file://` 的 origin 是 `null`，浏览器**禁止加载 ES Module 与 CSS**——所以连 `dist/` 也不能双击打开，这是浏览器安全策略。

正确打开方式：双击 `start-site.bat`（`npm run dev -- --host 0.0.0.0`，再开 `http://127.0.0.1:5173/`，**命令行窗口不能关**），或终端 `npm run dev` 后开 `http://localhost:5173/`。

顺带发现两个隐患：
- Node 24 把 `localhost` 解析成 IPv6，Vite 只监听 `[::1]:5173`，手输 `127.0.0.1:5173` 会 `ERR_CONNECTION_REFUSED` —— 统一用 `localhost`。
- GitHub Pages 项目页是子路径，构建资源若是绝对路径 `/assets/...` 会 404 白屏 → 需要 `base: './'`。

### 第 2 轮 · 域名与「别人怎么访问」（10-18 12:20）

结论：**没有影响**。本地双击是读硬盘，访客访问的是托管服务器发来的已编译 `dist/`，全程不碰 `file://`。

- 域名只是门牌号，还得有托管：GitHub Pages / Vercel / Netlify / Cloudflare Pages（免费）；国内 OSS/COS+CDN 需 ICP 备案。
- 上线流程：`npm run build` → 传 `dist/` → 绑域名。
- 「独立域名 / 绑定域名的 Pages」用默认 `/` 即可；「GitHub Pages 项目页」必须 `base: './'` 或 `/仓库名/`。
- 提醒：5 张作品图 + 头像是 `images.unsplash.com` 外链，国内可能慢/失败，建议本地化。

### 第 3 轮 · GitHub Pages 准备（10-18 12:21）

用户：「我想使用GitHub pages，但我不会注册」。

- 查 GitHub 公开 API：账号 `zhongJJ2233` **已存在**（2026-05-04 注册，0 公开仓库），与本地 git 配置的用户名/邮箱 `428982120@qq.com` 对得上 → 让用户先确认是不是本人。
- 新仓库名 `personal-ip`，Public，不勾 README/.gitignore/license。
- 已准备：`vite.config.js`（`base: './'`）、`.gitignore`、`git rm --cached node_modules`（477 个文件 / 46 万行）、本地提交 `c691230`。
- 用真实浏览器模拟 Pages 子路径验证渲染正常；`dist/index.html` 已引用 `./assets/...`。
- 给两个方案：A = AI 用设备授权全自动建仓推送开 Pages；B = GitHub Desktop。

### 第 4 轮 · 用户选「方式A」（10-18 12:24）

- winget 下载 GitHub CLI 因网络慢失败 → 改用 **GitHub OAuth 设备授权**（无需安装 gh）。
- 一次性代码 `CFF8-47E3`（15 分钟有效，约到 12:45），用户打开 <https://github.com/login/device> 输入并 Authorize，脚本轮询。

### 第 5 轮 · 上线成功（10-18 12:2x~12:4x）

| 步骤 | 结果 |
| --- | --- |
| 账号 | `zhongJJ2233`（ID 281603054） |
| 仓库 | `zhongJJ2233/personal-ip`，Public |
| 推送 | 历史压缩为单提交 `cb436e2`，22 文件 / 0.49 MB |
| Pages | Build type = GitHub Actions |
| 构建 | Actions run `39097492092` 全绿 |
| 线上验证 | HTML/JS/CSS 均 200，页面完整渲染，照片正常 |

- 线上地址：**<https://zhongjj2233.github.io/personal-ip/>**
- 安全：临时 token 已删除；授权可在 <https://github.com/settings/applications> 撤销。
- **以后每次更新**：改完代码 → 说一声「更新网站」→ 重新走一次约 30 秒的设备授权 → 推送 → Actions 自动部署（首次可能 404，等 1~2 分钟）。

### 第 6 轮 · 新增「影像」面板（10-18 13:41）

用户原话：「额，我现在想再单开一个面板，这个面板可以用于上传我的视频，但我想让其呈现的效果是，只有我访问时我有编辑权限，即上传视频和编辑的权限，其他人访问时只有观看和评论的权限，另外可以的话我也希望可以加入视频弹幕功能。」

实现（提交 `92ac4d3`，截图 `f071394`）：
- 导航第 3 项「影像」，区块 `#video`，位于「正在做」和「联系我」之间。
- **不做文件上传**：每支视频登记 B 站 **BV 号**，嵌入 B 站官方播放器（免费、国内快、自带 B 站原生弹幕）。
- 站内另有一层**弹幕墙**（`DanmakuWall.jsx`），评论勾选「作为弹幕飘过」后从右向左漂浮；**与播放时间轴无关**，不是 B 站那种 00:32 定点弹幕。
- 匿名评论（昵称可空 → 「匿名访客」）。
- **站主后台**：右下角站主入口 → Supabase 邮箱密码登录 → 新增/编辑/删除影像、删评论；访客只能看+评论。
- **未配数据库时自动「演示模式」**：数据只存本机 `localStorage`，页面顶一条深色提示；所有人都能评论但都只存在自己浏览器里，站主入口也只能进演示登录。
- 数据层 `supabase/schema.sql`：建表 + RLS，`is_owner()` 校验 `YOUR_EMAIL_HERE`（改成站主邮箱后整段在 Supabase SQL Editor 执行）。
- 文档：`影像面板-使用说明.md`（配置/日常使用/排查）。
- 授权代码 `FAA9-3A66`（scope `repo` + `workflow`），推送 `f071394`，Actions run `39102677829` 成功；线上用无头 Edge 验证：导航、`#video`、弹层双栏、B 站播放器播放、2 条演示评论、弹幕飘过，无 JS 报错。
- 截图：`artifacts/video-panel-overview.png`、`video-panel-player.png`、`video-panel-owner-editor.png`。

### 第 7 轮 · 移动端播放器被压成 0 宽（10-18 14:31）

用户发手机截图：「目前pc端的网站显示是没有问题的了，但是用移动端显示时会出现这个情况，视频界面无法正常显示观看，解决这个问题。」

- 根因：桌面双栏父容器 `.video-modal-grid` 有 `align-items: start`；≤980px 改成上下堆叠（column flex）后它作用于**宽度**，播放器所在左栏被压成 **0 宽**，B 站 iframe 只剩一条黑边。
- 修复（`src/components/VideoPanel.css` 响应式段）：

```css
@media (max-width: 980px) {
  .video-modal-grid { display: flex; flex-direction: column; align-items: stretch; min-height: auto; }
  .video-modal-stage { width: 100%; border-right: 0; border-bottom: 1px solid var(--line); }
}
```

- 顺带修好 820–980px 平板区间。验证 iPhone 视口 393×852：播放器 **0×0 → 393×221**（16:9）。
- 部署 commit `5b4f31e`，新资源 `index-CW_uyHuU.css`；截图 `artifacts/video-panel-mobile.png`。
- 手机「正常现象」：禁带声音自动播放（需点一下）、4:3 MV 左右黑边、弹幕开关默认可能是 OFF、微信内置浏览器要下拉刷新两次。

### 第 8~9 轮 · 点赞功能（10-18 14:41 → 上线）

用户：「再给视频窗口外加一个点赞功能」。

- 卡片标题右侧 ♥ + 数字；弹层头部 ♥ 与卡片**实时同步**；再点取消；同浏览器同一视频只算一次；刷新保持。
- 改动：`src/lib/store.js`（`listLikes` / `toggleLike`，演示模式 localStorage，接库走 `video_likes` 表按匿名 visitor id 去重）、`src/components/VideoPanel.jsx`（按钮/乐观更新/加载态）、`VideoPanel.css`（手机端头部两行）、`supabase/schema.sql`（`video_likes` 表 + 唯一约束 + RLS）、使用说明。
- ♥ 字符在 Arial 下像「▼」，改成内嵌 SVG 爱心。
- 本地提交 `6b97e30`；授权码 `A8D9-C3D9`（必须点绿色 **Authorize**，只输代码无效）；推送 `6b97e30` + `80c0162`（截图），部署成功，token 删除。
- 线上实测：0→1、刷新保持、卡片/弹层同步、取消回 0、无报错。
- 截图：`artifacts/video-like-card.png`、`video-like-mobile.png`。
- 仍是**演示模式**：点赞只在本机浏览器；接了 Supabase 才汇总。已建过表的要**重跑 `schema.sql`** 补 `video_likes`。

### 第 10 轮 · 封面自动取自 B 站（10-18 15:02，已提交未发布）

用户：「影像档案的视频封面可以取自视频中，而不是现在这样什么都不显示。」

- 行为：不填封面链接时，卡片自动用该视频 B 站封面（本机缓存 **7 天**）；可粘贴自定义封面覆盖；后台编辑弹窗「从 B 站自动获取」按钮顺带填标题；取不到退回编号占位图。
- 两个坑：
  1. `api.bilibili.com/x/web-interface/view` 带 `Origin` 请求返回 **403**，普通 fetch 被 CORS 拦 → 改用 **JSONP**（`<script>` 加载）。
  2. `i1.hdslb.com` 封面带本站 Referer 返回 403，不带就 200 → `<img referrerPolicy="no-referrer">`；并把 `http://` 封面改写成 `https://` 避免混合内容。
- 本地提交 `fe594e0`；**按用户选择没有发布**，线上仍是旧版；临时 token 与轮询任务已清理。
- 截图 `artifacts/video-cover-auto.png`。示例封面带黑边是 B 站原图 4:3，不是布局问题。

## 5. 关键技术结论 / 踩过的坑（下次直接用）

| 坑 | 结论 |
| --- | --- |
| 双击 HTML 白屏 | Vite 工程不能双击；`file://` 禁止 ES Module（origin=null）。用 `start-site.bat` 或 `npm run dev` |
| `127.0.0.1` 连不上 | Node 24 下 Vite 只监听 `[::1]`，用 `localhost`；`--host 0.0.0.0` 才两者都通 |
| GitHub Pages 白屏/无样式 | `base: './'`（已配 `vite.config.js`） |
| 移动端播放器 0 宽 | column flex 里父级的 `align-items: start` 作用于宽度 → 改 `align-items: stretch` |
| B 站封面接口 403 | 浏览器端带 Origin 会被拒 → JSONP |
| B 站图片 403 | 防盗链看 Referer → `<img referrerPolicy="no-referrer">` |
| 评论/点赞「为什么不共享」 | 没配 Supabase → 演示模式，数据只在本地 localStorage |
| 点赞计数 | `video_likes` 唯一约束按匿名 visitor id 去重；不防刷、不登录 |
| 视频托管 | 不自建存储，用 B 站嵌入换免费+国内速度+原生弹幕 |
| 站内弹幕 | 只是漂浮气氛层，不跟时间轴；定点弹幕需自研播放器（未做） |

## 6. 当前状态（截至本文件写入）

**代码（本地 `E:\web myself`）**

```
fe594e0 feat: auto-fetch Bilibili video covers via JSONP with local cache   ← 本地 HEAD，未发布
80c0162 docs: add like feature screenshots                                  ← 线上部署到此
6b97e30 feat: add per-video like button ...
5b4f31e fix: mobile video modal stage collapsed to zero width ...
f071394 docs: add video panel screenshots
92ac4d3 feat: add video archive panel ...
cb436e2 Li Lab personal IP site (Vite + React)
```

**线上**：<https://zhongjj2233.github.io/personal-ip/>（Commit 部署到 `80c0162` 为止，**没有**封面自动获取）。
**Supabase**：状态未知 —— 打开线上站，看「影像」面板顶部有没有「演示模式」提示条；有 = 未配置。若已配置过，需重跑一次 `supabase/schema.sql` 以补 `video_likes` 表。

**GitHub / 凭据**
- 账号 `zhongJJ2233`（ID 281603054），仓库 `zhongJJ2233/personal-ip`（Public）。
- 每次推送都走**设备授权**（临时 token，用完即删，仓库和磁盘不留凭据）。撤销授权：<https://github.com/settings/applications>。
- 不要在任何文件/对话里贴 token、密码、验证码。

## 7. 下一步（按优先级，可直接执行）

1. **发布封面功能**：`git push`（需重新走设备授权：<https://github.com/login/device> 拿一次性代码 → 用户点 Authorize）→ 等 Actions 绿 → 线上确认卡片显示 B 站封面。
2. **接 Supabase 真库**（约 5 分钟，做完才是「真上线」）：
   - <https://supabase.com> 注册 → New project；
   - `supabase/schema.sql` 里两处 `YOUR_EMAIL_HERE` 改成站主邮箱 → SQL Editor 整段执行；
   - 本地：`.env.example` → `.env.local` 填 `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` / `VITE_OWNER_EMAIL` / `VITE_BILIBILI_PROFILE`；
   - 线上：仓库 Settings → Secrets and variables → Actions → Variables 建同名变量 → 重跑部署；
   - Supabase Authentication → Users → Add user 建站主账号（Auto Confirm）；
   - 验证：访客评论所有人可见、点赞计数汇总、站主能登录并增删影像。
3. 可选：绑自定义域名（CNAME + Enforce HTTPS）、把 unsplash 外链图片下载到本地、评论审核/限流。

## 8. 常用命令

```bash
# 本地预览（方式一：双击 start-site.bat 也行）
npm run dev            # 打开 http://localhost:5173/

# 构建 / 预览构建
npm run build          # 产物 dist/
npm run preview        # http://127.0.0.1:4173

# 推送上线（需先设备授权拿 token）
git add -A && git commit -m "..." && git push   # push 触发 GitHub Actions 自动部署
```

## 9. 已知风险 / 未决问题

- 演示模式与真库的行为差异（评论可见性、点赞汇总、登录）要在配置后重新验收一遍。
- 站内弹幕不跟时间轴；需要定点弹幕只能后期自研播放器。
- 评论无审核、无限流；点赞不防刷（换浏览器可重复点赞）。
- B 站封面接口在部分网络（公司代理/被墙）会失败 → 退回占位图，可手动填封面地址。
- 微信/QQ 内置浏览器缓存重，更新后建议下拉刷新两次。
- `images.unsplash.com` 外链在国内可能加载失败（首页作品图/头像）。

## 10. 2026-10-18 16:xx 会话：主题从「黑 + 荧光黄」改为「天蓝 / 清绿 / 白」

**动机**：用户 m00372：「黑色太压抑了，我想换成以天蓝色，清绿色和白色为主题风格的」。

**做法**（只改主题层，不动结构/功能）：
- `src/styles.css` 顶部重写 token：`--bg #f6fbfd`、`--surface #fff`、`--panel #eaf5fb`、`--mint-soft #ddf3ea`、`--ink #0e2a33`、`--paper-dim #4c6b77`、`--sky #3aa5dd`、`--sky-deep #1878ad`、`--mint #3fbf9a`、`--mint-deep #157a61`、`--line rgba(14,42,51,.16)`；保留 `--paper/--acid/--orange` 作兼容别名（VideoPanel.css 仍在用）。
- 首屏加两层 ambient radial（sky 4% / mint 4%），标题第一行 ink、第二行 `#1878ad`；4 个 ink 转 stroke 动画的地方（TitleLine/StrokeText 默认色）同步换色。
- `PortraitCard`：去掉 `grayscale + mix-blend-mode: screen`（浅色下会发灰），改正常色 + 底部深色 scrim；背面卡从荧光黄改为 `--mint-soft`。
- `AccordionGallery`：`grayscale={false}`、`overlayColor="#fff"`、`textColor="#0e2a33"`，遮罩从「整片 35%」改为「60% 以下渐变到 88% 白」；移动端只给 active 面板遮罩。
- `VideoPanel.css`：深色底全部换成 `#fff/#eaf5fb/#f6fbfd`，弹幕条改白底、图片由 grayscale 改 saturate；`color: var(--ink)` 在 accent 底上改白字。
- `index.html` 的 `theme-color` 改 `#f6fbfd`；`prefers-reduced-motion`、`min-height: 100dvh` 等原有规则保留。
- 无障碍：全局 `:focus-visible` 用 sky-deep 描边；微标签 10px→12px、letter-spacing 收窄；`--paper-dim` 加深到 5.5:1，`--mint-deep` 加深到 5.0:1（品味审计报告里唯一两条 contrast FAIL 已消）。

**验证**：`npm run build` 通过（795ms，CSS 30.4KB gzip 6.9KB）；用 taste-skill 的 `inspect.mjs` 在 1440/390 两档截图核对首屏、作品、影像、联系、弹窗；弹窗（登录/评论/弹幕）已实测浅色可读。

**尚未做**：没有提交、没有 push（部署需要用户点头）；作品图/头像是 unsplash 外链，国内网络可能加载不出（历史已知问题）。改主题时的硬编码色值统一走 `src/styles.css` 的 `:root`，下次换色只改 token 即可。

## 11. 2026-10-18 18:xx 会话：新增「近期我说的」博客面板

**动机**：用户 m00758：「多加一个面板，叫做"近期我说的"，这个面板的作用是博客类的我可以在上面发表一些帖子，但只有我有编辑权限，其他人只有浏览，点赞，转发，评论权限，评论可以允许发emoji。」

**落点**：新面板插在「正在做」和「影像」之间（`#blog`），导航与面板目录同步加项并重编号：01 首页 / 02 关于我 / 03 正在做的事 / 04 近期我说的 / 05 影像 / 06 联系我；各区块 kicker 顺延为 `NOTES / 03`、`VIDEO ARCHIVE / 04`、`SAY HELLO / 05`。

**数据层**（`src/lib/store.js`，与影像面板同一套双模式）：
- 新增 localStorage key：`li_blog_posts_v1` / `li_blog_comments_v1` / `li_blog_likes_v1` / `li_blog_liked_v1`；演示模式预置 2 篇帖子和 3 条评论。
- 新增 API（demo 与 Supabase 各实现一遍）：`listPosts / savePost / deletePost / listPostLikes / togglePostLike / listPostComments / listPostCommentCounts / addPostComment / deletePostComment`。
- Supabase 走 REST：`/rest/v1/posts`、`/rest/v1/post_comments`、`/rest/v1/post_likes`（`visitor_id` 复用浏览器本地随机 ID，用于去重和「我赞过」）。

**建表**：`supabase/schema.sql` 追加第 10 节：`posts`（title ≤60、body ≤5000）、`post_comments`（nickname ≤20、content ≤200，允许 emoji）、`post_likes`（post_id+visitor_id 唯一）；RLS 策略：所有人可读；只有 `public.is_owner()` 能写/改/删帖子；访客（anon+authenticated）可发评论；站主可删评论；点赞所有人可增删。**需要在 Supabase SQL Editor 里手动跑一次第 10 节**，否则真库模式下列表 404。

**界面**（`src/components/BlogPanel.jsx` + `BlogPanel.css`）：
- 列表是「日期 / 标题 / 摘要 / 操作」的编辑式行卡，整卡可点开阅读；右侧有 ♥ 点赞（内联 SVG，避免 UI 出现 emoji 字符）、转发、阅读；站主登录后每张卡多出「编辑 / 删除」，删除是两步确认（3.2 秒内再点一次「确认删除」）。
- 阅读弹层：段落按空行拆分，底部点赞 / 转发 / 评论数；评论区昵称可留空（记 20 字内，localStorage 记住），正文 200 字上限，带 30 个常用 emoji 选择器（点选插入光标处，原生 emoji 也能直接输入）。
- 转发：优先 `navigator.share`，否则复制 `#post/<id>` 深链（`navigator.clipboard` → `execCommand` 兜底）；打开带该 hash 的链接会自动弹出对应帖子。
- 弹层复用 VideoPanel.css 的 `.video-modal-backdrop / .video-sheet / .video-ghost-button / .video-notice` 等通用类，避免重复造一套弹窗样式；弹层打开时锁 body 滚动，Esc 逐层关闭。
- 站主登录沿用同一套 Supabase Auth（`signIn`/`signOut`），演示模式下任意账号可进（提示文案已注明）。

**验证**：`npm run build` 通过（CSS 40.5KB gzip 8.3KB，JS 327KB gzip 115KB）；CDP 实测通过：站主登录 → 发帖 → 卡片置顶 → 点赞 → 打开阅读 → emoji 插入 → 发评论 → 转发 → 深链 `#post/demo-post-1` 自动打开 → 编辑改名 → 两步删除 → 退出；1440 / 390 两档截图在 `.dsh/blog-after/`；控制台无报错；`inspect.mjs` 审计 10 FAIL / 5 WARN（与加面板前一致，均为既有的编辑风设计选择：装饰序号、hairline、渐变、小字等）。

## 12. 2026-10-18 21:xx · 首屏加「北京时间」实时时钟

**动机**：用户 m01835 截图（在首屏左侧标题与右侧人像之间的空档画了红框）：「在这个位置加上一个详细标准的北京时间显示」。

**落点**：新增 `src/components/BeijingClock.jsx`，渲染在 `src/main.jsx` 的 `.hero-copy` 与 `.hero-visual` 之间（`<BeijingClock />`）。
- 时区固定 `Asia/Shanghai`（`Intl.DateTimeFormat` 的 `timeZone`），**与访客本机时区无关**；`zh-CN` 出日期与星期，`en-GB` + `hour12:false` 出 `HH:MM:SS`。
- 秒针用 `setTimeout(1000 - Date.now() % 1000)` 对齐整秒刷新，不会因为进页面的时刻偏半格。
- 展示四行：`● 北京时间 · BEIJING TIME` / `21:30:50`（秒用 sky-deep 蓝色）/ `2026年10月18日 · 星期日` / `UTC+8 · ASIA/SHANGHAI`。

**布局**（`src/styles.css`）：
- ≥1321px：`.hero-clock` 绝对定位在空档里，`top:17%; left:46%; width:calc(54% - 8.5vw - 430px - 3vw)`——宽度由「人像左边到 46% 竖线右边」的实际空档算出来，不会压到人像；`white-space: nowrap` 防数字换行。
- 821–1320px：横向空档不够，改为两行网格（`grid-row:1` 文案 / `grid-row:2` 时钟，人像 `grid-row:1/span 2` 居中跨行），时钟落在「认识我」下方。
- ≤820px：单列自然排在文案与人像之间（`position: static`）。
- 断点先定 1320 是因为 1280 宽时空档只剩约 178px，放不下完整时间块；实测 1440/1280/1024/390 四档截图均无重叠、无横向溢出。

**验证**：`npm run build` 通过（CSS 41.8KB gzip 8.6KB，JS 328KB gzip 115.5KB）；CDP 截图 `artifacts/hero-clock.png`；`document.querySelector('.hero-clock')` 的 `getBoundingClientRect` 确认 `right <= .hero-visual.left`；控制台无报错（仅 Edge 自带扩展的无关 TypeError）。

**状态**：已在本地提交；**是否发布等待用户确认**（推送需 GitHub 设备授权）。
