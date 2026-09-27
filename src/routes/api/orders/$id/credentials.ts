import { createFileRoute } from "@tanstack/react-router";

import { getSessionUser, requestIp } from "@/server/auth/session";
import { revealCredentials } from "@/server/orders/customer";

/**
 * GET /api/orders/{orderId}/credentials — entrega das credenciais ao comprador.
 * 401 sem sessão · 404 pedido inexistente · 403 pedido de outra pessoa · 409 ainda não pago.
 */
export const Route = createFileRoute("/api/orders/$id/credentials")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const user = await getSessionUser();
        const result = await revealCredentials(user, params.id, {
          ip: requestIp(),
          userAgent: request.headers.get("user-agent"),
        });
        return new Response(
          JSON.stringify(result.ok ? result.credentials : { error: result.error }),
          {
            status: result.ok ? 200 : result.status,
            headers: {
              "content-type": "application/json; charset=utf-8",
              // Dados sensíveis: nunca guardar em cache (browser, proxies, CDN).
              "cache-control": "no-store, private",
              pragma: "no-cache",
            },
          },
        );
      },
    },
  },
});
