import json from "co-body";
import { CONSTANTS } from "../constants/constants";
import { masterDataQuery } from "../middlewares/query";
import { getData } from "../middlewares/shopifyGet";
import { create } from "./api/create";

export async function createProduct(ctx: Context, next: () => Promise<any>) {
  ctx.status = 200;
  try {
    const createdProductData = await json(ctx.req);
    console.log("New product created:", createdProductData);

    const Shopify_Store_URL = `${ctx.request.header["x-forwarded-proto"]}://${ctx.request.header["x-shopify-shop-domain"]}`;
    const { storeName, shopifyLocation } = await masterDataQuery(
      ctx,
      CONSTANTS.store,
      `_schema=stores&storeURL=${Shopify_Store_URL}&`,
      "storeName,shopifyLocation"
    )
      .then((data) => JSON.parse(data))
      .then((data) => {
        return data[0];
      });

    const warehouse = await ctx.clients.vtexGetClient
      .getData("/api/logistics/pvt/configuration/warehouses", ctx)
      .then((warehouses: any) => {
        return warehouses.filter((elem: any) => elem.name === storeName)[0].id;
      });

    const metafields = await getData(
      `admin/api/${CONSTANTS.shopifyApiVersion}/products/${createdProductData.id}/metafields.json`,
      ctx,
      storeName
    ).then((data) => data?.metafields ?? []);

    const productSpecifications = metafields.filter(
      (elem: any) => elem.namespace == "productSpecification"
    );

    // NOTE: "transfertosell" is a Shopify metafield key (namespace-less,
    // boolean) that gates whether a product syncs from Shopify into VTEX.
    // Rename this if your own Shopify metafield setup uses a different key.
    if (
      metafields.filter(
        (elem: any) => elem.key === "transfertosell" && elem.value
      ).length > 0
    ) {
      await create(
        ctx,
        createdProductData,
        warehouse,
        productSpecifications,
        shopifyLocation
      );
    }
  } catch (err) {
    console.log("Error in createProduct:", err);
  }
  await next();
}
