/**
 *
 * Example:
 *   Input:  https://cdn.shopify.com/.../image.jpg?v=123
 *   Output: https://cdn.shopify.com/.../image_2048x2048.jpg?v=123
 */
export function resizeShopifyImage(url: string): string {
  if (!url || !url.includes("cdn.shopify.com")) return url;

  // Split off query string
  const [base, query] = url.split("?");

  // Find the last dot to locate the file extension
  const lastDot = base.lastIndexOf(".");
  if (lastDot === -1) return url;

  let filename = base.substring(0, lastDot);
  const extension = base.substring(lastDot); // e.g. ".jpg"

  // Strip any existing Shopify size suffix (e.g. _1920x1080, _800x, _x600)
  filename = filename.replace(/_\d*x\d*$/, "");

  const resized = `${filename}_2048x2048${extension}${query ? `?${query}` : ""}`;
  return resized;
}
