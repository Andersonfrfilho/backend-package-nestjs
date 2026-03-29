import { Controller, Get, Query, Post, Body, Inject } from '@nestjs/common';
import { KeycloakDemoService } from './keycloak-demo.service';
import {
  LOGGER_PROVIDER,
  LoggerProviderInterface,
} from '@adatechnology/logger';
import { UseHttpRequestId } from '@adatechnology/http-client';

@Controller('keycloak')
@UseHttpRequestId()
export class KeycloakDemoController {
  constructor(
    private readonly svc: KeycloakDemoService,
    @Inject(LOGGER_PROVIDER) private readonly logger?: LoggerProviderInterface,
  ) {}

  @Get('token')
  async token() {
    const logContext = { className: KeycloakDemoController.name, methodName: 'token' };
    this.logger?.info({ message: 'KEYCLOAK TOKEN START', meta: { logContext }, context: 'KeycloakDemoController' });
    
    const access = await this.svc.getAccessToken();
    
    this.logger?.info({ message: 'KEYCLOAK TOKEN END', meta: { logContext }, context: 'KeycloakDemoController' });
    return { access_token: access };
  }

  @Get('userinfo')
  async userinfo(@Query('token') token: string) {
    const logContext = { className: KeycloakDemoController.name, methodName: 'userinfo' };
    this.logger?.info({ message: 'KEYCLOAK USERINFO START', meta: { logContext }, context: 'KeycloakDemoController' });
    
    if (!token) {
      this.logger?.warn({ message: 'KEYCLOAK USERINFO - token missing', meta: { logContext }, context: 'KeycloakDemoController' });
      return { error: 'token query param required' };
    }
    const info = await this.svc.getUserInfo(token);
    
    this.logger?.info({ message: 'KEYCLOAK USERINFO END', meta: { logContext }, context: 'KeycloakDemoController' });
    return info;
  }

  @Post('login')
  async login(@Body() body: { username?: string; password?: string }) {
    const logContext = { className: KeycloakDemoController.name, methodName: 'login' };
    const { username, password } = body || {};
    this.logger?.info({ message: 'KEYCLOAK LOGIN START', meta: { username, logContext }, context: 'KeycloakDemoController' });
    
    if (!username || !password) {
      this.logger?.warn({ message: 'KEYCLOAK LOGIN - missing credentials', meta: { logContext }, context: 'KeycloakDemoController' });
      return { error: 'username and password required in body' };
    }

    const tokenResponse = await this.svc.loginWithCredentials(username, password);
    
    this.logger?.info({ message: 'KEYCLOAK LOGIN END', meta: { username, logContext }, context: 'KeycloakDemoController' });
    return tokenResponse;
  }
}
