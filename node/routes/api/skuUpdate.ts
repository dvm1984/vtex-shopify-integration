import { CONSTANTS } from "../../constants/constants";
import { getData } from "../../middlewares/shopifyGet";
import { resizeShopifyImage } from "../../middlewares/resizeShopifyImage";

export async function skuUpdate(
  ctx: any,
  productData: any,
  variant: any,
  product: any,
  skuData: any,
  warehouse: string,
  shopifyLocation: string | null,
  metafields: any[]
) {
  return await ctx.clients.vtexPutClient
    .putData(
      `/api/catalog/pvt/stockkeepingunit/${skuData.Id}`,
      {
        ProductId: productData.Id,
        IsActive: true,
        ActivateIfPossible: true,
        Name:
          variant?.title === "Default Title"
            ? variant?.sku || product?.title
            : variant?.sku || variant?.title,
        RefId: variant.id.toString(),
        PackagedHeight: 3,
        PackagedLength: 30,
        PackagedWidth: 30,
        PackagedWeightKg: 3,
        IsKit: false,
        CreationDate: variant?.created_at,
        MeasurementUnit: "un",
        UnitMultiplier: skuData.UnitMultiplier,
      },
      ctx
    )
    .then(async (skuDetails: any) => {
      const warehouseName = await ctx.clients.vtexGetClient
        .getData(
          `/api/logistics/pvt/configuration/warehouses/${warehouse}`,
          ctx
        )
        .then((data: any) => data.name);

      // Price updation based on metafields.
      // NOTE: "custompriceinstore" is a Shopify metafield key — if set and
      // truthy, this skips the automatic price sync from Shopify, letting the
      // VTEX-side price stand instead. Rename to match your own metafield setup.
      if (
        metafields.filter(
          (elem: any) => elem.key === "custompriceinstore" && !elem.value
        ).length > 0 ||
        metafields.filter(
          (elem: any) => elem.key === "custompriceinstore"
        ).length === 0
      ) {
        await ctx.clients.vtexPriceClient.putData(
          `/pricing/prices/${skuData.Id}`,
          {
            markup: 0,
            basePrice: Number(variant?.price),
            listPrice:
              Number(variant?.compare_at_price) || Number(variant?.price),
          },
          ctx
        );
      }

      // NOTE: "enablepreorderfeature" is a Shopify metafield key — if set and
      // truthy, this skips the automatic inventory sync, letting a SKU be sold
      // as a pre-order independent of live Shopify stock. Rename as needed.
      if (
        metafields.filter(
          (elem: any) => elem.key === "enablepreorderfeature" && !elem.value
        ).length > 0 ||
        metafields.filter(
          (elem: any) => elem.key === "enablepreorderfeature"
        ).length === 0
      ) {
        let inventoryLevel;

        if (shopifyLocation) {
          inventoryLevel = await getData(
            `admin/api/2024-01/inventory_levels.json?location_ids=${shopifyLocation}&inventory_item_ids=${variant?.inventory_item_id}`,
            ctx,
            warehouseName
          ).then((res) => {
            return res?.inventory_levels[0]?.available || 0;
          });
        } else {
          inventoryLevel = variant?.inventory_quantity;
        }

        await ctx.clients.vtexPutClient.putData(
          `/api/logistics/pvt/inventory/skus/${skuData.Id}/warehouses/${warehouse}`,
          {
            quantity: inventoryLevel,
          },
          ctx
        );
      }

      const existingImages = await ctx.clients.vtexGetClient.getData(
        `/api/catalog/pvt/stockkeepingunit/${skuData.Id}/file`,
        ctx
      );

      const hasShopifyImage =
        Array.isArray(existingImages) &&
        existingImages.some(
          (img: any) =>
            typeof img?.Url === "string" &&
            img.Url.includes("cdn.shopify.com")
        );

      if (!hasShopifyImage && product?.images?.length) {
        const variantImages = product.images.filter(
          (img: any) =>
            img.variant_ids?.length === 0 ||
            img.variant_ids?.includes(variant.id)
        );

        for (let i = 0; i < variantImages.length; i++) {
          await ctx.clients.vtexPostClient
            .postData(
              `/api/catalog/pvt/stockkeepingunit/${skuData.Id}/file`,
              ctx,
              {
                IsMain: i === 0,
                Name: `${skuDetails.Name}_${i}`,
                Text: skuDetails.Name,
                Url: resizeShopifyImage(variantImages[i].src),
              }
            )
            .catch((err: any) => {
              console.log(`skuUpdate image upload error for image ${i}:`, err?.message);
            });
        }
      }

      await ctx.clients.vtexDeleteClient.deleteData(
        `/api/catalog/pvt/stockkeepingunit/${skuData.Id}/specification`,
        ctx
      );

      let p = 0;
      while (p < product?.options?.length) {
        await new Promise(async (resolve) => {
          await ctx.clients.vtexPutClient
            .putData(
              `/api/catalog/pvt/stockkeepingunit/${skuData.Id}/specificationvalue`,
              {
                FieldName: product.options[p].name,
                GroupName: "Characteristics",
                RootLevelSpecification: true,
                FieldValues: [variant[`option${p + 1}`]],
              },
              ctx
            )
            .catch(() => {});

          resolve("done");
        });

        p++;
      }
    })
    .catch(async (err: any) => {
      await ctx.clients.masterdata
        .createOrUpdateEntireDocument({
          dataEntity: `${CONSTANTS.skuError}`,
          fields: {
            productId: product.id,
            productName: product?.title,
            skuId: variant.id,
            skuName:
              variant?.title === "Default Title"
                ? variant?.sku || product?.title
                : variant?.sku || variant?.title,
            Issue: err.message,
            reportedAt: new Date(),
          },
          id: variant.id,
          schema: "v1",
        });
    });
}
