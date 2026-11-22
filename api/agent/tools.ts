import { pool, reject, validSession, type ApiReq, type ApiRes } from "./_server.js";

const toolNames = [{ name: "menu.unavailable_items", description: "List unavailable menu item IDs; reads no customer or order data." }];

export default async function handler(req: ApiReq, res: ApiRes) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (!validSession(req)) return reject(res, 401, "Staff authentication required.");
  if (req.method === "GET") return res.status(200).json({ tools: toolNames, discovery: "Tool implementation is loaded only when invoked." });
  if (req.method !== "POST") { res.setHeader("Allow", "GET, POST"); return reject(res, 405, "Use GET or POST."); }
  const body = req.body as { tool?: unknown } | undefined;
  if (body?.tool !== "menu.unavailable_items") return reject(res, 404, "Unknown tool.");
  if (!process.env.DATABASE_URL) return reject(res, 503, "Database unavailable.");
  try {
    const tool = await import("../../harness/servers/menu/unavailable-items.js");
    const result = await tool.run();
    return res.status(200).json({ ok: true, tool: tool.name, result, bounded: true });
  } catch (error) {
    console.error("agent_tool_failed", error instanceof Error ? error.message : "unknown");
    return reject(res, 503, "Tool execution failed.");
  }
}
