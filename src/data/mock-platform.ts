import type { AccountOrder, CommissionRecord, CreatorService, InteractionPrompt, MarketProduct } from "@/types/platform";

export const marketProducts: MarketProduct[] = [
  {
    id: "avatar-pack-moon",
    title: "月光社团头像提示词套装",
    kind: "数字商品",
    category: "头像模板",
    creator: "青灯素材铺",
    price: "18",
    currency: "CNY",
    tags: ["头像", "提示词", "社交展示"],
    desc: "适合把 角色资产 快速整理成头像构图、光线、服装和负面提示词。",
    includes: ["12 组头像方向", "3 种光线模板", "可复制负面提示词"],
    status: "可加入愿望单",
    accent: "#54c5b7"
  },
  {
    id: "card-template-star",
    title: "星屑角色卡排版模板",
    kind: "数字商品",
    category: "角色卡模板",
    creator: "纸页工坊",
    price: "26",
    currency: "CNY",
    tags: ["角色卡", "PSD", "截图友好"],
    desc: "为 OC 设定集和社交平台展示准备的角色卡版式，强调标签和一句话设定。",
    includes: ["横版角色卡", "竖版角色卡", "标签组件"],
    status: "预览中",
    accent: "#946cf3"
  },
  {
    id: "badge-preview-rain",
    title: "雨夜异能徽章预览包",
    kind: "实体周边预览",
    category: "徽章",
    creator: "旧校舍印务",
    price: "12",
    currency: "CNY",
    tags: ["徽章", "表情差分", "轻周边"],
    desc: "用角色关键词生成徽章组说明，先展示设计方向，后续可接库存和下单。",
    includes: ["3 枚表情差分", "代表色建议", "背卡文案"],
    status: "暂未开放购买",
    accent: "#f084bc"
  },
  {
    id: "stand-preview-idol",
    title: "废土偶像立牌方向",
    kind: "实体周边预览",
    category: "立牌",
    creator: "巡演补给站",
    price: "35",
    currency: "CNY",
    tags: ["立牌", "舞台剪影", "底座文案"],
    desc: "围绕角色动作剪影、透明底座和代表色做周边预览说明。",
    includes: ["立牌构图", "底座短句", "包装标签"],
    status: "可加入愿望单",
    accent: "#6283d6"
  }
];

export const creatorServices: CreatorService[] = [
  {
    id: "commission-avatar",
    title: "OC 头像约稿",
    category: "头像",
    creator: "Mika 星图",
    status: "可接单",
    priceRange: "¥80-180",
    turnaround: "5-7 天",
    tags: ["头像", "清透上色", "可商用加价"],
    sample: "半身头像、柔和边缘光、适合社交头像和角色主页。",
    rules: ["需提供角色资产或文字设定", "含 1 次草稿修改", "不接真人转绘"],
    accent: "#54c5b7"
  },
  {
    id: "commission-booth",
    title: "漫展摊宣设计",
    category: "摊宣",
    creator: "浮岛排版所",
    status: "排队中",
    priceRange: "¥120-260",
    turnaround: "7-10 天",
    tags: ["摊宣", "菜单", "小红书封面"],
    sample: "将商品菜单、价格牌和平台文案整理成统一摊宣视觉。",
    rules: ["需提供商品清单", "可追加价格牌", "展前 3 天停止加急"],
    accent: "#f084bc"
  },
  {
    id: "commission-stand",
    title: "周边图案方向",
    category: "周边",
    creator: "霓虹小卡社",
    status: "暂停接单",
    priceRange: "¥160-360",
    turnaround: "待开放",
    tags: ["徽章", "小卡", "立牌"],
    sample: "根据 OC 设定整理表情差分、道具贴纸和小卡背面文案。",
    rules: ["暂不接复杂物流商品", "只做轻量实体周边预览", "恢复接单后开放排期"],
    accent: "#946cf3"
  }
];

export const interactionPrompts: InteractionPrompt[] = [
  {
    id: "first-meeting",
    title: "初次相遇",
    scene: "雨停后的旧街区，角色发现用户带着一件不属于这里的道具。",
    relationship: "陌生但愿意试探",
    sampleLines: ["你拿着那个东西，是想找出口，还是想找借口？", "别站在灯下面，影子会先替你回答。"]
  },
  {
    id: "trust-check",
    title: "信任测试",
    scene: "任务失败后，用户请求角色再相信自己一次。",
    relationship: "熟悉但有裂痕",
    sampleLines: ["我不是不信你，我是不信你每次都把自己放到最后。", "这次计划我来写，你负责活着回来。"]
  },
  {
    id: "booth-day",
    title: "展会当天",
    scene: "摊位开场前十分钟，商品菜单还没摆完。",
    relationship: "搭档协作",
    sampleLines: ["价格牌放左边，别让立牌挡住小卡。", "深呼吸，灯光给你了。"]
  }
];

export const accountOrders: AccountOrder[] = [
  { id: "order-demo-1", title: "星屑角色卡排版模板", status: "演示订单 / 未支付", amount: "¥26" },
  { id: "order-demo-2", title: "雨夜异能徽章预览包", status: "愿望单转入 / 暂未开放购买", amount: "¥12" }
];

export const commissionRecords: CommissionRecord[] = [
  { id: "commission-demo-1", title: "OC 头像约稿咨询", creator: "Mika 星图", status: "mock 请求草稿" },
  { id: "commission-demo-2", title: "漫展摊宣设计排期", creator: "浮岛排版所", status: "排队中演示" }
];
