import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { BaseAppError } from "@adatechnology/shared";
import { HTTP_STATUS, BEARER_ERROR_CODE } from "./keycloak.constants";

/**
 * B2C Guard — user-facing routes via Kong.
 *
 * Kong validated the JWT (JWKS local), removed the Authorization header,
 * and injected X-User-Id + X-User-Roles. This guard simply asserts those
 * headers are present — it does NOT re-validate any token.
 *
 * Use for routes that are ONLY called by end users through Kong.
 *
 * @example
 * ```ts
 * @Get('me')
 * @Roles('user-manager')
 * @UseGuards(B2CGuard, RolesGuard)
 * async getMe(@AuthUser() keycloakId: string) { ... }
 * ```
 */
@Injectable()
export class B2CGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    const userId: string | undefined =
      request.headers?.["x-user-id"] ?? request.headers?.["X-User-Id"];

    if (userId) return true;

    throw new BaseAppError({
      message: "Missing Kong identity headers (X-User-Id). Route requires user authentication via Kong.",
      status: HTTP_STATUS.UNAUTHORIZED,
      code: BEARER_ERROR_CODE.MISSING_TOKEN,
      context: {},
    });
  }
}
