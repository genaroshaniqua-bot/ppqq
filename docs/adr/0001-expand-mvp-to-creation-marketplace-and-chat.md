# Expand MVP to creation, marketplace, commissions, and chat

The project originally constrained the MVP to an AI OC creation tool without marketplace, commission, or chat-companion paths. We decided to change the product positioning so the MVP includes three additional primary lines: 商品买卖, 创作者接单, and 聊天关系, alongside OC creation and 角色资产 workflows. This is a deliberate expansion of scope because the desired product is now a broader anime/OC platform rather than a focused creation-tool prototype.

The homepage should still prioritize AI creation and 角色资产 generation as the first entry point, because marketplace commerce, commissions, and chat relationships all need characters, works, or creator supply as their base.

The marketplace scope is no longer limited to a front-end discovery demo. The intended project should include a complete commerce backend over time: shopping cart, payment, orders, refunds, fulfillment, multi-currency handling, and inventory synchronization.

Delivery remains phased: first expand the front-end information architecture across creation, commerce, commissions, and chat; then add backend models and transaction flows; then integrate real AI, creator operations, review, risk, and admin tooling.

The primary navigation should be organized by user tasks rather than current route files: 创作, 逛商品, 找创作者, 角色互动, and 我的. Pricing moves out of the primary navigation because the broader platform needs room for commerce, commission, chat, and account ownership tasks.

The account model should use one 用户 with multiple 平台身份 rather than separate buyer, creator, and chat accounts. This keeps role assets, purchases, commission requests, services, and interaction sessions connected for people who both create and buy.

Orders and commission records should be modeled separately but can be linked. 商品买卖 creates 订单 because it depends on items, quantities, inventory, fulfillment, and refunds; 创作者接单 creates 委托记录 because it depends on request negotiation, scheduling, drafts, revision, and delivery.

Payment should first ship as a 单币种支付闭环. Multi-currency can be represented in product display and data modeling, but complex exchange rates, tax handling, cross-border settlement, and refund differences should wait until the core order, payment, refund, and fulfillment states are stable.
