import { CONSTANTS } from "../constants/constants";
import { checkMasterDataStatus } from "../resolvers/syncProducts";

export async function installHandler(ctx: InstalledAppEvent) {
  console.log("install");

  await checkMasterDataStatus(CONSTANTS.bulkProducts, ctx, "bulkStatus", {
    properties: {
      productId: {
        status: "string",
        ids: "string",
        name: "string",
      },
    },
    "v-indexed": ["status", "ids", "name"],
    "v-security": {
      allowGetAll: true,
      publicRead: ["status", "ids", "name"],
      publicWrite: ["status", "ids", "name"],
      publicFilter: ["status", "ids", "name"],
    },
  });
  await ctx.clients.masterdata.createOrUpdateEntireDocument({
    dataEntity: CONSTANTS.bulkProducts,
    fields: {
      status: "inactive",
      ids: "null",
      name: "",
    },
    id: "1",
  });
}
