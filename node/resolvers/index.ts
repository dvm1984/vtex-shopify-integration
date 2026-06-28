import { syncProducts } from "./syncProducts";
import { getProductErrorList } from "./getProductErrors";
import { getSkuErrorList } from "./getSkuErrors";
import { getStoresList } from "./getStores";
import { deleteStores } from "./deleteStores";
import { getBulk } from "./getBulk";
import { restartBulk } from "./restartBulk";
import { getCurrentStore } from "./getCurrentStore";
import { getStoreStatus } from "./getStoreStatus";
import { registerWebhooks } from "./registerWebhooks";

export const mutations = {
  syncProducts,
  deleteStores,
  restartBulk,
  registerWebhooks,
};
export const queries = {
  getProductErrorList,
  getSkuErrorList,
  getStoresList,
  getBulk,
  getCurrentStore,
  getStoreStatus,
};
