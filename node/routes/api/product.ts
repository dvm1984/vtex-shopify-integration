import { CONSTANTS } from "../../constants/constants";
// import { deleteProductHandler } from "../../middlewares/deleteProduct";
import { postData } from "../../middlewares/shopifyPost";
import { sku } from "./sku";

export async function product(
  ctx: any,
  products: any,
  warehouse: string,
  productSpec: any[],
  shopifyLocation: string | null
) {
  // Product
  // let productData: any;

  const mainInventory = await ctx.clients.vtexGetClient
    .getData("/api/logistics/pvt/configuration/warehouses", ctx)
    .then((datas: any) => {
      return datas.filter((elem: any) => elem.id == warehouse)[0].name;
    });
  const category = await postData(
    `/admin/api/${CONSTANTS.shopifyApiVersion}/graphql.json`,
    {
      query: `{product(id: \"${products.admin_graphql_api_id}\") {id title productCategory { productTaxonomyNode  { fullName } } }}`,
    },
    ctx,
    mainInventory
  ).then((data) => {
    const p = data.data.product.productCategory.productTaxonomyNode.fullName;
    return p.replace(/ > /g, "/");
  });

  await ctx.clients.vtexPostClient
    .postData("/api/catalog/pvt/product", ctx, {
      Name: products?.title,
      CategoryPath: category,
      BrandName: products.vendor,
      LinkId: products?.handle,
      RefId: products?.id.toString(),
      IsVisible: products?.status === "active",
      Description: products?.body_html,
      ReleaseDate: products?.published_at,
      Title: products?.title,
      IsActive: products?.status === "active",
      TaxCode: "",
      MetaTagDescription: products?.body_html,
      ShowWithoutStock: true,
    })
    .then(async (product: any) => {
      await ctx.clients.vtexPostClient.postData(
        `/api/catalog/pvt/product/${product.Id}/salespolicy/1`,
        ctx
      );

      // productData = product;

      let l = 0;

      while (l < productSpec.length) {
        await new Promise(async (resolve) => {
          await ctx.clients.vtexPutClient
            .putData(
              `/api/catalog/pvt/product/${product.Id}/specificationvalue`,
              {
                FieldName: productSpec[l].key,
                GroupName: "Characteristics",
                RootLevelSpecification: true,
                FieldValues: [productSpec[l].value],
              },
              ctx
            )
            .catch((err: any) => console.log(err));

          resolve("done");
        });

        l++;
      }

      const variants = products.variants;

      let m = 0;
      while (m < variants.length) {
        await new Promise(async (resolve) => {
          await sku(
            ctx,
            product,
            variants[m],
            products,
            warehouse,
            shopifyLocation
          );

          //@ts-ignore

          setTimeout(async () => {
            resolve("done");
          }, 250);
        });
        m++;
      }
    })

    .catch(async (err: any) => {
      await ctx.clients.masterdata
        .createOrUpdateEntireDocument({
          dataEntity: `${CONSTANTS.productError}`,
          fields: {
            productId: products.id,
            productName: products.title,
            Issue: err.message,
            reportedAt: new Date(),
          },
          id: products?.id,
          schema: "v1",
        })
        .then((data: any) => console.log(data));

      // if (productData) {
      //   deleteProductHandler(ctx, productData);
      // }
    });
}
