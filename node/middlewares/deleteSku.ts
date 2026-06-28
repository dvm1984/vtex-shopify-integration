export async function deleteSkuHandler(ctx:any,productData:any,skuData:any){


    await ctx.clients.vtexPutClient.putData(`/api/catalog/pvt/stockkeepingunit/${skuData.Id}`,
    {
        "ProductId": productData.Id,
        "IsActive": false,
        "ActivateIfPossible": false,
        "Name": skuData.Name,
        "RefId": skuData.RefId,
        "PackagedHeight": skuData.PackagedHeight,
        "PackagedLength": skuData.PackagedLength,
        "PackagedWidth": skuData.PackagedWidth,
        "PackagedWeightKg": skuData.PackagedWeightKg,
        "Height": skuData.Height,
        "Length": skuData.Length,
        "Width": skuData.Width,
        "WeightKg": skuData.WeightKg,
        "CubicWeight": skuData.CubicWeight,
        "IsKit": skuData.IsKit,
        "CreationDate": skuData.CreationDate,
        "RewardValue": skuData.RewardValue,
        "EstimatedDateArrival": skuData.EstimatedDateArrival,
        "ManufacturerCode": skuData.ManufacturerCode,
        "CommercialConditionId": skuData.CommercialConditionId,
        "MeasurementUnit": skuData.MeasurementUnit,
        "UnitMultiplier": skuData.UnitMultiplier,
        "ModalType": skuData.ModalType,
        "KitItensSellApart": skuData.KitItensSellApart,
        "Videos": skuData.Videos
    },
    ctx).catch(()=>console.log("Sku not deleted"))
}
