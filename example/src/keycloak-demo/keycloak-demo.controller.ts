import { Controller, Get, Query, Post, Body } from '@nestjs/common';
import { KeycloakDemoService } from './keycloak-demo.service';

@Controller('keycloak')
export class KeycloakDemoController {
  constructor(private readonly svc: KeycloakDemoService) {}

  @Get('token')
  async token() {
    const access = await this.svc.getAccessToken();
    return { access_token: access };
  }

  @Get('userinfo')
  async userinfo(@Query('token') token: string) {
    if (!token) return { error: 'token query param required' };
    const info = await this.svc.getUserInfo(token);
    return info;
  }

  @Post('login')
  async login(@Body() body: { username?: string; password?: string }) {
    const { username, password } = body || {};
    if (!username || !password) {
      return { error: 'username and password required in body' };
    }

    const tokenResponse = await this.svc.loginWithCredentials(username, password);
    return tokenResponse;
  }
}
