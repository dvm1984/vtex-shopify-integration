import { IOContext, InstanceOptions, JanusClient } from "@vtex/api";

export default class vtexMasterDataClient extends JanusClient {
  constructor(context: IOContext, options?: InstanceOptions) {
    super(context, {
      ...options,
      retries: 2,
      headers: {
        "content-type": "application/json",
      },
    });
  }

  public async putData(url: string, data: any, ctx: any) {
    const response = await this.http.put(url, data, {
      metric: "put-data-to-masterData",
      headers: {
        VtexIdclientAutCookie:
          ctx.vtex.adminUserAuthToken || ctx.vtex.authToken,
      },
    });
    return response;
  }
}
