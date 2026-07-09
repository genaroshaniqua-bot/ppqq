# AI OC Studio

This context defines the product language for an AI-powered anime/OC creation platform. It keeps domain terms precise as the product combines creation tooling, marketplace-style commerce, creator commissions, and role-based interaction.

## Language

**角色资产**:
The core creative object saved and extended by the user, containing an OC's identity, appearance, personality, background, speech style, and future creation material.
_Avoid_: 角色卡, 商品, 聊天对象

**角色卡**:
A shareable or browsable presentation of a 角色资产, optimized for scanning, screenshots, and social display.
_Avoid_: 角色资产, 档案

**继续创作**:
The primary follow-up behavior after generating a 角色资产, where the user extends it into story fragments, dialogue style, avatar prompts, booth copy, or merch directions.
_Avoid_: 单次生成, 仅分享

**创作延伸能力**:
A tool capability that expands a 角色资产 into adjacent creative outputs such as booth promotion, product menus, price cards, avatar prompts, and merch directions.
_Avoid_: 独立业务线, 通用营销工具

**摊宣工具**:
A 创作延伸能力 for Coser, booth owners, circles, and creators to turn event and product information into platform-specific booth copy, menus, and price card text.
_Avoid_: 广告投放工具, 店铺后台, 订单系统

**创作发现页**:
The homepage experience where users search ideas, browse example 角色卡, discover templates, and enter creation flows.
_Avoid_: 营销落地页, 后台控制台, 商品列表首页

**创作工作台**:
The focused workspace where users input inspiration, choose style and role type, generate a 角色资产, and trigger 继续创作.
_Avoid_: 首页, 聊天页

**创作**:
The primary platform area for OC generation, 角色资产 management, and 继续创作.
_Avoid_: 单一生成页

**轻量角色互动**:
A limited way to preview a 角色资产's speech style through catchphrases, sample dialogue, and scene snippets.
_Avoid_: 陪聊, AI 恋人, 持续聊天消费

**商品买卖**:
A marketplace-style product line where creator-made or character-related goods can be browsed, listed, and eventually purchased.
_Avoid_: 摊宣工具, 纯展示模板

**逛商品**:
The buyer-facing platform area for browsing, filtering, saving, and eventually purchasing creator-made or character-related goods.
_Avoid_: 角色库, 摊宣工具

**数字商品**:
A 商品买卖 item delivered as a file, template, prompt pack, design asset, or reusable creative resource.
_Avoid_: 实物周边, 创作者服务

**实体周边预览**:
A 商品买卖 item concept for lightweight OC-related goods such as badges, acrylic stands, cards, stickers, and postcards.
_Avoid_: 复杂物流商品, 大件商品

**购物车**:
A buyer-side collection of 商品买卖 items intended for checkout, including quantities, selected variants, currency, and availability state.
_Avoid_: 愿望单, 收藏

**订单**:
A commercial record created after checkout that tracks purchased items, buyer obligations, seller obligations, payment state, refund state, and fulfillment state.
_Avoid_: 角色资产, 生成记录

**履约**:
The post-payment process for preparing, shipping, delivering, or otherwise completing a purchased item or creator service.
_Avoid_: 生成, 保存

**库存同步**:
The process of keeping sellable quantities and item availability accurate across product listings, cart, checkout, and orders.
_Avoid_: 静态库存展示

**创作者接单**:
A marketplace-style service line where creators present commission offerings and receive creation requests from users.
_Avoid_: 角色资产库, 普通用户保存

**找创作者**:
The buyer-facing platform area for discovering creators, reviewing commission offerings, and starting creator service requests.
_Avoid_: 商品详情, 普通搜索

**创作者服务**:
A commission offering presented as a buyer-facing service card, including service type, sample work, price range, availability, and request entry.
_Avoid_: 商品, 角色资产

**创作者主页**:
A trust and detail surface for a creator, including portfolio, service listings, schedule, commission rules, and reputation signals.
_Avoid_: 服务卡片, 普通用户资料

**聊天关系**:
A role-based interaction line where users can converse with or test a 角色资产 through a persistent relationship-oriented experience.
_Avoid_: 仅示例台词, 单次对话预览

**角色互动**:
The platform area for chat-oriented experiences built around 角色资产 and their dialogue style.
_Avoid_: 创作工作台, 商品买卖

**互动会话**:
A chat-oriented session started from the user's own 角色资产 to test speech style, relationship dynamics, and scene dialogue.
_Avoid_: 预置陪聊角色, 通用聊天机器人

**本地演示资产**:
A prototype-stage saved 角色资产 stored locally for demonstrating library, detail, edit, delete, and 继续创作 flows.
_Avoid_: 账户资产, 云端资产, 永久保存

**点数消耗**:
A future commercial model where generation or export actions spend credits according to creative output type.
_Avoid_: 真实扣费, 支付记录

**单币种支付闭环**:
The first payment implementation scope where checkout, payment state, refund state, order state, and fulfillment state operate in one platform currency.
_Avoid_: 跨境结算, 实时汇率

**会员权益**:
A future commercial model that packages recurring benefits such as more saved assets, higher generation limits, or export options.
_Avoid_: 当前真实订阅, 支付状态

**单次项目**:
A future commercial model for one-off paid creative outputs or services such as avatar prompt packs, booth template bundles, or merch preview packages.
_Avoid_: 订单系统, 购物车

**我的**:
The account-centered platform area that aggregates 角色资产, 收藏, 愿望单, 订单, 委托记录, 点数消耗, and 会员权益.
_Avoid_: 单纯个人资料, 设置页

**登录界面**:
A standalone entry surface for account access, visually separated from the main product workspace and marketplace flows.
_Avoid_: 弹窗登录, 导航内小表单

**动态背景视频**:
A short seamless looping visual asset used as the 登录界面's primary atmosphere and first visual impression.
_Avoid_: 静态背景图, 长视频, 普通装饰动效

**愿望单**:
A buyer-side saved list of 商品买卖 items for later consideration, separate from checkout intent.
_Avoid_: 购物车, 收藏角色

**委托记录**:
A buyer or creator record of 创作者接单 requests, including request state, communication state, and delivery state.
_Avoid_: 订单, 生成记录

**委托付款**:
A payment relationship linked from a 委托记录 when a creator service request requires paid confirmation or staged payment.
_Avoid_: 商品订单, 普通订单

**用户**:
A single platform account that may create 角色资产, buy 商品买卖 items, request 创作者服务, offer 创作者服务, and start 互动会话.
_Avoid_: 买家账号, 创作者账号, 聊天账号

**平台身份**:
A role held by a 用户 within a specific product area, such as 创作用户, 买家, or 创作者.
_Avoid_: 独立账号
