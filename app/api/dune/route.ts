import { NextRequest, NextResponse } from "next/server";
import { duneClient } from "~~/utils/dune/duneClient";
import { hasDuneAccess } from "~~/utils/dune/accessControl";

/**
 * Dune API 代理路由
 * 用于安全地调用 Dune API，避免在前端暴露 API Key
 * 需要授权地址才能访问
 * 
 * 使用方式:
 * POST /api/dune/execute
 * {
 *   "queryId": 123456,
 *   "parameters": { "param1": "value1" },
 *   "address": "0x..." // 钱包地址（用于权限验证）
 * }
 * 
 * GET /api/dune/status?executionId=xxx&address=0x...
 * 
 * POST /api/dune/execute-and-wait
 * {
 *   "queryId": 123456,
 *   "parameters": { "param1": "value1" },
 *   "address": "0x..." // 钱包地址（用于权限验证）
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, queryId, parameters, executionId, address } = body;

    // 权限检查
    if (!hasDuneAccess(address)) {
      return NextResponse.json(
        { error: "无权限访问 Dune 数据" },
        { status: 403 }
      );
    }

    if (!action) {
      return NextResponse.json(
        { error: "action 参数是必需的" },
        { status: 400 }
      );
    }

    switch (action) {
      case "execute": {
        if (!queryId || typeof queryId !== "number") {
          return NextResponse.json(
            { error: "queryId 必须是数字" },
            { status: 400 }
          );
        }

        const executionId = await duneClient.executeQuery(queryId, parameters);
        return NextResponse.json({ executionId });
      }

      case "execute-and-wait": {
        if (!queryId || typeof queryId !== "number") {
          return NextResponse.json(
            { error: "queryId 必须是数字" },
            { status: 400 }
          );
        }

        const result = await duneClient.executeQueryAndWait(
          queryId,
          parameters,
          body.maxWaitTime,
          body.pollInterval
        );
        return NextResponse.json(result);
      }

      default:
        return NextResponse.json(
          { error: `未知的 action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Dune API 请求失败",
        message: error.message,
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get("action");
    const executionId = searchParams.get("executionId");
    const address = searchParams.get("address");

    // 权限检查
    if (!hasDuneAccess(address)) {
      return NextResponse.json(
        { error: "无权限访问 Dune 数据" },
        { status: 403 }
      );
    }

    if (!action) {
      return NextResponse.json(
        { error: "action 参数是必需的" },
        { status: 400 }
      );
    }

    switch (action) {
      case "status": {
        if (!executionId) {
          return NextResponse.json(
            { error: "executionId 参数是必需的" },
            { status: 400 }
          );
        }

        const result = await duneClient.getQueryResult(executionId);
        return NextResponse.json(result);
      }

      case "csv": {
        if (!executionId) {
          return NextResponse.json(
            { error: "executionId 参数是必需的" },
            { status: 400 }
          );
        }

        const csv = await duneClient.getQueryResultCSV(executionId);
        return NextResponse.json({ csv });
      }

      default:
        return NextResponse.json(
          { error: `未知的 action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Dune API 请求失败",
        message: error.message,
      },
      { status: 500 }
    );
  }
}

