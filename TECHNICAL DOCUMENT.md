markdown# VTEX ↔ Shopify ↔ 3PL Order & Tracking Integration
## Technical Journey, Architecture, and Setup Guide

**System:** `vtex-shopify-integration` (VTEX IO app)
**Accounts in scope:** VTEX Marketplace (marketplace), VTEX Seller (seller), Shopify seller store, Express Fulfillment (3PL)
**Status:** Forward flow (VTEX → Shopify → 3PL) and return flow (3PL → Shopify → VTEX invoice/tracking) both confirmed working end-to-end.

---

## 1: The Problem

Seller is a standard VTEX seller (`sellerType: 1`) operating under the VTEX marketplace. Its product catalog and fulfillment are integrated with Shopify, and physical fulfillment is handled by a third-party logistics provider, Express Fulfillment, installed as a Shopify app.

Two separate but related problems were investigated and resolved in this body of work:

1. **Orders pushed from VTEX into Shopify were arriving fulfilled before any picking or shipping had occurred**, making them invisible to Express Fulfillment's queue.
2. **Tracking numbers added by Express Fulfillment in Shopify were not flowing back into VTEX**, leaving orders stuck un-invoiced despite being physically shipped.

Both problems turned out to have multiple independent causes layered on top of each other. This document traces the investigation in the order it happened, then ends with a generalized setup procedure for replicating this on other seller accounts.

---

## 2: Forward Flow — VTEX Order to Express Fulfillment Dashboard

### 2.1 Issue: `variant_id` sent as a string

VTEX sets `refId` (the field used to store the corresponding Shopify variant ID) as a string. Shopify's Orders API requires `line_items[].variant_id` as an integer. When passed as a string, Shopify could not resolve the variant, leaving the line item with no inventory link. With no fulfillable items, Shopify closed the order as fulfilled immediately on creation — visible as a `service: "manual"` fulfillment record at the default Shop location, timestamped 1-2 seconds after order creation.

**Fix:**
```typescript
variant_id: parseInt(value.orderDetail.refId, 10),
```

### 2.2 Issue: Shopify store setting auto-fulfilling orders

Independently of the payload, the Seller Shopify store had **Settings → Checkout → Order processing → "Automatically fulfill the order's line items"** enabled. This setting fulfills any order at creation time regardless of payload, and reproduced the same symptom even after the `parseInt` fix was deployed.

**Fix:** Setting disabled.

This setting was originally on because Express Fulfillment's *pre-January-2026* integration pattern depended on it (see §2.4 for why this no longer applies).

### 2.3 Issue: Fulfillment order assigned to Shop location, not Express Fulfillment

`inventory_behaviour: "bypass"` (used to prevent Shopify from independently decrementing inventory — see §2.5) combined with no fulfillment-service binding on the line items meant every order's fulfillment order defaulted to the Shop location. Express Fulfillment only acts on fulfillment orders assigned to its own location (`location_id: [GET with Postman]`, registered under fulfillment service handle `express-fulfillment`).

Attempting to set `line_items[].fulfillment_service` directly on the create payload does **not** work — Shopify silently overrides it back to `"manual"` unless the variant itself is bound to that fulfillment service at the catalog level, which was not the case here.

**Fix:** Immediately after order creation, fetch the fulfillment order and call `move.json`:
GET  /orders/{id}/fulfillment_orders.json

POST /fulfillment_orders/{id}/move.json

{ "fulfillment_order": { "new_location_id": <Express Fulfillment location> } }

**Critical API semantics discovered during testing:** `move.json` does not mutate the fulfillment order in place — it returns `moved_fulfillment_order`, a *new* fulfillment order object at the destination location, and cancels the original. The first implementation of this fix used the **pre-move** fulfillment order ID for the subsequent fulfillment request, which silently no-oped (`request_status` stayed `unsubmitted` indefinitely, no error thrown). The fix was to capture `moveResponse.moved_fulfillment_order.id` and use that for everything downstream.

### 2.4 Architecture shift: fulfillment request, not auto-fulfill interception

Express Fulfillment installations created after Shopify's January 2026 changes to the fulfillment API operate exclusively on the **fulfillment orders model**: the merchant explicitly requests fulfillment; the 3PL accepts or rejects; the 3PL creates the fulfillment (with tracking) once shipped. The older pattern — letting Shopify auto-fulfill the order and having the 3PL app intercept that event — is what required the setting in §2.2 to be on, and is no longer the supported integration path for apps installed post-January-2026. (Notably, a sibling seller account uses the *same* Express Fulfillment app but was installed pre-January-2026 and still relies on the legacy auto-fulfill interception pattern — this is why the other Seller account did not exhibit the fulfilled-on-arrival issue that Seller did.)

The integration's original `fulfillments.json` call (creating a merchant-side fulfillment immediately, with hardcoded placeholder tracking `"DHL" / "123123"`) was actively wrong under the current model: it marked the order fulfilled before the 3PL had done anything, pre-empting the 3PL's own fulfillment record.

**Fix:** Removed `fulfillments.json` entirely. Replaced with:
POST /fulfillment_orders/{moved_id}/fulfillment_request.json

{ "fulfillment_request": { "message": "VTEX order <id> ready for fulfillment." } }
This transitions `request_status` from `unsubmitted → submitted`, Shopify relays the request to the 3PL's registered callback URL, and on acceptance `request_status` becomes `accepted` — at which point the order appears on Express Fulfillment's dashboard. Verified end-to-end via the fulfillment order's `request_status` field and confirmed visually in Express Fulfillment's dashboard.

### 2.5 Inventory handling

`inventory_behaviour: "bypass"` is used on order creation deliberately, so Shopify never independently decrements inventory at order-creation time (which previously caused conflicts with the 3PL's own inventory management). Inventory is instead adjusted explicitly via:
POST /inventory_levels/adjust.json

{ "location_id": ..., "inventory_item_id": ..., "available_adjustment": -qty }
`adjust` (delta-based) is used deliberately instead of `set` (absolute) so that a concurrent write from Express Fulfillment's own inventory sync is not conflicted by a race condition.

### 2.6 Lifecycle consolidation

An interim version of the fix split logic across two VTEX order states: order creation on `ready-for-handling`, inventory/move/fulfillment-request on `invoiced`. This was abandoned — the Seller's actual order lifecycle does not have a separate, independently-triggered invoicing step gating fulfillment; VTEX is not what marks the order ready to ship. All Shopify-side logic (order creation, move, inventory adjustment, fulfillment request) was consolidated into the single `ready-for-handling` handler. The `invoiced` handler is now a no-op (logging only).

An interim mitigation — tagging orders `preorder` at creation to suppress the 3PL from acting prematurely, removing the tag on invoice — was also implemented and then removed. Under the fulfillment-request model, the 3PL only acts on explicit request, making the tag redundant. Worse, the tag was found to actively block Express Fulfillment from accepting requests even after the underlying timing issue was resolved by other means.

### 2.7 Return value contract

The final implementation has `sendOrder` (in the Shopify order-creation client) return `{ shopifyOrderId, fulfillmentOrderId }` directly — where `fulfillmentOrderId` is the **post-move** ID — rather than having the caller (`getOrderUpdates.ts`) re-look-up the order by name and re-fetch its fulfillment orders. The earlier two-lookup pattern was the cause of a request being issued against a stale or incorrect ID in one failed iteration; carrying the ID through the original call chain removed that failure surface entirely.

---

## Part 3: Return Flow — Tracking and Invoicing Back Into VTEX

### 3.1 AUTH ISSUE: standard sellers cannot invoice their own orders via API key/token

The order workflow and invoicing permissions for any order under the VTEX Marketplace is owned by the Marketplace, not by the VTEX Seller, even though VTEX maintains a seller-side copy of the order (visible and invoiceable manually in the Seller admin UI). Calling the OMS invoice endpoint —
POST /api/oms/pvt/orders/{orderId}/invoice
— using the Seller's own app key/token returned `401 Unauthorized`. VTEX's OMS treats standard seller app credentials as having read-only/limited scope on the order workflow; only marketplace-level permissions, or a session-based `VtexIdclientAutCookie` token, can post invoices.

### 3.2 VTEX platform limitation: `isBetterScope`

VTEX exposes a flag, `isBetterScope`, on seller records that — per VTEX documentation — extends a seller's API scope. An attempt to set this:
PATCH /api/seller-register/pvt/sellers/seller_id

[{ "operation": "replace", "path": "/isBetterScope", "value": true }]
returned:
```json
{ "error": "Only white label seller can be set to better scope", "data": { "code": "SRAPI-405" } }
```
`isBetterScope` is only available to **white label sellers** (`sellerType: 2`), not standard sellers (`sellerType: 1`), from the information available at the time of writing. Seller and all other accounts on the marketplace are standard sellers. Converting an existing seller's type is not a patchable operation — it requires deleting and recreating the seller record, which would break all existing orders, products, and configuration tied to that account. This path was abandoned as a limitation of the existing platform configuration.

### 3.3 Workaround: external API key registered cross-account

VTEX's support guidance was to generate an API key/token pair on the **seller** account and register it as an **external API key on the Marketplace account**. This allows requests sent with Seller's API key to carry marketplace-level permissions on OMS — without sharing the Marketplace's own credentials, without a session-token proxy hop, and without restructuring the seller account.

**Implementation:** the new key/token pair was placed into Seller's VTEX IO app settings, in the same `VTEX_APP_KEY` / `VTEX_APP_TOKEN` fields already read by `vtexPostClient`/`vtexPutClient`. No other code change was required — once the key was registered as external on the Marketplace and placed in Seller's app settings, the existing invoice/tracking-update code path worked without further modification.

### 3.4 Issue: fulfillment webhooks never registered

Even with the credential problem solved, tracking added to a shipped order in Shopify did not trigger anything. Checking the registered webhooks for the Shopify Seller store showed only three:
products/update  → /product-update

products/create  → /product-creation

products/delete  → /product-deletion
No `fulfillments/create` or `fulfillments/update` webhooks existed. The integration's webhook registration flow (`registerWebhooks` mutation) only ever registered product topics; fulfillment topics required separate, manual registration — they are not created automatically by anything else in the app.

**Fix:** registered both manually:
POST /admin/api/2024-01/webhooks.json

{ "webhook": { "topic": "fulfillments/create", "address": "https://[seller_id].myvtex.com/create-fulfillment", "format": "json" } }

POST /admin/api/2024-01/webhooks.json

{ "webhook": { "topic": "fulfillments/update", "address": "https://[seller_id].myvtex.com/update-fulfillment", "format": "json" } }
These map to routes already present in `service.json`/`index.ts` (`createFulfillment`/`updateFulfillment`, handled by `getShopifyOrderUpdates`), which were correctly implemented but had nothing triggering them.

**Important caveat confirmed during testing:** Shopify does not retroactively fire webhooks for events that occurred before the webhook registration existed. An order that already had tracking added before these webhooks were registered did not trigger a webhook retroactively — a new tracking update (or a new order shipped after registration) was required to confirm the flow end-to-end.

### 3.5 Confirmed working flow

With all of the above in place, the verified return path is:
1. Express Fulfillment ships the order, adds tracking in Shopify.
2. Shopify fires `fulfillments/update` (or `/create`) to `seller.myvtex.com/update-fulfillment`.
3. `getShopifyOrderUpdates` locates the matching VTEX invoice via `findInvoiceByNumber`, then calls:
PUT /api/oms/pvt/orders/{vtexOrder.orderId}/invoice/{invoiceId}

{ courier, trackingNumber, trackingUrl }
4. Authenticated via the Seller key registered as external on Marketplace — succeeds (no more 401).
5. VTEX order timeline updates with tracking; order status reflects invoiced/in-progress.

---

## Part 4: Dependencies

- **Shopify Admin API version `2024-01`, pinned deliberately.** This is the version every REST Admin API call in this app uses (`orders.json`, `products.json`, `inventory_levels/adjust.json`, `fulfillment_orders/.../move.json`, `fulfillment_request.json`, etc.), and it's the exact version this entire integration — including the `move.json` response shape and `fulfillment_request.json` behavior detailed in §2.3–2.4 — was debugged and confirmed working against. **Do not bump this casually.** Shopify REST API versions can and do change response shapes between releases; the `moved_fulfillment_order` discovery in §2.3 is a direct example of an API-version-specific detail that had to be found by testing, not by reading docs. Treat any version bump as a deliberate upgrade project requiring the full forward-and-return flow to be re-tested end-to-end before trusting it in production — not something to do just to match an unrelated config value elsewhere (e.g. a `shopify.app.toml`'s `webhooks.api_version`, which only governs the two app-lifecycle webhooks declared there and has no bearing on this app's own REST calls).
- **Shopify OAuth access scopes**, requested when creating the custom app installed on each store (see §6.0). At minimum, the scopes this integration's API calls require are: `read_products`, `write_products`, `read_product_listings`, `write_product_listings`, `read_inventory`, `write_inventory`, `read_locations`, `read_orders`, `write_orders`, `read_fulfillments`, `write_fulfillments`, `read_merchant_managed_fulfillment_orders`, `write_merchant_managed_fulfillment_orders`, `read_assigned_fulfillment_orders`, `write_assigned_fulfillment_orders`, `read_third_party_fulfillment_orders`, `write_third_party_fulfillment_orders`, `read_files`, `write_files`, `read_price_rules`, `write_price_rules`, `read_custom_fulfillment_services`, `write_custom_fulfillment_services`. A custom app created via the Shopify CLI template requests a much broader default scope list (covering checkout, discounts, themes, customer data, and more) — none of that is required by this integration's code and can be trimmed down to the list above when registering the app.
- **Express Fulfillment app** registered with `fulfillment_orders_opt_in: true` and a working `callback_url`. If Express Fulfillment ever changes their callback infrastructure or fulfillment service registration, the `fulfillment_request.json` call has no guaranteed alternative path — there is no fallback if their opt-in flag or callback URL lapses.
- **VTEX MasterData `stores` schema**, specifically the `shopifyLocation` field per store document. The entire move/inventory/fulfillment-request sequence is skipped (with only a console warning) if this field is empty — this has caused silent no-ops in earlier testing and is the single most likely operator error when onboarding a new account.
- **External API key registered on the marketplace account**, sourced from the VTEX seller account. This is a manual, one-time setup step done through VTEX admin — it is not something the app can configure itself, and there is no visibility in code if it is ever revoked or expires.
- **Shopify webhooks for `fulfillments/create` and `fulfillments/update`**, registered manually per store. Not part of the automatic `registerWebhooks` flow — must be added separately for every new store onboarded.

---

## Part 5: Known Breaking Points and Future Risks

| Risk | Detail | Mitigation status |
|---|---|---|
| **`move.json` response changes** | The fix depends on `moved_fulfillment_order.id` existing in the response. A Shopify API version change altering this shape would silently break fulfillment requests (falls back to the stale pre-move ID). | Monitor Shopify API changelogs on version bump. No automated test currently guards this. |
| **Order reference length** | Express Fulfillment indicated a possible 12-digit reference constraint. Test orders using the full VTEX order ID (e.g. `XXX-1638400532689-01`) were nonetheless accepted in testing. | Unresolved / open item. If references are ever truncated or rejected downstream in Express Fulfillment's own workflow, the order naming scheme will need revisiting — candidate fix is using Shopify's native `order_number` with a MasterData cross-reference back to the VTEX order ID. |
| **Duplicate webhook delivery** | `sendOrder` guards against creating a duplicate Shopify order (checks by order name first) but returns `undefined` silently on a duplicate — no fulfillment request is retried. An order stuck at `request_status: unsubmitted` after a retry is the expected artifact of this guard, not a new bug. | Working as designed, but worth documenting for whoever debugs a similar-looking case in future. |
| **External API key lifecycle** | The cross-account key has no expiry handling, rotation procedure, or monitoring in code. If revoked or rotated on either side without updating the other, invoicing fails with a 401 that looks identical to the original (now-resolved) issue. | No mitigation currently. Recommend documenting the key's location and adding alerting on repeated 401s from the invoice/tracking endpoint. |
| **Per-store manual webhook registration** | `fulfillments/create`/`update` are not part of the app's automatic webhook setup. Onboarding a new seller account without remembering this step reproduces the entire §3.4 investigation. | Addressed in the setup checklist in Part 6 — recommend folding this into `registerWebhooks` so it is no longer a manual step. |
| **Legacy vs. current Express Fulfillment integration mode** | VTEX Sellers (pre-Jan-2026 install) and VTEX Sellers (post-Jan-2026 install) now run structurally different integration logic against the same 3PL app. Any future shared code change must be evaluated against both behaviour modes — a fix correct for one may silently break the other. | No automated differentiation exists between "legacy" and "current" Express Fulfillment installs in code. |
| **Shopify "auto-fulfill" store setting drifting back on** | This is a manual store-level setting, not app-managed. If anyone (future integration, a Shopify support action) re-enables "Automatically fulfill the order's line items," the original fulfilled-on-arrival issue returns with no code-level warning. | No app-level guard exists. |

---

## Part 6: Setup Guide for New Seller Accounts

Use this checklist when replicating this integration on another VTEX seller account with Shopify + a 3PL fulfillment app.

### 6.0 Shopify-side custom app setup

Before any of the VTEX-side steps below, the Shopify store needs a custom app installed that grants this integration an API access token. This is a one-time setup per Shopify Partner organization, then a one-time install per store.

1. **Create (or reuse) the custom app** in the Shopify Partner Dashboard. A single custom app definition can be reused across multiple store installs — each install generates its own access token, so there is no need to create a new app per store.
2. **Generate a Custom Distribution install link** for the target store: Partner Dashboard → the app → Distribution → enter the store's `.myshopify.com` domain → generate link. Install links expire, so use them promptly after generating.
3. **Install the app** by opening the link while logged into that store's Shopify admin, then click Install.
4. **Obtain the real OAuth access token.** The static API secret shown in the Partner Dashboard's credentials page is *not* the per-store access token and will not authenticate API calls. The actual token (`shpat_...` / `shpca_...` depending on app type) is issued during the OAuth install flow. If the app's own backend doesn't capture and surface this automatically, running the app locally via the Shopify CLI dev tunnel during install will expose it in the OAuth callback — capture it there.
5. **Create the VTEX MasterData store document** with this token:
POST /api/dataentities/shopifyStoresConnected/documents

{ "storeName": "<store>", "storeURL": "https://<store>.myshopify.com", "status": "not-connected", "shopifyToken": "<token>" }
   Use `"not-connected"` (with hyphen) — this is what makes the Register Webhooks button do its job in the admin UI. Manually setting status to `"connected"` skips webhook registration entirely.
6. **Fill in the VTEX app settings** (Shopify Store Name, Shopify Store URL, Shopify Admin API access token, plus the VTEX app's own API key/token) before attempting to connect — `syncProducts` checks that all of these are populated before doing anything.

This setup is per-Shopify-org, then per-store — the same custom app definition can be reinstalled on each new store as it's onboarded, repeating steps 2–6.

### 6.1 Prerequisites

- [ ] Seller account exists in VTEX under the marketplace, with a Shopify store connected.
- [ ] 3PL fulfillment app installed on the Shopify store, with a known **fulfillment service handle** and **location ID**. Confirm via:
GET /admin/api/2024-01/fulfillment_services.json
  Check `fulfillment_orders_opt_in: true` is present — if not, this 3PL app may not support the fulfillment-request model used here and a different integration approach is needed.

### 6.2 VTEX MasterData configuration

- [ ] Confirm the seller's `stores` schema document has `shopifyLocation` populated with the 3PL's location ID (from 6.1). This is silently skipped if empty — verify with:
GET /api/dataentities/shopifyStoresConnected/documents/{store}?_fields=storeName,storeURL,shopifyToken,shopifyLocation,status
  All four of `storeName`, `storeURL`, `shopifyToken`, `shopifyLocation` must be populated.

### 6.3 Shopify store configuration

- [ ] Set **Settings → Checkout → Order processing → "Automatically fulfill the order's line items"** to **off** ("Don't fulfill any of the order's line items automatically"). This is required for the fulfillment-request model in §2.4. Do not enable this even if the 3PL's own documentation suggests it — confirm first whether their integration is legacy or current (see Part 5, last row).

### 6.4 Webhook registration

- [ ] Run the standard product webhook registration flow (`registerWebhooks` mutation via the app's admin UI), which sets up `products/update`, `products/create`, `products/delete`.
- [ ] **Manually** register the fulfillment webhooks — these are not included automatically:
POST /admin/api/2024-01/webhooks.json

{ "webhook": { "topic": "fulfillments/create", "address": "https://{account}.myvtex.com/create-fulfillment", "format": "json" } }

POST /admin/api/2024-01/webhooks.json

{ "webhook": { "topic": "fulfillments/update", "address": "https://{account}.myvtex.com/update-fulfillment", "format": "json" } }
- [ ] Verify all five webhooks (3 product + 2 fulfillment) are present:
GET /admin/api/2024-01/webhooks.json

### 6.5 Cross-account invoicing authority

- [ ] Generate a new API key/token pair on the seller's VTEX account.
- [ ] Have this key registered as an **external API key on the marketplace (parent) account**.
- [ ] Place the new key/token into the seller's VTEX IO app settings (`VTEX_APP_KEY` / `VTEX_APP_TOKEN` fields) — no code change needed if the app already reads from app settings via `ctx.clients.apps.getAppSettings`.
- [ ] Do **not** attempt `isBetterScope` as a substitute — confirmed not available to standard (`sellerType: 1`) sellers (§3.2).

### 6.6 End-to-end test sequence

- [ ] Push one test order through VTEX to `ready-for-handling`. Confirm in Shopify: order created, `fulfillment_status: null`, no premature fulfillment record, fulfillment order assigned to the 3PL's location, `request_status` reaches `submitted` then `accepted`.
- [ ] Confirm the order appears on the 3PL's own dashboard.
- [ ] Ship the order on the 3PL's dashboard with a test tracking number (must be added *after* webhook registration in 6.4 — pre-existing tracking will not retroactively fire a webhook).
- [ ] Confirm the VTEX order updates with tracking and moves toward invoiced status, with no 401 in logs.

### 6.7 Sign-off

This feature and its documentation was scoped, built and tested by Vladimir Montanu - Git handle @dvm1984