import { NextResponse } from "next/server";
import { queryProductByBarcode, splitIngredientText } from "@/lib/server/off";

export const dynamic = "force-dynamic";

/** GET /api/product/[barcode] —— 按条码查 OFF，返回产品 + 拆分后的配料 */
export async function GET(
  _req: Request,
  { params }: { params: { barcode: string } }
) {
  const barcode = (params.barcode ?? "").replace(/[^\d]/g, "");
  if (!barcode) {
    return NextResponse.json({ error: "条码无效" }, { status: 400 });
  }

  const found = await queryProductByBarcode(barcode);
  if (!found) {
    return NextResponse.json(
      { error: "未找到该产品，请尝试拍摄配料表或手动输入", found: false },
      { status: 404 }
    );
  }

  const ingredients = await splitIngredientText(found.ingredientText);
  return NextResponse.json({
    found: true,
    product: found.product,
    ingredientText: found.ingredientText,
    ingredients,
  });
}
