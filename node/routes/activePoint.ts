export async function activePoint(ctx: Context, next: () => Promise<any>) {
  console.log("App is active");
  ctx.status = 200;
  await next();
}
