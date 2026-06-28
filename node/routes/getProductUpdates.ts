import json from "co-body";
import { CONSTANTS } from "../constants/constants";
import { masterDataQuery } from "../middlewares/query";
import { getData } from "../middlewares/shopifyGet";
import { create } from "./api/create";
import { update } from "./api/update";

const BetterQueue = require('better-queue');

const processTask = async (task:any, cb:any) => {
  const {ctx,updatedProductData} =task
  try {
    await taskHandler({ctx,updatedProductData})
    cb();
  } catch (error) {
    cb(error);
  }
}

const queue = new BetterQueue(processTask, {
  id: "id",
  concurrent: 1, 
  maxTimeout: 5000,
  afterProcessDelay: 1000
});


export async function getProductUpdates(
  ctx: Context,
  next: () => Promise<any>
) {
  ctx.status = 200;

    let updatedProductData = await json(ctx.req);

    queue.push({id:updatedProductData.id,ctx,updatedProductData});

  await next();
}

const taskHandler = async({ctx,updatedProductData}:{ctx:any,updatedProductData:any}) => {
  try {

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

    // Searching for the product in VTEX 

    const existingProduct = await ctx.clients.vtexGetClient
      .getData(
        `/api/catalog_system/pvt/products/productgetbyrefid/${updatedProductData.id.toString()}`,
        ctx
      )
      .then((data:any) => data)
      .catch(() => []);

    // Fetching the warehouse in VTEX associated with the Shopify store  

    const warehouse = await ctx.clients.vtexGetClient
      .getData("/api/logistics/pvt/configuration/warehouses", ctx)
      .then((warehouses:any) => {
        return warehouses.filter((elem: any) => elem.name === storeName)[0].id;
      });

    const metafields = await getData(
      `admin/api/${CONSTANTS.shopifyApiVersion}/products/${updatedProductData.id}/metafields.json`,
      ctx,
      storeName
    ).then((data) => data?.metafields ?? []);

    await ctx.clients.vtexMasterDataPatchClient
    .patchData(
      `/api/dataentities/productMetafield/documents/${updatedProductData.id}`,
      {
        metafields: JSON.stringify(metafields),
      },
      ctx
    )
    .catch((err: any) => console.log(err));

    const productSpecifications = metafields.filter(
      (elem: any) => elem.namespace == "productSpecification"
    );

    // NOTE: "transfertosell" is the gating metafield key — see createProduct.ts
    if (existingProduct?.length === 0) {
      if (
        metafields.filter(
          (elem: any) => elem.key === "transfertosell" && elem.value
        ).length > 0
      ) {
        await create(
          ctx,
          updatedProductData,
          warehouse,
          productSpecifications,
          shopifyLocation
        );
      }
    } else {
      await update(
        ctx,
        updatedProductData,
        existingProduct,
        warehouse,
        productSpecifications,
        shopifyLocation,
        metafields
      );
    }
  } catch (err) {}
}
