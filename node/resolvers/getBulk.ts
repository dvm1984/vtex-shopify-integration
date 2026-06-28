import { CONSTANTS } from "../constants/constants";
import { masterDataQuery } from "../middlewares/query";

export async function getBulk(_: unknown, __: unknown, ctx: Context) {
  const storesUrl = await masterDataQuery(
    ctx,
    CONSTANTS.bulkProducts,
    ``,
    "status,ids,name"
  ).then((data) => {
    const jsonData = JSON.parse(data);
    console.log(jsonData[0]);

    return JSON.stringify({
      status: jsonData[0].status,
      id: jsonData[0].ids,
      name: jsonData[0].name,
    });
  });

  return storesUrl;
}
