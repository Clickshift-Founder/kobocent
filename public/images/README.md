# Photography — shot list and specs

The landing page has four photo slots in the "Real people, real money" section.
Until you drop real files in, each slot renders a neutral placeholder — nothing breaks.

## Why this is a manual step

These must be **real, consented photographs of real people**. AI-generated faces in a
financial product read as fake the moment someone looks closely, and using stock photos
of obviously-Western office workers would undercut exactly the positioning we built.

## Files to add

Drop these into `public/images/people/` using these exact names:

| Filename | Shot |
|---|---|
| `paying-bill.jpg` | Someone paying an electricity bill on their phone, at home. Natural light. |
| `market-trader.jpg` | A trader or small business owner checking a payment on their phone at their shop/stall. |
| `receiving.jpg` | Someone reacting to money arriving — a genuine smile at a phone notification. |
| `earning.jpg` | A calmer, quieter shot: someone reviewing savings on a phone or laptop. |

## Specs

- **Aspect ratio:** 4:5 portrait (the slot crops to this)
- **Size:** at least 800×1000px, ideally 1200×1500px
- **Format:** `.jpg`, compressed to under ~250KB each
- **Feel:** warm natural light, real environments, real phones. Avoid studio white
  backgrounds and stock-photo staging — they fight the brand.
- **Consent:** get written permission to use each person's likeness commercially.

## Testimonial photos (optional)

`src/data/testimonials.ts` has an optional `photo` field per person. Add
`/images/people/testimonial-name.jpg` there and it replaces the initial avatar.
Square crop, 200×200px minimum.
