import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Inject,
  Optional,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ROLES_META_KEY, RolesOptions } from "./roles.decorator";
import { KEYCLOAK_CONFIG } from "./keycloak.token";
import type { KeycloakConfig } from "./keycloak.interface";
import type { KeycloakJwtPayload } from "./keycloak.interface";
import { BaseAppError } from "@adatechnology/shared";
import { HTTP_STATUS, ROLES_ERROR_CODE } from "./keycloak.constants";

/**
 * Guard that checks whether the current request has the required roles.
 *
 * Supports two auth paths transparently:
 *
 * 1. **Kong path** (user-facing, preferred):
 *    Kong validates the token, removes Authorization, and injects:
 *    - `X-User-Id`    — keycloak sub
 *    - `X-User-Roles` — comma-separated realm roles
 *    The guard reads roles from `X-User-Roles` header.
 *
 * 2. **B2B path** (service-to-service, e.g. BFF → API):
 *    The caller sends a service account JWT in the Authorization header.
 *    The guard decodes the JWT locally and reads `realm_access.roles`.
 *
 * Priority: Kong header → JWT fallback.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    @Inject(Reflector)
    private readonly reflector: Reflector,
    @Optional()
    @Inject(KEYCLOAK_CONFIG)
    private readonly config?: KeycloakConfig,
  ) {}

  canActivate(context: ExecutionContext): boolean | Promise<boolean> {
    const meta =
      this.reflector.get<RolesOptions>(ROLES_META_KEY, context.getHandler()) ||
      this.reflector.get<RolesOptions>(ROLES_META_KEY, context.getClass());

    if (!meta || !meta.roles || meta.roles.length === 0) return true;

    const req = context.switchToHttp().getRequest();
    const required = meta.roles;
    const availableRoles = new Set<string>();

    // ── Path 1: Kong-injected header (preferred) ──────────────────────────
    const kongRolesHeader: string | undefined =
      req.headers?.["x-user-roles"] || req.headers?.["X-User-Roles"];

    if (kongRolesHeader) {
      kongRolesHeader
        .split(",")
        .map((r: string) => r.trim())
        .filter(Boolean)
        .forEach((r: string) => availableRoles.add(r));
    } else {
      // ── Path 2: B2B — decode JWT from Authorization header ───────────────
      const authHeader = req.headers?.authorization || req.headers?.Authorization;
      const token = authHeader
        ? String(authHeader).split(" ")[1]
        : req.query?.token;

      if (!token) {
        throw new BaseAppError({
          message: "Authorization token not provided",
          status: HTTP_STATUS.FORBIDDEN,
          code: ROLES_ERROR_CODE.MISSING_TOKEN,
          context: {},
        });
      }

      const payload = this.decodeJwtPayload(token);

      if (payload?.realm_access?.roles && Array.isArray(payload.realm_access.roles)) {
        payload.realm_access.roles.forEach((r: string) => availableRoles.add(r));
      }

      const clientId = this.config?.credentials?.clientId;
      if (clientId && payload?.resource_access?.[clientId]?.roles) {
        payload.resource_access[clientId].roles!.forEach((r: string) =>
          availableRoles.add(r),
        );
      }

      if (meta.type === "both" && payload?.resource_access) {
        Object.values(payload.resource_access).forEach((entry) => {
          if (entry?.roles && Array.isArray(entry.roles)) {
            (entry.roles as string[]).forEach((r: string) => availableRoles.add(r));
          }
        });
      }
    }

    // ── Role matching ─────────────────────────────────────────────────────
    const hasMatch = required.map((r) => availableRoles.has(r));
    const result =
      meta.mode === "all" ? hasMatch.every(Boolean) : hasMatch.some(Boolean);

    if (!result) {
      throw new BaseAppError({
        message: "Insufficient roles",
        status: HTTP_STATUS.FORBIDDEN,
        code: ROLES_ERROR_CODE.INSUFFICIENT_ROLES,
        context: { required },
      });
    }

    return true;
  }

  private decodeJwtPayload(token: string): KeycloakJwtPayload {
    try {
      const parts = token.split(".");
      if (parts.length < 2) return {};
      const payload = parts[1];
      const BufferCtor = (
        globalThis as unknown as {
          Buffer?: {
            from: (input: string, encoding: string) => { toString: (enc: string) => string };
          };
        }
      ).Buffer;
      if (!BufferCtor) return {};
      const decoded = BufferCtor.from(payload, "base64").toString("utf8");
      return JSON.parse(decoded) as KeycloakJwtPayload;
    } catch {
      return {};
    }
  }
}
