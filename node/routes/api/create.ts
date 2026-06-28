import { product } from "./product";

export async function create(
  ctx: Context,
  products: any,
  warehouse: string,
  productSpec: any[],
  shopifyLocation: string | null
) {
  // Brand

  await product(ctx, products, warehouse, productSpec, shopifyLocation);
}
