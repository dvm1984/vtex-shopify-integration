export async function masterDataQuery(
  ctx: any,
  document: string,
  where?: string,
  fields?: string,
  data?: any
) {
  return await ctx.clients.vtexMasterGetClient
    .getData(
      `/api/dataentities/${document}/search?${where}_fields=${fields}&_sort=createdIn`,
      data
        ? {
            "REST-Range": `resources=${data.from}-${data.to}`,
          }
        : {},
      ctx
    )
    .then((data: any) => {
      return JSON.stringify(data);
    });
}
