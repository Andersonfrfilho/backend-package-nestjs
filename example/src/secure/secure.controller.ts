import { Controller, Get, UseGuards, Query } from '@nestjs/common';
import { Roles, RolesGuard } from '@adatechnology/auth-keycloak';

@Controller('secure')
@UseGuards(RolesGuard)
export class SecureController {
  @Get('public')
  public() {
    return { msg: 'public' };
  }

  @Get('admin')
  @Roles('admin')
  adminOnly() {
    return { msg: 'admin access granted' };
  }

  @Get('team')
  @Roles({ roles: ['manager', 'lead'], mode: 'all' })
  teamOnly() {
    return { msg: 'team access (manager+lead) granted' };
  }

  // helper route to test token presence (no role required)
  @Get('whoami')
  whoami(@Query('token') token?: string) {
    return { tokenProvided: !!token };
  }
}
