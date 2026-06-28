import { CONSTANTS } from "../constants/constants";
import { masterDataQuery } from "../middlewares/query";

export async function getProductErrorList(_: unknown, data: any, ctx: Context) {
  return masterDataQuery(
    ctx,
    CONSTANTS.productError,
    "",
    "productName,productId,reportedAt,Issue",
    data
  );
}
