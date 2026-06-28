import { CONSTANTS } from "../../constants/constants";
import { getData } from "../../middlewares/shopifyGet";
import { resizeShopifyImage } from "../../middlewares/resizeShopifyImage";

export async function sku(
  ctx: any,
  product: any,
  variants: any,
  products: any,
  warehouse: string,
  shopifyLocation: string | null
) {
  await ctx.clients.vtexPostClient
    .postData("/api/catalog/pvt/stockkeepingunit", ctx, {
      ProductId: product?.Id,
      IsActive: false,
      ActivateIfPossible: true,
      Name:
        variants?.title === "Default Title"
          ? variants?.sku || products.title
          : variants?.sku || variants?.title,
      RefId: variants.id.toString(),
      PackagedHeight: 3,
      PackagedLength: 30,
      PackagedWidth: 30,
      PackagedWeightKg: 3,
      IsKit: false,
      CreationDate: variants?.created_at,
      MeasurementUnit: "un",
      UnitMultiplier: 1,
    })
    .then(async (data: any) => {
      const skuImages = products.images?.filter(
        (img: any) =>
          img.variant_ids?.length === 0 ||
          img.variant_ids?.includes(variants.id)
      ) || [];

      async function skuImageHandler(n: number) {
        const src = skuImages.length > 0 ? skuImages[n]?.src : "";

        await ctx.clients.vtexPostClient
          .postData(`/api/catalog/pvt/stockkeepingunit/${data.Id}/file`, ctx, {
            IsMain: n == 0 ? true : false,
            Name: `${data?.Name.split(".").join()}_${n}`,
            Text: data?.Name,
            Url: resizeShopifyImage(src) || CONSTANTS.skuImageURL,
          })
          .then(() => {
            if (n + 1 < skuImages.length) skuImageHandler(n + 1);
          })
          .catch((err: any) => {
            console.log(`skuImageHandler error for image ${n}:`, err?.message);
            if (n + 1 < skuImages.length) skuImageHandler(n + 1);
          });
      }

      if (skuImages.length > 0) {
        await skuImageHandler(0);
      }

      let p = 0;

      while (p < products.options.length) {
        await new Promise(async (resolve) => {
          await ctx.clients.vtexPutClient
            .putData(
              `/api/catalog/pvt/stockkeepingunit/${data.Id}/specificationvalue`,
              {
                FieldName: products.options[p].name,
                GroupName: "Characteristics",
                RootLevelSpecification: true,
                FieldValues: [variants[`option${p + 1}`]],
              },
              ctx
            )
            .catch((err: any) => console.log(err));

          resolve("done");
        });

        p++;
      }

      // Price
      await ctx.clients.vtexPriceClient.putData(
        `/pricing/prices/${data.Id}`,
        {
          markup: 0,
          basePrice: Number(variants.price),
          listPrice:
            Number(variants?.compare_at_price) || Number(variants.price),
        },
        ctx
      );

      // Inventory
      let inventoryLevel;

      if (shopifyLocation) {
        const warehouseName = await ctx.clients.vtexGetClient
          .getData(
            `/api/logistics/pvt/configuration/warehouses/${warehouse}`,
            ctx
          )
          .then((data: any) => data.name);

        inventoryLevel = await getData(
          `admin/api/2024-01/inventory_levels.json?location_ids=${shopifyLocation}&inventory_item_ids=${variants.inventory_item_id}`,
          ctx,
          warehouseName
        ).then((res) => {
          return res.inventory_levels[0]?.available || 0;
        });
      } else {
        inventoryLevel = variants.inventory_quantity;
      }

      await ctx.clients.vtexPutClient.putData(
        `/api/logistics/pvt/inventory/skus/${data.Id}/warehouses/${warehouse}`,
        {
          quantity: inventoryLevel,
        },
        ctx
      );
    })
    .catch(async (err: any) => {
      await ctx.clients.masterdata
        .createOrUpdateEntireDocument({
          dataEntity: `${CONSTANTS.skuError}`,
          fields: {
            productId: products.id,
            productName: products.title,
            skuId: variants.id,
            skuName:
              variants?.title === "Default Title"
                ? variants?.sku || products.title
                : variants?.sku || variants?.title,
            Issue: err.message,
            reportedAt: new Date(),
          },
          id: variants?.id,
          schema: "v1",
        })
        .then((data: any) => console.log(data));
    });
}
