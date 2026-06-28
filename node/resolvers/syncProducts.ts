import { CONSTANTS } from "../constants/constants";
import { postData } from "../middlewares/shopifyPost";
import { getData } from "../middlewares/shopifyGet";
import { getInitialProducts } from "../routes/getInitialProducts";
import fetch from "node-fetch";

export const checkMasterDataStatus = async (
  document: string,
  ctx: any,
  schema: string,
  properties: any
) => {
  await ctx.clients.vtexMasterDataClient
    .putData(`/api/dataentities/${document}/schemas/${schema}`, properties, ctx)
    .then((data: any) => data)
    .catch(() => []);
};

export const shopifyWebhooksStatus = async (
  url: string,
  ctx: any,
  appEndpoint: string,
  name?: string
) => {
  return await getData(url, ctx, name).then(({ webhooks }) => {
    return webhooks.filter((elem: any) => elem.address === appEndpoint);
  });
};

// NOTE: this registers the products/update, products/create, and
// products/delete Shopify webhooks automatically when a store is connected.
// It does NOT register fulfillments/create or fulfillments/update — those
// must be registered manually per store. See TECHNICAL-DOCUMENT.md §3.4 and
// §6.4 for why, and the exact manual registration calls to run.
export const syncProducts = async (
  _: unknown,
  { data: storeName }: { data: any },
  ctx: Context
) => {
  const accountName = ctx.header["x-forwarded-host"];
  const {
    Shopify_Store_Name,
    Shopify_Store_URL,
    Shopify_Admin_API_access_token,
    VTEX_APP_KEY,
    VTEX_APP_TOKEN,
  } = await ctx.clients.apps
    .getAppSettings(CONSTANTS.appName)
    .then((data: any) => {
      return data;
    });
  try {
    new URL(Shopify_Store_URL);
    if (
      Shopify_Store_Name &&
      Shopify_Store_URL &&
      Shopify_Admin_API_access_token &&
      VTEX_APP_KEY &&
      VTEX_APP_TOKEN
    ) {
      const customStoreName = Shopify_Store_Name.split(" ")
        .join("")
        .split("-")
        .join("");

      await ctx.clients.vtexPostClient
        .postData("/api/orders/hook/config", ctx, {
          filter: {
            type: "FromWorkflow",
            status: ["ready-for-handling", "invoiced", "canceled"],
          },
          hook: {
            url: `https://${accountName}/order-update`,
          },
        })
        .then(async () => {
          const webhookData = await shopifyWebhooksStatus(
            `admin/api/${CONSTANTS.shopifyApiVersion}/webhooks.json`,
            ctx,
            `https://${accountName}/product-update`,
            storeName
          );
          if (webhookData.length === 0) {
            await postData(
              `admin/api/${CONSTANTS.shopifyApiVersion}/webhooks.json`,
              {
                webhook: {
                  address: `https://${accountName}/product-update`,
                  topic: "products/update",
                  format: "json",
                },
              },
              ctx,
              storeName
            );
          }
        })
        .then(async () => {
          const webhookData = await shopifyWebhooksStatus(
            `admin/api/${CONSTANTS.shopifyApiVersion}/webhooks.json`,
            ctx,
            `https://${accountName}/product-creation`,
            storeName
          );
          if (webhookData.length === 0) {
            await postData(
              `admin/api/${CONSTANTS.shopifyApiVersion}/webhooks.json`,
              {
                webhook: {
                  address: `https://${accountName}/product-creation`,
                  topic: "products/create",
                  format: "json",
                },
              },
              ctx,
              storeName
            );
          }
        })
        .then(async () => {
          const webhookData = await shopifyWebhooksStatus(
            `admin/api/${CONSTANTS.shopifyApiVersion}/webhooks.json`,
            ctx,
            `https://${accountName}/product-deletion`,
            storeName
          );
          if (webhookData.length === 0) {
            await postData(
              `admin/api/${CONSTANTS.shopifyApiVersion}/webhooks.json`,
              {
                webhook: {
                  address: `https://${accountName}/product-deletion`,
                  topic: "products/delete",
                  format: "json",
                },
              },
              ctx,
              storeName
            );
          }
        })
        .then(async () => {
          await ctx.clients.vtexMasterDataPatchClient.patchData(
            `/api/dataentities/${CONSTANTS.store}/documents/${
              storeName || customStoreName
            }`,
            {
              status: "connected",
            },
            ctx
          );
        })
        .then(async () => {
          await checkMasterDataStatus(
            CONSTANTS.productError,
            ctx,
            "productErrors",
            {
              properties: {
                productId: {
                  type: "string",
                },
                productName: {
                  type: "string",
                },
                reportedAt: {
                  type: "string",
                },
                Issue: {
                  type: "string",
                },
              },
              "v-indexed": ["productId", "productName", "reportedAt", "Issue"],
              "v-security": {
                allowGetAll: true,
                publicRead: ["productId", "productName", "reportedAt", "Issue"],
                publicWrite: [
                  "productId",
                  "productName",
                  "reportedAt",
                  "Issue",
                ],
                publicFilter: [
                  "productId",
                  "productName",
                  "reportedAt",
                  "Issue",
                ],
              },
            }
          );
        })

        .then(async () => {
          await checkMasterDataStatus(CONSTANTS.skuError, ctx, "skuErrors", {
            properties: {
              productId: {
                type: "string",
              },
              productName: {
                type: "string",
              },
              skuId: {
                type: "string",
              },
              skuName: {
                type: "string",
              },
              reportedAt: {
                type: "string",
              },
              Issue: {
                type: "string",
              },
            },
            "v-indexed": [
              "skuId",
              "skuName",
              "reportedAt",
              "Issue",
              "productId",
              "productName",
            ],
            "v-security": {
              allowGetAll: true,
              publicRead: [
                "skuId",
                "skuName",
                "reportedAt",
                "Issue",
                "productId",
                "productName",
              ],
              publicWrite: [
                "skuId",
                "skuName",
                "reportedAt",
                "Issue",
                "productId",
                "productName",
              ],
              publicFilter: [
                "skuId",
                "skuName",
                "reportedAt",
                "Issue",
                "productId",
                "productName",
              ],
            },
          });
        })
        .then(async () => {
          const mainInventory = await ctx.clients.vtexGetClient
            .getData("/api/logistics/pvt/configuration/warehouses/1_1", ctx)
            .then((data) => {
              return (
                data.name === "Main inventory" || data.name === "Inventory"
              );
            });
          const dockNumber = await ctx.clients.vtexGetClient
            .getData("/api/logistics/pvt/configuration/docks", ctx)
            .then((data) => data.length);
          if (mainInventory) {
            await ctx.clients.vtexPostClient.postData(
              "/api/logistics/pvt/configuration/warehouses",
              ctx,

              {
                id: "1_1",
                name: storeName || customStoreName,
                warehouseDocks: [
                  {
                    dockId: "1",
                    time: "00:00:00",
                    cost: 0.0,
                  },
                ],
                pickupPointIds: [],
                priority: 0,
                isActive: true,
              }
            );
          } else {
            const shippingPolicy = await ctx.clients.vtexGetClient
              .getData("/api/logistics/pvt/shipping-policies", ctx)
              .then((data) => data.items.map((elem: any) => elem.id));
            await ctx.clients.vtexPostClient.postData(
              "/api/logistics/pvt/configuration/docks",
              ctx,
              {
                id: dockNumber + 1,
                name: storeName || customStoreName,
                priority: 0,
                dockTimeFake: "00:00:00",
                timeFakeOverhead: "00:00:00",
                salesChannels: ["1"],
                salesChannel: null,
                freightTableIds: shippingPolicy,
                wmsEndPoint: "",
              }
            );
            await ctx.clients.vtexPostClient.postData(
              "/api/logistics/pvt/configuration/warehouses",
              ctx,

              {
                id: storeName || customStoreName,
                name: storeName || customStoreName,
                warehouseDocks: [
                  {
                    dockId: dockNumber + 1,
                    time: "00:00:00",
                    cost: 0.0,
                  },
                ],
                pickupPointIds: [],
                priority: 0,
                isActive: true,
              }
            );
          }
        })
        .then(async () => {
          await ctx.clients.vtexMasterDataPatchClient.patchData(
            `/api/dataentities/${CONSTANTS.bulkProducts}/documents/1`,
            {
              status: "inactive",
              ids: "null",
              name: storeName || customStoreName,
            },
            ctx
          );
          setInterval(async () => {
            await fetch(`http://${accountName}/active-point`);
          }, 30000);

          await getInitialProducts(ctx, "", storeName);
        })
        .catch((err: any) => console.log(err));
      return storeName;
    }
  } catch (err) {
    console.log(err);
  }
};
