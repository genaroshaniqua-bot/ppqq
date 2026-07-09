# Phase 1 Front-End Expansion Plan

## Goal

Expand the current AI OC creation prototype into the first visible version of a broader anime/OC platform while preserving the existing creation workflow.

The first phase remains front-end focused. It should demonstrate creation, marketplace browsing, creator commissions, character interaction, and account aggregation without implementing real backend transactions yet.

## Confirmed Product Shape

- Keep AI creation and 角色资产 generation as the first homepage entry point.
- Keep the existing `/create`, `/characters`, `/characters/[id]`, `/booth`, `/pricing`, and `/profile` flows.
- Add platform areas for 逛商品, 找创作者, and 角色互动.
- Add a standalone 登录界面 with a high-impact animated visual treatment.
- Organize primary navigation around user tasks: 创作, 逛商品, 找创作者, 角色互动, 我的.
- Move pricing out of the primary navigation.

## Page Scope

## Route Naming

Use English product routes for engineering stability and shareable URLs, while keeping user-facing page copy in Chinese:

- `/market`: 逛商品.
- `/commissions`: 找创作者.
- `/chat`: 角色互动.
- `/login`: 登录界面.
- `/profile`: 我的.
- Existing routes stay unchanged: `/create`, `/characters`, `/characters/[id]`, `/booth`, `/pricing`.

### 创作

Existing pages remain the base:

- `/create`: OC creation workspace.
- `/characters`: character asset library.
- `/characters/[id]`: character detail and continuation tools.
- `/booth`: booth copy and merch copy tool.

### 逛商品

Add a marketplace-style browsing area for:

- 数字商品: avatar templates, character card templates, story templates, booth templates, PSD or asset packs.
- 实体周边预览: badges, acrylic stands, cards, stickers, postcards.

Phase 1 front-end states should include:

- Product cards.
- Category and type filters.
- Price and currency display.
- Creator attribution.
- Wishlist state.
- Cart-like front-end state where useful for demos.
- Product detail surface.

### 找创作者

Add a commission discovery area centered on 创作者服务 cards first, with creator profile details as secondary.

Phase 1 front-end states should include:

- Service cards.
- Service categories.
- Price range.
- Availability status.
- Sample work preview.
- Creator profile entry.
- Request/commission CTA in a non-transactional demo state.

### 角色互动

Add a chat-oriented area started from the user's own 角色资产, not from a platform pool of preset companion characters.

Phase 1 front-end states should include:

- Character selection.
- Interaction session preview.
- Scene or relationship prompt.
- Sample dialogue generation.
- Save/copy demo actions.

### 我的

Expand the account area into a platform hub for:

- 角色资产.
- 收藏 / 愿望单.
- 订单.
- 委托记录.
- 点数与会员状态.

### 登录界面

Add a standalone login page rather than a modal or small navigation form.

Phase 1 front-end states should include:

- Account access form surface for login/register demo entry.
- Clear entry back to the main product.
- Mock-only submit behavior until real authentication is implemented.
- Mobile and desktop layouts.

Primary visual requirement:

- The main visual should be a 6-8 second seamless looping dynamic background video.
- The video should feel like an anime/OC creation platform: creative, luminous, character-asset oriented, and not like generic SaaS stock footage.
- The loop should be calm enough to sit behind form UI without harming readability.
- Provide a static poster/fallback image for loading, reduced motion, or unsupported video playback.
- Do not rely on text inside the video for core meaning.

## Explicit Non-Goals For Phase 1

The complete project may later include backend commerce, but Phase 1 should not implement:

- Real authentication.
- Real payment.
- Real refunds.
- Real order fulfillment.
- Real inventory synchronization.
- Real multi-currency settlement.
- Real creator payout.
- Real chat persistence beyond front-end demonstration.

## Verification Criteria

- Users can still complete the current OC creation path.
- Users can navigate from the homepage into creation, marketplace, commissions, interaction, and account areas.
- Users can open the standalone login page and understand it is a mock front-end account entry.
- New pages have realistic cards, filters, empty/loading/demo states, and mobile layouts.
- The login page design specifies a 6-8 second seamless looping background video with fallback behavior.
- New commerce and commission surfaces do not imply real checkout or paid fulfillment is currently active.
