import json from "co-body";
export async function productDeletion(ctx: Context, next: () => Promise<any>) {
  ctx.status = 200;
  try {
    const deletedProductData = await json(ctx.req);
    await ctx.clients.vtexGetClient
      .getData(
        `/api/catalog_system/pvt/products/productgetbyrefid/${deletedProductData.id.toString()}`,
        ctx
      )

      .then((productData) =>
        ctx.clients.vtexPutClient.putData(
          `/api/catalog/pvt/product/${productData.Id}`,
          {
            Name: productData.Name,
            CategoryId: productData.CategoryId,
            BrandId: productData.BrandId,
            LinkId: productData.LinkId,
            RefId: productData.RefId,
            IsVisible: false,
            Description: productData.Description,
            DescriptionShort: productData.DescriptionShort,
            ReleaseDate: productData.ReleaseDate,
            KeyWords: productData.KeyWords,
            Title: productData.Title,
            IsActive: false,
            TaxCode: productData.TaxCode,
            MetaTagDescription: productData.MetaTagDescription,
            SupplierId: productData.SupplierId,
            ShowWithoutStock: productData.ShowWithoutStock,
            AdWordsRemarketingCode: productData.AdWordsRemarketingCode,
            LomadeeCampaignCode: productData.LomadeeCampaignCode,
            Score: 1,
          },
          ctx
        )
      );
  } catch (err) {}
  await next();
}
