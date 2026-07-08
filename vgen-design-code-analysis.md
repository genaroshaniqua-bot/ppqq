# VGen 网站设计逻辑与代码结构拆解

调研对象：https://vgen.co/

调研时间：2026-07-08

> 说明：本文基于公开页面 HTML、Next.js 构建清单、SSR 注入数据、CSS/styled-components 输出和桌面/移动端截图分析。没有访问 VGen 私有源码，因此“代码结构”部分是从公开构建产物反推的工程结构，而不是源码逐字还原。

## 1. 一句话定位

VGen 是面向 VTuber、主播、内容创作者与粉丝的创作者委托和数字商品 marketplace。首页不是传统营销落地页，而是“可直接逛、可直接买、可直接发现创作者”的市场首页。

它的核心设计目标可以概括为：

- 先建立品牌立场：For the love of human creativity。
- 立刻展示供给规模：380,000+ commission services。
- 直接进入交易场景：服务卡片、数字商品卡片、分类入口、搜索入口。
- 用“真人创作/反生成式 AI/隐私验证”形成平台信任差异化。

## 2. 首页信息架构

桌面首屏结构大致如下：

```text
Sticky Navbar
  Logo
  Commission / Shop / Challenge / VSONA
  Currency
  Basket / Message / Notification
  I'm an artist+ / Sign up / Account menu

Hero
  H1: For the love of human creativity
  Search bar
  Horizontal hero cards
    Made for creators
    No Generative AI
    Verified but private

Commission discovery
  380,000+ commission services
  Category orb row
  Horizontal service card row

Shop discovery
  Shop digital products
  Product category chips
  Horizontal product card row

Artist directory
  All artists+
  Trending / Random / Latest tabs
  Filters
  Infinite list/grid
```

移动端结构保留同样的信息顺序，但把导航降为底部 tab bar，顶部只保留 logo；搜索栏从桌面右侧并列布局变为标题下方全宽输入。

## 3. 设计逻辑

### 3.1 不是“介绍型首页”，而是“市场型首页”

VGen 没有把首屏浪费在冗长价值主张上。H1 之后立即放搜索、横向内容卡和真实商品/服务列表。用户一进入页面就能完成三类动作：

- 搜索 tag、category、artist、service。
- 浏览 commission 分类。
- 购买数字商品。

这更接近 Etsy、Booth、Fiverr 的 marketplace 首页逻辑，而不是 SaaS 官网逻辑。

### 3.2 品牌立场被嵌进产品内容

“No Generative AI”不是页脚政策，也不是单独 banner，而是 hero card 之一，和“Made for creators”“Verified but private”并列。这意味着它不是附属声明，而是平台筛选机制的一部分。

设计上它使用暗色插画卡片和白色文字，形成强视觉停顿；用户在逛内容之前先接收平台价值观。

### 3.3 信任感来自“验证 + 隐私 + 真实数据”

首页多处强化信任：

- 创作者头像、用户名、徽章、评分、评论数。
- 服务状态标签，例如 OPEN。
- 销量、折扣、价格、评分。
- “Verified but private”说明平台验证创作者，但不公开真实身份。

这种设计适合创作委托业务，因为交易风险来自交付质量、创作者真实性、沟通成本和隐私顾虑。

### 3.4 视觉风格：轻底色 + 高饱和内容资产

页面背景是非常浅的灰白色，CSS 变量中可见：

```css
--theme-GRAY-LIGHTER: rgba(248, 247, 248, 1);
--theme-BLACK: rgba(12, 9, 13, 1);
--theme-PRIMARY: rgba(84, 197, 183, 1);
--theme-ACCENT-1: rgba(240, 132, 188, 1);
--theme-ACCENT-3: rgba(98, 131, 214, 1);
--theme-ACCENT-4: rgba(148, 108, 243, 1);
--theme-SUCCESS-NEON: rgba(184, 255, 38, 1);
```

页面本身克制，真正的视觉丰富度来自用户上传的插画、Live2D 作品、商品封面。平台 UI 只做三件事：

- 提供浅色舞台。
- 用圆角和间距把内容组织清楚。
- 用少量荧光绿、渐变 orb、徽章提示关键状态。

这对 marketplace 很重要：平台不能抢过创作者作品本身。

### 3.5 圆角系统很强

可见元素大量使用 pill 和大圆角：

- 搜索框：大 pill。
- 按钮：2rem 到 2.75rem 级别圆角。
- hero 卡片：大圆角。
- 商品/服务图片：约 1.25rem 圆角。
- 分类 orb：圆形渐变图标。

这让高密度内容保持“软、可亲近、社区化”的感觉，避免金融/后台系统式的冰冷。

### 3.6 横向滚动是核心浏览模型

首页多处使用横向滚动：

- hero cards。
- category orb row。
- service preview row。
- product category chips。
- product preview row。

这符合移动端优先的 marketplace 行为：先快速扫一排，再进入详情。桌面端也保留横向 row，而不是全部展开成大网格，目的是减少首屏垂直长度并保持“发现流”的节奏。

## 4. 关键组件拆解

从 styled-components 输出中可以看到一批具有明确语义的组件名：

```text
DiscoveryNavbar
SearchBar
SwipeableCards
ArtistDirectoryCTABanner
CatalogueSelector
CatalogueOrb
CatalogueItem
ServiceGridCard
ServiceGrid
ProductListing
ProductGrid
Tabs
SwipeableFilters
ChecklistPicker
CartNavMenu
ChatLauncher
```

如果用 React/Next.js 复刻学习，可以按这些模块拆：

```text
app/
  page.tsx
components/
  layout/
    DiscoveryNavbar.tsx
    MobileBottomNav.tsx
    FullWidthLayout.tsx
  discovery/
    HeroSection.tsx
    HeroCardCarousel.tsx
    CatalogueSelector.tsx
    CategoryOrb.tsx
    ServicePreviewSection.tsx
    ProductPreviewSection.tsx
    ArtistDirectory.tsx
  cards/
    ServiceCard.tsx
    ProductCard.tsx
    CreatorIdentity.tsx
    RatingMeta.tsx
  ui/
    Button.tsx
    IconButton.tsx
    SearchBar.tsx
    Tabs.tsx
    Badge.tsx
    SwipeableRow.tsx
lib/
  data/
    mock-services.ts
    mock-products.ts
  format/
    currency.ts
    compact-count.ts
styles/
  tokens.css
```

## 5. 公开构建产物反推的技术结构

### 5.1 框架

页面是 Next.js 应用。证据：

- HTML 中存在 `__NEXT_DATA__`。
- 构建清单路径为 `/_next/static/.../_buildManifest.js`。
- 页面数据中包含 `page: "/"`、`buildId: "f56ba72"`、`assetPrefix`。
- 首页标记了 `gssp: true` 和 `appGip: true`，说明存在服务端数据准备逻辑。

公开数据片段：

```json
{
  "page": "/",
  "buildId": "f56ba72",
  "assetPrefix": "https://assets.vgen.co/f56ba72",
  "gssp": true,
  "appGip": true,
  "pagePropsKeys": [
    "startingTab",
    "contestWinnerSubmissions",
    "initialServices",
    "initialProducts"
  ]
}
```

### 5.2 渲染方式

首页是 SSR + 客户端 hydration：

- 服务端先注入首屏内容、服务列表和商品列表。
- 客户端 JS 接管后处理搜索、轮播、筛选、无限滚动、菜单、购物车、聊天等交互。

这样做的好处：

- 首屏 SEO 更好，搜索引擎能读到 marketplace 内容。
- 用户进入页面时已经能看到服务卡和商品卡，不必等待前端再请求。
- 后续交互仍然保持 SPA 体验。

### 5.3 数据形态

首页注入了：

- `initialServices`: 初始 commission 服务列表，包含 `nextCursor` 和 `services`。
- `initialProducts`: 初始数字商品列表，包含 `nextCursor` 和 `products`。
- `contestWinnerSubmissions`: 活动/挑战相关展示数据。
- `startingTab`: 默认 tab，例如 `Trending`。

服务与商品数据包含典型 marketplace 字段：

```text
service/product name
creator/user identity
avatar
badges
price
currency
discount
sales count
review stats
tags
category id
gallery images
status
next cursor
```

这说明首页列表不是静态 CMS 内容，而是搜索/推荐/排序系统输出的结果。

### 5.4 路由规模

构建清单里可见大量路由，主要分为：

```text
/                          首页发现页
/commission                委托服务入口
/commission/service/[id]   服务详情
/shop                      数字商品入口
/shop/product/[id]         商品详情
/profile/[username]        创作者主页
/search                    搜索结果
/category/[...slugs]       委托分类
/shop/category/[...slugs]  商品分类
/creator/...               创作者后台
/my-orders                 买家订单
/my-requests               请求/委托
/challenge                 活动/挑战
/vsona                     角色/身份相关子产品
```

这是一套完整交易平台，而不是单纯展示站。

### 5.5 样式方案

HTML 中有 `data-styled-version="6.4.3"`，说明使用 styled-components v6。样式特点：

- 组件名保留在 SSR CSS 中，例如 `ServiceGridCard__GridCard`。
- 全局主题变量挂在 `body`。
- 大量使用 CSS custom properties：`var(--theme-BLACK)`、`var(--theme-GRAY-LIGHTER)`。
- 响应式断点使用 rem，例如 `47.9375rem`、`75rem`、`100rem`、`150rem`。
- 使用 `position: sticky` 实现顶部导航和筛选栏吸顶。
- 使用 `overflow-x: auto` 实现横向滚动列表。

### 5.6 字体

字体栈可见：

```css
font-family: 'Satoshi', "Noto Sans JP", "Noto Sans KR", "Noto Sans TC", Arial, Tahoma, sans-serif;
```

设计意图：

- `Satoshi` 负责英文品牌和 UI 的圆润现代感。
- Noto Sans JP/KR/TC 覆盖日文、韩文、繁中等多语言创作者内容。
- 这是全球创作者平台必须考虑的字体策略，不只是视觉选择。

### 5.7 资源与性能

页面做了这些优化：

- `preconnect` 到 `api.vgen.co`、`storage.googleapis.com`、Google Tag Manager、Google Fonts。
- 静态资源走 `https://assets.vgen.co/{buildId}`。
- 图片来自 `storage.vgen.co` 或 Google Cloud Storage。
- CSS 拆成多个 chunk。
- JS chunk 较多，按路由和共享模块拆分。
- 首页资源中出现 Turbopack chunk 名称，说明构建链路可能使用 Turbopack 或 Next 的相关编译能力。

### 5.8 安全与第三方服务

响应头中可见较严格的 CSP 和安全头：

- `strict-transport-security`
- `x-content-type-options: nosniff`
- `x-frame-options: DENY`
- `content-security-policy`

第三方服务包括：

- Google Analytics / Tag Manager
- Sentry
- PostHog
- Stripe
- PayPal
- Stream Chat
- reCAPTCHA

对学习项目而言，这些不需要一开始复刻。先做页面结构、数据模型、交易卡片和响应式体验即可。

## 6. 响应式策略

### 桌面端

- 顶部导航完整展示。
- H1 与搜索框左右并排。
- 横向 hero 卡片一屏显示 2 到 3 张。
- 服务和商品卡片展示更多列。
- 筛选条可 sticky。

### 移动端

- 顶部简化为 logo。
- 底部 tab bar 承担主导航。
- H1 放大但换行明显，搜索框占满宽度。
- hero cards、分类、服务、商品全部横向滑动。
- 卡片宽度接近屏宽的 70% 到 80%，露出下一张作为滑动暗示。

移动端的关键不是“缩小桌面”，而是把每个 section 都变成可横扫的 discovery rail。

## 7. 交互模式

可以拆成以下交互原子：

- 搜索输入：按 tag、category、artist、service 搜索。
- 横向轮播：hero cards、服务卡、商品卡。
- 分类选择：圆形 orb + 文本标签。
- tab 切换：Trending、Random、Latest。
- filter chips：All、Commissions、Verified、Everyone、Availability 等。
- 收藏：卡片右上角 bookmark。
- 卡片媒体轮播：商品/服务图片内部有分页点和箭头。
- 用户菜单、购物车、聊天、通知。
- 无限滚动：artist/service discovery 列表继续加载。

学习实现时，不要一开始做全。建议优先级：

1. 静态数据渲染首页。
2. 横向滚动 row。
3. 搜索框 UI。
4. 分类 filter 的本地筛选。
5. 卡片收藏状态。
6. 无限滚动或分页。
7. 登录、购物车、聊天等复杂系统。

## 8. 可以复刻的最小版本

如果目标是用 Codex 学习制作一个类似风格的网站，最小可行范围建议是：

```text
首页
  顶部导航
  H1 + 搜索框
  三张品牌 hero cards
  commission 分类 orb row
  commission service card row
  shop product card row
  移动端底部导航

数据
  mock services
  mock products
  mock creators
  category config

交互
  搜索过滤
  分类过滤
  收藏切换
  横向滚动
```

不要先做：

- 支付。
- 私信。
- 多货币。
- 创作者后台。
- 实时通知。
- 复杂身份验证。

这些属于平台系统，学习首页设计时会分散注意力。

## 9. 复刻时的组件设计建议

### 9.1 Design tokens

先建立一组 token：

```css
:root {
  --color-bg: #f8f7f8;
  --color-text: #0c090d;
  --color-muted: rgba(12, 9, 13, 0.6);
  --color-border: #eceaec;
  --color-card: #ffffff;
  --color-primary: #54c5b7;
  --color-pink: #f084bc;
  --color-blue: #6283d6;
  --color-purple: #946cf3;
  --color-lime: #b8ff26;

  --radius-pill: 999px;
  --radius-card: 20px;
  --radius-small: 8px;

  --space-page-mobile: 16px;
  --space-page-desktop: 32px;
}
```

### 9.2 数据模型

```ts
type Creator = {
  id: string;
  name: string;
  avatarUrl: string;
  badges: string[];
  verified: boolean;
};

type Listing = {
  id: string;
  title: string;
  creator: Creator;
  imageUrls: string[];
  status?: "OPEN" | "CLOSED";
  priceLabel: string;
  rating: number;
  reviewCount: number;
  soldCount?: number;
  tags: string[];
  category: string;
  discountLabel?: string;
};
```

### 9.3 Section 模式

每个 section 都可以统一成：

```tsx
<DiscoverySection
  title="380,000+ commission services"
  actionLabel="All categories"
>
  <CategoryRail />
  <ListingRail items={services} renderItem={ServiceCard} />
</DiscoverySection>
```

好处：

- 首页结构清晰。
- 服务和商品可以复用横向 rail。
- 移动端响应式只在 rail/card 层处理。

## 10. 对 Codex 的实现提示词模板

可以这样分阶段让 Codex 做：

```text
先做一个 VGen 风格的 marketplace 首页原型。
技术栈：Next.js + TypeScript + CSS modules 或 Tailwind。
范围：只做首页，不做登录和支付。
要求：
1. 顶部导航，移动端底部导航。
2. H1 + 搜索框。
3. 三张 hero cards，横向滚动。
4. commission 分类 orb row。
5. commission service cards 横向列表。
6. shop product cards 横向列表。
7. 使用本地 mock 数据。
8. 响应式适配桌面和 390px 移动端。
9. 样式要学习 VGen 的轻灰背景、大圆角、pill 控件、高饱和作品卡片，但不要复制其 logo、图片和文案。
```

第二阶段再加：

```text
在现有首页上增加搜索和分类过滤：
1. 搜索 title、creator、tags。
2. 点击 category chip 过滤对应卡片。
3. 没有结果时显示空状态。
4. 保持移动端横向滚动体验。
```

第三阶段再加：

```text
把 mock 数据抽到 lib/data，并加入详情页：
1. /commission/service/[id]
2. /shop/product/[id]
3. 详情页展示 gallery、creator、price、rating、description。
4. 首页卡片点击进入对应详情。
```

## 11. 学习重点总结

VGen 值得学习的不是某个单独视觉效果，而是这些系统性选择：

- 首页即产品，不是广告页。
- 价值观、信任机制和交易内容放在同一个浏览路径里。
- 内容资产是视觉主角，平台 UI 保持轻量。
- 大圆角、pill、横向 rail 形成柔和、社区化、移动优先的 marketplace 气质。
- SSR 首屏数据 + 客户端交互，兼顾 SEO、速度和体验。
- 数据模型围绕 listing、creator、category、review、price、gallery 组织。
- 复杂平台能力拆在后面：支付、消息、通知、创作者后台都不是首页学习的第一步。

如果你要自己做一个学习项目，最好的路线是先复刻“发现页的信息架构和组件系统”，再逐步补交易闭环。
