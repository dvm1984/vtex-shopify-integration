import { CONSTANTS } from "../constants/constants";
import { masterDataQuery } from "../middlewares/query";
import { getData } from "../middlewares/shopifyGet";
import { create } from "./api/create";

export async function getInitialProducts(ctx: Context, id?: any, data?: any) {
  const {
    Shopify_Store_URL,
    Shopify_Store_Name,
  } = await ctx.clients.apps
    .getAppSettings(CONSTANTS.appName)
    .then((data) => data);
  let lastId: any = id || "";
  const Timeout = 1000;
  const shopifyCount =
    Shopify_Store_URL &&
    (await getData(
      `admin/api/${CONSTANTS.shopifyApiVersion}/products/count.json?&since_id=${
        lastId || 0
      }`,
      ctx,
      data
    ));
  const customStoreName = Shopify_Store_Name.split(" ")
    .join("")
    .split("-")
    .join("");

  let shopifyLocation: string | null = null;

  shopifyLocation = await masterDataQuery(
    ctx,
    CONSTANTS.store,
    `_schema=stores&storeName=${data || customStoreName}&`,
    "shopifyLocation"
  )
    .then((res) => JSON.parse(res))
    .then((res) => {
      return res[0].shopifyLocation;
    });

  const mainInventory = await ctx.clients.vtexGetClient
    .getData("/api/logistics/pvt/configuration/warehouses", ctx)
    .then((datas) => {
      if (data) {
        return datas.filter((elem: any) => elem.name === data)[0].id;
      } else {
        return datas.filter((elem: any) => elem.name === customStoreName)[0].id;
      }
    });
  async function getShopifyProducts(N: number) {
    const shopifyProducts =
      Shopify_Store_URL &&
      (await getData(
        `admin/api/${
          CONSTANTS.shopifyApiVersion
        }/products.json?limit=${250}&since_id=${lastId || 0}`,
        ctx,
        data
      ).then((data) => {
        return data;
      }));
    async function productUpdation(n: number) {
      await new Promise(async (resolve: any) => {
        lastId = shopifyProducts.products[n].id;
        importStatus(ctx, "started", lastId, data || customStoreName);

        const transferData = await getData(
          `admin/api/${CONSTANTS.shopifyApiVersion}/products/${shopifyProducts.products[n].id}/metafields.json`,
          ctx,
          data
        ).then((data) => data);

        const productSpecifications = transferData?.metafields?.filter(
          (elem: any) => elem.namespace == "productSpecification"
        );
        // NOTE: "transfertosell" is the gating metafield key — see createProduct.ts
        if (
          transferData?.metafields?.filter(
            (elem: any) => elem.key === "transfertosell" && elem.value
          ).length > 0
        ) {
          await create(
            ctx,
            shopifyProducts.products[n],
            mainInventory,
            productSpecifications,
            shopifyLocation
          )
            .then(() => {
              setTimeout(async () => {
                if (n + 1 < shopifyProducts.products.length)
                  productUpdation(n + 1);
                else if (
                  n + 1 === shopifyProducts.products.length &&
                  N + 1 < Math.ceil(shopifyCount.count / 250)
                ) {
                  getShopifyProducts(N + 1);
                } else {
                  importStatus(
                    ctx,
                    "completed",
                    lastId,
                    data || customStoreName
                  );
                }
                resolve("done");
              }, Timeout);
            })
            .catch(() => {
              setTimeout(async () => {
                if (n + 1 < shopifyProducts.products.length)
                  productUpdation(n + 1);
                else if (
                  n + 1 === shopifyProducts.products.length &&
                  N + 1 < Math.ceil(shopifyCount.count / 250)
                ) {
                  getShopifyProducts(N + 1);
                } else {
                  importStatus(
                    ctx,
                    "completed",
                    lastId,
                    data || customStoreName
                  );
                }
                resolve("done");
              }, Timeout);
            });
        } else {
          setTimeout(async () => {
            if (n + 1 < shopifyProducts.products.length) productUpdation(n + 1);
            else if (
              n + 1 === shopifyProducts.products.length &&
              N + 1 < Math.ceil(shopifyCount.count / 250)
            ) {
              getShopifyProducts(N + 1);
            } else {
              importStatus(ctx, "completed", lastId, data || customStoreName);
            }
            resolve("done");
          }, Timeout);
        }
      });
    }

    shopifyProducts.products.length > 0 && (await productUpdation(0));
  }
  getShopifyProducts(0);
}

const importStatus = async (
  ctx: any,
  status: string,
  lastId: any,
  name: string
) => {
  await ctx.clients.vtexMasterDataPatchClient
    .patchData(
      `/api/dataentities/${CONSTANTS.bulkProducts}/documents/1`,
      {
        status: status,
        ids: lastId.toString(),
        name: name,
      },
      ctx
    )
    .then((data: any) => console.log(data));
};
