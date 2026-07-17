# Design QA — 约稿作品陈列页

## Visual truth

- Reference: `C:/Users/d_jun/AppData/Local/Temp/codex-clipboard-22fa4eb9-3609-46ae-a4f7-05bf68b68d6c.png`
- Implementation: `output/audits/2026-07-17-vgen-reference-commission.png`
- Side-by-side comparison: `output/audits/2026-07-17-vgen-reference-comparison.jpg`
- Reference viewport: 2048 × 1118
- Verification viewport: 1265 × 710 (same wide-screen composition class)
- State: signed-in personal user, `/commissions`, category `全部`

## Comparison findings

### Full-view comparison

- The implementation matches the reference's defining structure: dark merchandise canvas, large editorial heading, dense colored category controls, category lead cards, and horizontally browsable square artwork cards.
- The platform's existing white global navigation is intentionally preserved so the redesigned page remains consistent with the rest of 未名 and does not create a second navigation system.
- Product copy and metadata are adapted to the commission workflow rather than copied from a digital-goods marketplace: real artist works open artist services, while curated inspiration clearly starts a similar request.

### Focused component comparison

- Category controls use solid high-contrast colors and an explicit selected ring; their shape, density, and horizontal overflow behavior follow the reference.
- Artwork cards use square crops, top-left status labels, top-right bookmark affordances, compact creator/title metadata, and direct action-oriented footers.
- Category rows use a colored lead card plus a compact scroll rail. Card widths were reduced from 245 px to 210 px and the lead card from 190 px to 170 px after comparison to improve information density.

## Interaction and responsive QA

- Category filter: `海报` selection leaves only the `海报` section in the accessibility tree.
- Primary CTAs: `发起约稿` routes to `/create`; `我的约稿` routes to `/profile/commissions`.
- Artwork behavior: real works route to the artist profile; curated examples route to `/create?service=<category>`.
- Paid preview behavior remains visually locked and displays its point cost.
- Mobile 390 × 844: heading, CTAs, category pills, category lead card, artwork rail, and bottom navigation remain usable; horizontal rails hide native scrollbars while retaining touch scrolling.
- Browser console: no error-level entries during the verified flow.

## Iteration history

1. Rebuilt the page around the reference's category-led shop hierarchy.
2. Replaced generic lists with horizontal artwork rails backed by real portfolio data and clearly labeled curated inspiration.
3. Tightened card and lead-card widths after side-by-side comparison.
4. Removed visible native rail scrollbars after mobile inspection.

## Final result

passed
