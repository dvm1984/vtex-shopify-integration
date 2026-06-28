import { CONSTANTS } from "../constants/constants";
import { masterDataQuery } from "../middlewares/query";
import { getInitialProducts } from "../routes/getInitialProducts";

export const restartBulk = async (_: unknown, data: any, ctx: Context) => {
  const storesUrl = await masterDataQuery(
    ctx,
    CONSTANTS.bulkProducts,
    "",
    "status,ids,name"
  ).then((data) => {
    const jsonData = JSON.parse(data);
    return {
      status: jsonData[0].status,
      id: jsonData[0].ids,
      name: jsonData[0].name,
    };
  });
  await getInitialProducts(ctx, storesUrl.id, storesUrl.name);

  return data;
};
