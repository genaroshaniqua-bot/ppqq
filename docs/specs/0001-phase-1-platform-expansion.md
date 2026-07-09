# Phase 1 Platform Expansion Spec

## Problem Statement

The current product started as an AI 二次元 / OC creation prototype focused on 角色资产 generation, 角色卡 presentation, 角色资产库 management, 摊宣工具, and front-end mock generation flows. The product direction has expanded: it now needs to become an AI-first 二次元 / OC 综合平台 that still starts from 创作, but also supports 逛商品, 找创作者, 角色互动, 我的, and a standalone 登录界面.

The user needs a clear implementation-ready specification that preserves the existing OC creation workflow while expanding the product surface without prematurely building backend commerce, real authentication, real payment, or real AI integration.

## Solution

Deliver a Phase 1 front-end expansion of the existing Next.js app. The platform should keep AI creation and 角色资产 generation as the first entry point, then add realistic front-end demo surfaces for 商品买卖, 创作者接单, 角色互动, account aggregation, and a standalone 登录界面.

The experience should use project vocabulary consistently:

- 角色资产 is the core saved creative object.
- 角色卡 is a presentation format for a 角色资产.
- 继续创作 extends a 角色资产 into story, dialogue, avatar, booth, and merch outputs.
- 逛商品 covers 数字商品 and 实体周边预览 discovery.
- 找创作者 centers 创作者服务 first, with 创作者主页 as the trust/detail surface.
- 角色互动 starts from the user's own 角色资产 and creates 互动会话.
- 我的 aggregates 角色资产, 收藏, 愿望单, 订单, 委托记录, 点数消耗, and 会员权益.
- 登录界面 is standalone and uses a 6-8 second seamless looping 动态背景视频 as the primary visual.

## User Stories

1. As a new visitor, I want the homepage to show AI creation first, so that I immediately understand the platform starts with creating 角色资产.
2. As a new visitor, I want the homepage to also expose 逛商品, 找创作者, and 角色互动, so that I understand this is a broader 二次元 / OC platform.
3. As a mobile visitor, I want bottom navigation for the primary areas, so that I can move between 创作, 逛商品, 找创作者, 角色互动, and 我的 easily.
4. As a desktop visitor, I want a sticky top navigation organized by user tasks, so that I can understand the product areas without decoding route names.
5. As an OC creator, I want the existing 创作工作台 to remain available, so that the current OC generation path is not lost.
6. As an OC creator, I want to enter an inspiration prompt, style, role type, world, and extra notes, so that I can generate a useful 角色资产.
7. As an OC creator, I want loading, empty, error, and result states in 创作, so that the generation flow feels demonstrable and complete.
8. As an OC creator, I want generated results to include name, gender, age stage, identity, appearance, personality, background, ability, weakness, speech style, and summary, so that the 角色资产 is usable for later creation.
9. As an OC creator, I want to copy a generated 角色卡, so that I can reuse it outside the app.
10. As an OC creator, I want to save a generated 角色资产 as a 本地演示资产, so that I can see it in the 角色资产库.
11. As an OC creator, I want to browse saved 角色资产, so that I can manage long-running OC material.
12. As an OC creator, I want to search and filter 角色资产, so that I can find a specific OC quickly.
13. As an OC creator, I want to edit basic 角色资产 information, so that I can correct or refine generated content.
14. As an OC creator, I want to delete a 角色资产 with confirmation, so that accidental removal is less likely.
15. As an OC creator, I want to open a 角色资产 detail view, so that I can continue creating around a single OC.
16. As an OC creator, I want to generate story fragments from a 角色资产, so that I can continue writing.
17. As an OC creator, I want to generate dialogue style from a 角色资产, so that I can test voice and 口癖.
18. As an OC creator, I want to generate avatar prompts from a 角色资产, so that I can prepare image generation direction.
19. As an OC creator, I want to generate merch directions from a 角色资产, so that I can imagine badges, stands, stickers, and cards.
20. As a Coser or booth owner, I want the 摊宣工具 to remain available, so that I can generate platform-specific booth copy.
21. As a booth owner, I want to input event, booth, product, platform, and tone information, so that the 摊宣工具 can produce relevant copy.
22. As a booth owner, I want outputs for 小红书, 微博, QQ 群, and B 站动态, so that I can adapt copy to each platform.
23. As a booth owner, I want generated booth output to include headline, copy, tags, menu, and price card text, so that I can reuse it for promotion.
24. As a buyer, I want a 逛商品 area, so that I can browse creator-made or character-related goods.
25. As a buyer, I want 商品买卖 surfaces to separate 数字商品 and 实体周边预览, so that I can understand delivery expectations.
26. As a buyer, I want to filter 商品买卖 items by category and type, so that I can narrow browsing.
27. As a buyer, I want product cards to show title, cover, creator, price, currency, tags, and status, so that I can scan options quickly.
28. As a buyer, I want to open a product detail surface, so that I can inspect the item before saving or adding it to a cart-like demo state.
29. As a buyer, I want to save products to a 愿望单, so that I can revisit them later.
30. As a buyer, I want a front-end 购物车 demo state, so that the future checkout direction is visible without real payment.
31. As a buyer, I want purchase CTAs to clearly indicate mock or unavailable state, so that I am not misled into thinking real checkout exists.
32. As a creator service buyer, I want a 找创作者 area, so that I can discover 创作者服务.
33. As a creator service buyer, I want 创作者服务 cards before creator profile browsing, so that I can start from the job I need done.
34. As a creator service buyer, I want service cards to show service type, sample work, price range, availability, creator, and request entry, so that I can compare services.
35. As a creator service buyer, I want availability states such as available, queued, and paused, so that I can judge whether to request a service.
36. As a creator service buyer, I want to open a 创作者主页, so that I can review portfolio, schedule, rules, and trust signals.
37. As a creator service buyer, I want a mock 委托记录 request CTA, so that the future request flow is visible without real backend negotiation.
38. As a creator, I want my services to be represented separately from 商品买卖 items, so that commission work is not confused with static products.
39. As a creator, I want 创作者主页 to be a trust surface, so that buyers can understand my style and rules.
40. As a user with saved 角色资产, I want a 角色互动 area, so that I can start 互动会话 from my own OC.
41. As a user with saved 角色资产, I want to choose a character for interaction, so that the chat-oriented experience stays tied to my creative assets.
42. As a user with saved 角色资产, I want to input scene or relationship prompts, so that the 互动会话 can test dialogue style in context.
43. As a user with saved 角色资产, I want sample dialogue output, so that I can evaluate speech style without the product becoming a generic chatbot.
44. As a user with saved 角色资产, I want copy and save demo actions for dialogue output, so that useful text can be reused.
45. As a platform user, I want 我的 to aggregate 角色资产, 收藏, 愿望单, 订单, 委托记录, 点数消耗, and 会员权益, so that my platform state is visible in one area.
46. As a platform user, I want orders shown as front-end demo records, so that future commerce state is represented without real transactions.
47. As a platform user, I want 委托记录 shown separately from 订单, so that service requests are not confused with product purchases.
48. As a platform user, I want 点数消耗 and 会员权益 shown as static/demo information, so that the future commercial model is understandable.
49. As a returning user, I want a standalone 登录界面, so that account access feels like a first-class flow.
50. As a returning user, I want the 登录界面 to support login/register demo entry states, so that the future authentication path is visible.
51. As a returning user, I want the 登录界面 to provide a clear way back to the main product, so that I am not trapped in account access.
52. As a visual user, I want the 登录界面 to have a 6-8 second seamless looping 动态背景视频, so that the first impression feels like a polished anime/OC platform.
53. As a motion-sensitive user, I want the 登录界面 to provide a static poster/fallback, so that reduced-motion or unsupported playback still works.
54. As a mobile user, I want the 登录界面 form and video composition to remain readable, so that account entry works on small screens.
55. As a user, I want the video not to contain required text, so that I can understand the form even if the video is hidden or paused.
56. As a visitor, I want pricing to remain accessible outside the primary navigation, so that the primary nav can focus on product areas.
57. As a future backend implementer, I want Phase 1 commerce surfaces to model cart, order, refund, fulfillment, multi-currency, and inventory concepts carefully, so that later backend work has a clear product direction.
58. As a future backend implementer, I want 订单 and 委托记录 to remain separate but linkable, so that product purchases and commission workflows can evolve independently.
59. As a future backend implementer, I want one 用户 to support multiple 平台身份, so that creators can also buy, create, and interact without separate accounts.
60. As a future backend implementer, I want payment to start later as a 单币种支付闭环, so that checkout, payment, refund, order, and fulfillment states stabilize before multi-currency complexity.

## Implementation Decisions

- Preserve the current creation workflow and do not rewrite the existing app from scratch.
- Keep AI creation and 角色资产 generation as the first homepage entry point.
- Organize primary navigation around user tasks: 创作, 逛商品, 找创作者, 角色互动, 我的.
- Move pricing out of primary navigation and keep it accessible through secondary navigation, 我的, or footer.
- Use English product routes for engineering stability and shareable URLs while keeping user-facing copy in Chinese.
- Add `/market` for 逛商品.
- Add `/commissions` for 找创作者.
- Add `/chat` for 角色互动.
- Add `/login` for the standalone 登录界面.
- Keep existing creation routes unchanged.
- Keep first-phase implementation front-end focused with mock data, local state, or localStorage.
- Do not implement real authentication in Phase 1.
- Do not implement real payment, refunds, fulfillment, inventory sync, creator payout, or multi-currency settlement in Phase 1.
- Add mock data centrally rather than scattering hardcoded arrays across page components.
- Prefer existing component patterns for buttons, rails, character cards, section headings, toast feedback, and localStorage-backed demo behavior.
- Add product domain types and mock data for 数字商品 and 实体周边预览.
- Add creator service domain types and mock data for 创作者服务 and 创作者主页.
- Add interaction domain types and mock data for 互动会话 output.
- Add account summary mock data for 我的, including 角色资产, 收藏, 愿望单, 订单, 委托记录, 点数消耗, and 会员权益.
- Model 商品买卖 and 创作者接单 separately in the front-end domain, even if their cards visually share patterns.
- Model 订单 and 委托记录 separately, with later linkage through 委托付款 if needed.
- Represent cart-like state only as a demo state in Phase 1.
- Use clear labels for unavailable or mock purchase/request actions so users are not misled.
- Start 角色互动 from the user's own 角色资产, not from a pool of preset companion characters.
- Keep 角色互动 focused on speech style, relationship dynamics, and scene dialogue rather than generic companion chat.
- Design the 登录界面 as a standalone page, not a modal or small navigation form.
- Make the 登录界面's main visual a 6-8 second seamless looping 动态背景视频.
- Provide a static poster/fallback image for 登录界面 video loading, reduced motion, and unsupported video playback.
- Do not rely on text inside the 动态背景视频 for core meaning.
- Ensure the 动态背景视频 is calm enough to preserve form readability.
- Keep the visual language close to anime/OC creation, luminous creative assets, and platform polish rather than generic SaaS stock footage.
- Maintain responsive layouts for all new pages.
- Use existing VGen-inspired discovery rails, cards, chips, tabs, pill controls, and high-scan information hierarchy, without copying VGen branding, assets, copy, or exact transaction mechanics.

## Testing Decisions

- Test the highest practical seam: user-visible route flows in the running app.
- Avoid testing implementation details such as internal component state shape when external behavior is what matters.
- The primary seam should cover navigation from homepage into 创作, 逛商品, 找创作者, 角色互动, 我的, and 登录界面.
- Existing creation behavior should be regression-tested by completing the current path: generate a 角色资产, copy it, save it, see it in the 角色资产库, open detail, and trigger 继续创作.
- 逛商品 should be tested through visible cards, filters, product detail display, 愿望单 toggles, and front-end cart-like state.
- 找创作者 should be tested through service cards, availability filtering or states, creator profile entry, and mock request CTA.
- 角色互动 should be tested through selecting a 角色资产, entering a scene/relationship prompt, generating sample dialogue, and copy/save demo actions.
- 我的 should be tested as an aggregation surface that visibly separates 角色资产, 愿望单, 订单, 委托记录, 点数消耗, and 会员权益.
- 登录界面 should be tested for form visibility, mock submit state, route back to product, video fallback, and mobile readability.
- The 动态背景视频 should be manually verified for seamless looping, 6-8 second duration, no required embedded text, and readability behind the form.
- Desktop and mobile layouts should both be verified.
- Run the existing project checks appropriate for front-end changes, at minimum lint and typecheck.
- After implementation, start the local dev server and manually inspect the main pages in a browser.

## Out of Scope

- Real authentication.
- Real database-backed accounts.
- Real AI generation API.
- Real payment.
- Real refunds.
- Real order fulfillment.
- Real inventory synchronization.
- Real multi-currency settlement.
- Real creator payout.
- Real private messages or notification systems.
- Real chat persistence beyond front-end demonstration.
- Backend schemas, API routes, and provider integration for commerce.
- Replacing the existing OC creation workflow.
- Copying VGen branding, copy, imagery, exact marketplace structure, or concrete transaction mechanics.

## Further Notes

- This spec follows ADR 0001: the MVP expands to creation, marketplace, commissions, and chat while still prioritizing AI creation and 角色资产 generation first.
- The delivery remains phased: Phase 1 expands front-end information architecture; later phases add backend transaction flows; later still integrate real AI, creator operations, review, risk, and admin tooling.
- The repo now has GitHub Issues configured as the issue tracker for engineering skills and uses `ready-for-agent` as the AFK-ready triage label.
