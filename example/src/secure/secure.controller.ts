import { Controller, Get, Headers, UseGuards } from '@nestjs/common';
import { BearerTokenGuard, Roles, RolesGuard } from '@adatechnology/auth-keycloak';

@Controller('secure')
export class SecureController {
  /** Public route — no authentication required */
  @Get('public')
  public() {
    return { msg: 'public' };
  }

  /**
   * Role-only guard (no token introspection).
   * Suitable for internal routes where the token is already trusted upstream.
   */
  @Get('admin')
  @Roles('admin')
  @UseGuards(RolesGuard)
  adminOnly() {
    return { msg: 'admin access granted' };
  }

  /**
   * Full B2B guard stack:
   *  1. BearerTokenGuard — validates token via Keycloak introspection (401 on failure)
   *  2. RolesGuard       — checks roles from decoded JWT payload  (403 on failure)
   *
   * Use this pattern for service-to-service routes that accept an X-User-Id header
   * injected by an upstream authenticated service (BFF, worker, cron, etc.).
   */
  @Get('b2b')
  @Roles('manage-requests')
  @UseGuards(BearerTokenGuard, RolesGuard)
  b2bRoute(@Headers('x-user-id') keycloakId: string) {
    return { msg: 'b2b access granted', keycloakId };
  }

  /** AND mode — requires all listed roles simultaneously */
  @Get('team')
  @Roles({ roles: ['manager', 'lead'], mode: 'all' })
  @UseGuards(BearerTokenGuard, RolesGuard)
  teamOnly() {
    return { msg: 'team access (manager+lead) granted' };
  }
}
