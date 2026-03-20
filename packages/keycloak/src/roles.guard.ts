import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Inject,
  ForbiddenException,
  Optional,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ROLES_META_KEY, RolesOptions } from "./roles.decorator";
import { KEYCLOAK_CONFIG } from "./keycloak.token";
import type { KeycloakConfig } from "./keycloak.interface";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Optional() @Inject(KEYCLOAK_CONFIG) private readonly config?: KeycloakConfig,
  ) {}

  canActivate(context: ExecutionContext): boolean | Promise<boolean> {
    const meta =
      this.reflector.get<RolesOptions>(ROLES_META_KEY, context.getHandler()) ||
      this.reflector.get<RolesOptions>(ROLES_META_KEY, context.getClass());

    if (!meta || !meta.roles || meta.roles.length === 0) return true;

    const req = context.switchToHttp().getRequest();
    const authHeader = req.headers?.authorization || req.headers?.Authorization;
    const token = authHeader
      ? String(authHeader).split(" ")[1]
      : req.query?.token;

    if (!token)
      throw new ForbiddenException("Authorization token not provided");

    const payload = this.decodeJwtPayload(token);

    const availableRoles = new Set<string>();

    // realm roles
    if (
      payload?.realm_access?.roles &&
      Array.isArray(payload.realm_access.roles)
    ) {
      payload.realm_access.roles.forEach((r: string) => availableRoles.add(r));
    }

    // client roles (resource_access)
    const clientId = this.config?.credentials?.clientId;
    if (clientId && payload?.resource_access?.[clientId]?.roles) {
      payload.resource_access[clientId].roles.forEach((r: string) =>
        availableRoles.add(r),
      );
    }

    // also consider all client roles if type is 'both' and resource_access exists
    if (meta.type === "both" && payload?.resource_access) {
      Object.values(payload.resource_access).forEach((entry: any) => {
        if (entry?.roles && Array.isArray(entry.roles)) {
          entry.roles.forEach((r: string) => availableRoles.add(r));
        }
      });
    }

    // matching
    const required = meta.roles || [];
    const hasMatch = required.map((r) => availableRoles.has(r));

    const result =
      meta.mode === "all" ? hasMatch.every(Boolean) : hasMatch.some(Boolean);

    if (!result) throw new ForbiddenException("Insufficient roles");

    return true;
  }

  private decodeJwtPayload(token: string): any {
    try {
      const parts = token.split(".");
      if (parts.length < 2) return {};
      const payload = parts[1];
      const decoded = (globalThis as any).Buffer.from(
        payload,
        "base64",
      ).toString("utf8");
      return JSON.parse(decoded);
    } catch (e) {
      return {};
    }
  }
}

export default RolesGuard;
