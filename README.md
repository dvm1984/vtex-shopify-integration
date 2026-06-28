# VTEX ↔ Shopify ↔ 3PL Integration

A complete VTEX IO app that connects a VTEX seller account to a Shopify
store. At its core it's a two-way catalog sync engine — products, SKUs,
specifications, reference codes, pricing, and inventory all flow from
Shopify into VTEX, creating SKUs on the VTEX seller account if they don't
already exist and keeping them current as Shopify changes. On top of that,
it handles the order side: VTEX order → Shopify order → third-party
logistics (3PL) fulfillment routing, with tracking and invoicing flowing
back into VTEX once the 3PL ships. Includes a VTEX admin screen for
connecting a store, monitoring sync status, and managing webhooks.

Built and battle-tested against a real multi-tenant marketplace +
standard-seller setup. Full writeup of the debugging journey, the platform
gotchas that had to be worked around, and a setup checklist for new
accounts: see [`TECHNICAL-DOCUMENT.md`](./TECHNICAL-DOCUMENT.md).

## What it does

- **Catalog sync (Shopify → VTEX)**: products tagged for sync via the
  `transfertosell` Shopify metafield are created on the VTEX seller account
  if they don't already exist — price, inventory, images, and variants all
  transfer across — and kept up to date afterward. Full SKU specifications
  and reference codes (`RefId`) sync too. SKUs deleted in Shopify are
  deactivated in VTEX rather than left orphaned.
- **Independent pricing per channel**: the `custompriceinstore` metafield
  lets a product carry different prices in Shopify and VTEX without one
  overwriting the other — e.g. retail price on the Shopify storefront,
  wholesale price on VTEX for the same SKU.
- **Order sync (VTEX → Shopify → 3PL)**: VTEX orders reaching
  `ready-for-handling` are created as Shopify orders, assigned to the 3PL's
  fulfillment location, and a fulfillment request is sent to the 3PL
  automatically — without the order ever showing as prematurely fulfilled.
- **Tracking sync (3PL → Shopify → VTEX)**: when the 3PL ships and adds
  tracking in Shopify, this app receives the fulfillment webhook and
  creates/updates the corresponding VTEX invoice with courier, tracking
  number, and tracking URL.
- **Admin UI**: a "Shopify ERP Connector" screen in the VTEX admin to enter
  store credentials, register webhooks and kick off the initial product
  import, see connected stores, review product/SKU sync errors, and
  manually restart a stalled bulk import.

## What this solves

If you're running VTEX as a marketplace with standard sellers whose catalog
and fulfillment live in Shopify, you'll likely hit some combination of:

- Manually copying products, SKUs, prices, and inventory levels between
  Shopify and VTEX, with no reference-code mapping between the two systems
- Needing to sell the same product at different prices on each channel
  without one sync overwriting the other
- Orders landing in Shopify as `fulfilled` before they've actually shipped
- Your 3PL app never seeing the order on its own dashboard
- Tracking added by the 3PL never making it back into VTEX
- A 401 when trying to invoice an order from a standard (non-white-label)
  VTEX seller account

This repo is the working fix for all of these, plus the underlying
VTEX/Shopify platform gotchas that caused them — detailed in the technical
document.

## Repository structure
node/                    — VTEX IO backend service

clients/               — VTEX & Shopify API clients (app-key and MasterData auth)

middlewares/            — generic Shopify GET/POST/DELETE helpers, MasterData query helper

routes/                 — webhook handlers: order sync, product create/update/delete, cron, health-check

api/                  — product/SKU create & update logic: catalog, specs, pricing, inventory, images

resolvers/              — GraphQL queries/mutations backing the admin UI

events/                 — app-installed / settings-changed handlers

tracking-info/          — Shopify fulfillment webhook handler, VTEX invoice creation & tracking update

constants/              — shared config (Shopify API version, MasterData entity names, etc.)

react/                   — admin UI (the "Shopify ERP Connector" screen)

components/admin/       — connect-store form, store list, error tables, webhook/restart buttons

graphql/                — client-side GraphQL queries/mutations

admin/                   — registers the admin route + sidebar navigation entry

graphql/                 — server-side GraphQL schema consumed by the admin UI

messages/                — i18n strings

docs/                    — VTEX App Store–style README

## Key things to know before you deploy this

1. **Shopify's product/variant ID becomes the VTEX `RefId`.** This is the
   foreign key tying the two systems together — every SKU, price, and
   inventory write in VTEX is matched back to Shopify via this reference
   code, not by name.
2. **`refId` must be parsed to an integer** when building the Shopify
   order's `variant_id` — VTEX serializes it as a string, Shopify requires
   an integer.
3. **The `transfertosell` metafield gates catalog sync** — a product only
   transfers into VTEX once this is set to `true` on the Shopify side.
4. **The `custompriceinstore` metafield decouples pricing** — set it on a
   product to stop the sync from overwriting that product's VTEX price
   with its Shopify price, so the two channels can carry different prices
   for the same item.
5. **Turn off "Automatically fulfill the order's line items"** in your
   Shopify store settings. This integration uses the fulfillment-request
   model, not auto-fulfill interception — see the technical document for
   why this matters for 3PL apps installed after Shopify's January 2026
   fulfillment API changes.
6. **`move.json` does not mutate a fulfillment order in place** — it
   returns a *new* fulfillment order (`moved_fulfillment_order`) and
   cancels the original. Use the new ID for anything downstream.
7. **Standard (non-white-label) VTEX sellers can't invoice their own
   orders** via their own API key/token. The working fix is generating a
   key on the seller account and registering it as an *external* API key
   on the marketplace account.
8. **Fulfillment webhooks (`fulfillments/create`/`update`) are not part of
   the automatic webhook registration** (`registerWebhooks` /
   `syncProducts`) — register them manually per store.

Full detail, including the dead ends investigated and why they didn't work,
is in [`tracking feature technical patch.md`]

## Setup

See [`docs/README.md`](./docs/README.md) for the VTEX admin configuration
steps, and `TECHNICAL-DOCUMENT.md` §6 for the full new-account setup
checklist (MasterData schema, Shopify store settings, manual webhook
registration, cross-account invoicing key).

## License

[PolyForm Noncommercial 1.0.0](./LICENSE) — free to use, study, modify, and
share for any noncommercial purpose (personal projects, research, education,
nonprofits, government use). Commercial use requires a separate license from
the author. No warranty; this was built against one specific
marketplace/seller/3PL combination and your mileage with a different 3PL app
may vary, particularly around the fulfillment-request model (see the
technical document's section on legacy vs. current 3PL integration modes).