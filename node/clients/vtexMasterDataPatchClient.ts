import { IOContext, InstanceOptions, JanusClient } from "@vtex/api";

export default class vtexMasterDataPatchClient extends JanusClient {
  constructor(context: IOContext, options?: InstanceOptions) {
    super(context, {
      ...options,
      retries: 2,
      headers: {
        "content-type": "application/json",
      },
    });
  }

  public async patchData(url: string, data: any, ctx: any) {
    const response = await this.http.patch(url, data, {
      metric: "patch-data-to-masterData",
      headers: {
        VtexIdclientAutCookie:
          ctx.vtex.adminUserAuthToken || ctx.vtex.authToken,
      },
    });
    return response;
  }
}
