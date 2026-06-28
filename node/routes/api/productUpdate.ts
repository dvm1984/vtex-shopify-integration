import { CONSTANTS } from "../../constants/constants";
import { sku } from "./sku";
import { skuUpdate } from "./skuUpdate";

export async function productUpdate(
  ctx: any,
  product: any,
  existingProduct: any,
  warehouse: string,
  productSpec: any[],
  shopifyLocation: string | null,
  metafields:any[]
) {
  await ctx.clients.vtexGetClient
    .getData(
      `/api/catalog_system/pvt/products/productgetbyrefid/${product.id.toString()}`,
      ctx
    )
    .then(async (data: any) => {
      return await ctx.clients.vtexPutClient
        .putData(
          `/api/catalog/pvt/product/${data.Id}`,
          {
            Name: product?.title,
            CategoryId: existingProduct.CategoryId,
            BrandId: existingProduct.BrandId,
            LinkId: product?.handle,
            RefId: product.id.toString(),
            IsVisible: product?.status === "active",
            Description: product?.body_html,
            DescriptionShort: product?.body_html,
            ReleaseDate: product?.published_at,
            KeyWords: product?.title,
            Title: product?.title,
            IsActive: product?.status === "active",
            TaxCode: "",
            MetaTagDescription: product?.body_html,
            ShowWithoutStock: true,
          },
          ctx
        )
        .then(async (productData: any) => {

          // Inactivating SKUs which are deleted in Shopify

          const existingSku = await ctx.clients.vtexGetClient
            .getData(
              `/api/catalog_system/pvt/sku/stockkeepingunitByProductId/${productData.Id}`,
              ctx
            )
            .then((data: any) => {
              return data.map((elem: any) => elem.RefId);
            })
            .catch(() => []);

          const variants = product?.variants ?? [];

          const newSku = variants.map((elem: any) => elem.id.toString());
          const deletedSku = existingSku.filter(
            (x: string) => !newSku.includes(x)
          );

          let i = 0;
          if (deletedSku.length > 0)
            while (i < deletedSku.length) {
              const skuData = await ctx.clients.vtexGetClient.getData(
                `/api/catalog/pvt/stockkeepingunit?refId=${deletedSku[i]}`,
                ctx
              );

              await ctx.clients.vtexPutClient.putData(
                `/api/catalog/pvt/stockkeepingunit/${skuData.Id}`,
                {
                  ProductId: productData.Id,
                  IsActive: false,
                  ActivateIfPossible: false,
                  Name: skuData.Name,
                  RefId: skuData.RefId,
                  Height: skuData.Height,
                  Length: skuData.Length,
                  Width: skuData.Width,
                  WeightKg: skuData.WeightKg,
                  PackagedHeight: skuData.PackagedHeight,
                  PackagedLength: skuData.PackagedLength,
                  PackagedWidth: skuData.PackagedWidth,
                  PackagedWeightKg: skuData.PackagedWeightKg,
                  IsKit: skuData.IsKit,
                  CreationDate: skuData.CreationDate,
                  MeasurementUnit: skuData.MeasurementUnit,
                  UnitMultiplier: skuData.UnitMultiplier,
                },
                ctx
              );

              i++;
            }

          // Updating Product Specifications

          await ctx.clients.vtexDeleteClient.deleteData(
            `/api/catalog/pvt/product/${productData.Id}/specification`,
            ctx
          );
          let l = 0;

          while (l < productSpec.length) {
            await new Promise(async (resolve) => {
              await ctx.clients.vtexPutClient
                .putData(
                  `/api/catalog/pvt/product/${productData.Id}/specificationvalue`,
                  {
                    FieldName: productSpec[l].key,
                    GroupName: "Characteristics",
                    RootLevelSpecification: true,
                    FieldValues: [productSpec[l].value],
                  },
                  ctx
                )
                .catch(() => {});

              resolve("done");
            });

            l++;
          }

          // Creating or Updating SKUs

          let m = 0;
          while (m < variants.length) {
            await new Promise(async (resolve) => {
              try {
                const data = await ctx.clients.vtexGetClient.getData(
                  `/api/catalog/pvt/stockkeepingunit?refId=${variants[
                    m
                  ].id.toString()}`,
                  ctx
                );

                await skuUpdate(
                  ctx,
                  productData,
                  variants[m],
                  product,
                  data,
                  warehouse,
                  shopifyLocation,
                  metafields
                );
              } catch (e) {
                await sku(
                  ctx,
                  productData,
                  variants[m],
                  product,
                  warehouse,
                  shopifyLocation
                );
              }
              setTimeout(async () => {
                resolve("done");
              }, 250);
            });
            m++;
          }
        });
    })
    .catch(async (err: any) => {
      await ctx.clients.masterdata
        .createOrUpdateEntireDocument({
          dataEntity: `${CONSTANTS.productError}`,
          fields: {
            productId: product.id,
            productName: product?.title,
            Issue: err.message,
            reportedAt: new Date(),
          },
          id: product.id,
          schema: "v1",
        })
    });
}
