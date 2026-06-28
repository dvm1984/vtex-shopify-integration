export async function deleteProductHandler(ctx:any,productData:any){

    await ctx.clients.vtexPutClient.putData(`/api/catalog/pvt/product/${productData.Id}`, {
        "Name": productData.Name,
        "CategoryId": productData.CategoryId,
        "BrandId": productData.BrandId,
        "LinkId": productData.LinkId,
        "RefId": productData.RefId,
        "IsVisible": false,
        "Description": productData.Description,
        "DescriptionShort": productData.DescriptionShort,
        "ReleaseDate": productData.ReleaseDate,
        "KeyWords": productData.KeyWords,
        "Title": productData.Title,
        "IsActive": false,
        "TaxCode": productData.TaxCode,
        "MetaTagDescription": productData.MetaTagDescription,
        "SupplierId": productData.SupplierId,
        "ShowWithoutStock": productData.ShowWithoutStock,
        "AdWordsRemarketingCode": productData.AdWordsRemarketingCode,
        "LomadeeCampaignCode": productData.LomadeeCampaignCode,
        "Score": 1
    },ctx).catch(()=>console.log("Product not deleted"))
}
