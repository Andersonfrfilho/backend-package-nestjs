import { createParamDecorator, ExecutionContext } from "@nestjs/common";

/**
 * Parameter decorator that extracts the authenticated user's Keycloak ID
 * from the `X-User-Id` header injected by Kong after token validation.
 *
 * In the B2B path (service-to-service), the caller is responsible for
 * forwarding the same header.
 *
 * @example
 * ```ts
 * @Get('me')
 * @Roles('user-manager')
 * @UseGuards(RolesGuard)
 * async getMe(@AuthUser() keycloakId: string) {
 *   return this.userService.getUserByKeycloakId(keycloakId);
 * }
 * ```
 */
export const AuthUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    const raw = request.headers?.["x-user-id"] ?? request.headers?.["X-User-Id"];
    return Array.isArray(raw) ? raw[0] : (raw ?? "");
  },
);
