import { NextResponse } from "next/server";
import { getPublicConfig } from "@/lib/server/config";

export const dynamic = "force-dynamic";

/** GET /api/config —— 前端获取脱敏配置（是否显示条码入口等） */
export async function GET() {
  return NextResponse.json(getPublicConfig());
}
