# VTEX-Shopify-3PL Order & Fulfillment Bridge

This app connects a VTEX seller account to a Shopify store and a third-party
logistics (3PL) fulfillment app installed on that store. It pushes VTEX orders
into Shopify, routes them into the 3PL via Shopify's fulfillment orders API,
and syncs tracking and invoicing back into VTEX once the 3PL ships — alongside
two-way product/SKU sync between VTEX and Shopify.

## What it does

- **Product sync**: Shopify products tagged for sync (via a configurable
  metafield) are created and kept up to date as VTEX products and SKUs,
  including images, specifications, price, and inventory.
- **Order sync**: VTEX orders reaching `ready-for-handling` are created as
  Shopify orders, assigned to the 3PL's fulfillment location, and a
  fulfillment request is sent to the 3PL automatically.
- **Tracking sync**: when the 3PL ships and adds tracking in Shopify, this
  app receives the fulfillment webhook and creates/updates the corresponding
  VTEX invoice with courier, tracking number, and tracking URL.
- **Admin screen**: a "Shopify ERP Connector" page in the VTEX admin to
  connect a store, monitor connection status, see product/SKU sync errors,
  and manually re-register webhooks or restart a bulk import if needed.

Full technical detail on how this was built, the platform quirks that had to
be worked around, and a setup checklist for new accounts is in
[`TECHNICAL-DOCUMENT.md`](../TECHNICAL-DOCUMENT.md) at the repo root.

![Media Placeholder](https://user-images.githubusercontent.com/52087100/71204177-42ca4f80-227e-11ea-89e6-e92e65370c69.png)

## Configuration

1. Install the app on the VTEX seller account.
2. Open the **Shopify ERP Connector** screen in the VTEX admin
   (`/admin/app/shopify-connector`).
3. Fill in the app settings (`Shopify Store Name`, `Shopify Store URL`,
   `Shopify Admin API access token`, and optionally `Shopify Location ID` if
   inventory should be read from a specific Shopify location).
4. Click **Register Webhooks & Sync Products** to register the required
   Shopify webhooks and start the initial product import.
5. If using a 3PL fulfillment app for order fulfillment, see the setup
   checklist in `TECHNICAL-DOCUMENT.md` §6 — in particular, the
   `fulfillments/create` and `fulfillments/update` Shopify webhooks must be
   registered **manually**; they are not part of the automatic registration
   step above.

This app has no exported theme blocks — it is a backend integration with one
admin-only screen, not a storefront component.

## Modus Operandi

- Product sync direction is Shopify → VTEX only. A product only syncs once a
  configurable Shopify metafield (see `createProduct.ts` /
  `getProductUpdates.ts`) is set to `true` on that product.
- Order sync direction is VTEX → Shopify → 3PL. VTEX does not pull order
  status back proactively; tracking/invoicing flows back into VTEX only when
  Shopify fires a fulfillment webhook.
- This app assumes the Shopify store has **"Automatically fulfill the
  order's line items"** turned off in checkout settings. See
  `TECHNICAL-DOCUMENT.md` §2.2 and §2.4 for why, and what breaks if it's on.
- Standard (non-white-label) VTEX sellers cannot invoice their own orders
  using their own API key/token alone — see `TECHNICAL-DOCUMENT.md` §3 for
  the cross-account API key setup this depends on.

## Customization

In order to apply CSS customizations to the admin screen, edit
`react/styles.global.css` or `react/styles/adminStyles.css` directly — this
app does not use VTEX CSS Handles, as it has no storefront-facing blocks.

No CSS Handles are available yet for the app customization.

## Repository structure

| Path | Purpose |
|---|---|
| `node/` | VTEX IO backend — order/fulfillment sync, product/SKU sync, VTEX & Shopify API clients |
| `react/` | Admin UI (the "Shopify ERP Connector" screen) |
| `admin/` | Admin route + navigation registration |
| `graphql/` | Server-side GraphQL schema consumed by the admin UI |
| `messages/` | i18n strings |
| `docs/` | This file |

See the top-level `README.md` for what's included vs. what may still need to
be filled in if you're forking this for your own VTEX/Shopify/3PL setup.
