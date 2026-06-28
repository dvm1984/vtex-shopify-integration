import { CONSTANTS } from "../constants/constants";
import { masterDataQuery } from "../middlewares/query";
import { checkMasterDataStatus } from "../resolvers/syncProducts";

export async function submitHandler(ctx: InstalledAppEvent) {
  const {
    Shopify_Store_Name,
    Shopify_Store_URL,
    Shopify_Admin_API_access_token,
    Shopify_Location_ID,
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
      await checkMasterDataStatus(CONSTANTS.store, ctx, "stores", {
        properties: {
          storeName: {
            type: "string",
          },
          storeURL: {
            type: "string",
          },
          shopifyToken: {
            type: "string",
          },
          shopifyLocation: {
            type: "string",
          },
        },
        "v-indexed": [
          "storeName",
          "storeURL",
          "shopifyToken",
          "shopifyLocation",
        ],
        "v-security": {
          allowGetAll: true,
          publicRead: [
            "storeName",
            "storeURL",
            "shopifyToken",
            "shopifyLocation",
          ],
          publicWrite: [
            "storeName",
            "storeURL",
            "shopifyToken",
            "shopifyLocation",
          ],
          publicFilter: [
            "storeName",
            "storeURL",
            "shopifyToken",
            "shopifyLocation",
          ],
        },
      });
      const customStoreName = Shopify_Store_Name.split(" ")
        .join("")
        .split("-")
        .join("");

      const storesUrl = await masterDataQuery(
        ctx,
        CONSTANTS.store,
        `_schema=stores&storeURL=${Shopify_Store_URL}&`,
        ""
      ).then((data) => JSON.parse(data));
      const storesName = await masterDataQuery(
        ctx,
        CONSTANTS.store,
        `_schema=stores&storeName=${customStoreName}&`,
        ""
      ).then((data) => JSON.parse(data));

      if (storesUrl.length === 0 && storesName.length === 0) {
        await ctx.clients.vtexMasterDataPostClient
          .postData(
            `/api/dataentities/${CONSTANTS.store}/documents`,
            {
              storeName: customStoreName,
              storeURL: Shopify_Store_URL,
              shopifyToken: Shopify_Admin_API_access_token,
              status: "not-connected",
              id: customStoreName,
              shopifyLocation: Shopify_Location_ID || "",
            },
            ctx
          )
          .then((data) => console.log(data));
      } else {
        await ctx.clients.vtexMasterDataPatchClient.patchData(
          `/api/dataentities/${CONSTANTS.store}/documents/${customStoreName}`,
          {
            shopifyLocation: Shopify_Location_ID || "",
            shopifyToken: Shopify_Admin_API_access_token,
          },
          ctx
        );
      }
    }
  } catch (err) {
    console.log(err);
  }
}
