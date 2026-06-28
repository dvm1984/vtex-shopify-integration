import { IOClients } from "@vtex/api";
import vtexDeleteClient from "./vtexDeleteClient";
import vtexGetClient from "./vtexGetClient";
import vtexPostClient from "./vtexPostClient";
import vtexPriceClient from "./vtexPriceClient";
import vtexPutClient from "./vtexPutClient";
import shopifyOrderCreateClient from "./shopifyOrderCreateClient";
import vtexMasterDataClient from "./vtexMasterDataClient";
import vtexMasterGetClient from "./vtexMasterGetClient";
import vtexMasterDataPostClient from "./vtexMasterDataPostClient";
import vtexMasterDataPatchClient from "./vtexMasterDataPatchClient";
export class Clients extends IOClients {
  public get vtexGetClient() {
    return this.getOrSet("vtexGetClient", vtexGetClient);
  }
  public get vtexPostClient() {
    return this.getOrSet("vtexPostClient", vtexPostClient);
  }
  public get vtexPutClient() {
    return this.getOrSet("vtexPutClient", vtexPutClient);
  }
  public get vtexDeleteClient() {
    return this.getOrSet("vtexDeleteClient", vtexDeleteClient);
  }
  public get vtexPriceClient() {
    return this.getOrSet("vtexPriceClient", vtexPriceClient);
  }

  public get shopifyOrderCreateClient() {
    return this.getOrSet("shopifyOrderCreateClient", shopifyOrderCreateClient);
  }
  public get vtexMasterDataClient() {
    return this.getOrSet("vtexMasterDataClient", vtexMasterDataClient);
  }
  public get vtexMasterDataPostClient() {
    return this.getOrSet("vtexMasterDataPostClient", vtexMasterDataPostClient);
  }
  public get vtexMasterDataPatchClient() {
    return this.getOrSet(
      "vtexMasterDataPatchClient",
      vtexMasterDataPatchClient
    );
  }
  public get vtexMasterGetClient() {
    return this.getOrSet("vtexMasterGetClient", vtexMasterGetClient);
  }
}
