import { productUpdate } from "./productUpdate";

export async function update(
  ctx: Context,
  product: any,
  existingProduct: any,
  warehouse: string,
  productSpec: any[],
  shopifyLocation: string | null,
  metafields:any[]
) {
  // Brand

  return await productUpdate(
    ctx,
    product,
    existingProduct,
    warehouse,
    productSpec,
    shopifyLocation,
    metafields
  );
}
