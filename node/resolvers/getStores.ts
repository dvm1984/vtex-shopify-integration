import { CONSTANTS } from "../constants/constants";
import { masterDataQuery } from "../middlewares/query";

export async function getStoresList(_: unknown, data: any, ctx: Context) {
  return await masterDataQuery(
    ctx,
    CONSTANTS.store,
    "",
    "storeName,storeURL,status,shopifyToken"
  ).then((data) => data);

  return data;
}
