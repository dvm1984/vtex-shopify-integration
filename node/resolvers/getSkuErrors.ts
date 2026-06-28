import { CONSTANTS } from "../constants/constants";
import { masterDataQuery } from "../middlewares/query";

export async function getSkuErrorList(_: unknown, data: any, ctx: Context) {
  return masterDataQuery(
    ctx,
    CONSTANTS.skuError,
    "",
    "skuName,productName,skuId,productId,reportedAt,Issue",
    data
  );
}
