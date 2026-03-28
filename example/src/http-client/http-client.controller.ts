import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Head,
  Options,
  Body,
  Param,
  Headers,
  HttpException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Inject } from '@nestjs/common';
import {
  HTTP_PROVIDER,
  HttpMethod,
  UseHttpRequestId,
} from '@adatechnology/http-client';
import type { HttpProviderInterface } from '@adatechnology/http-client';

let lastRequestInterceptorId: number | null = null;
let lastResponseInterceptorId: number | null = null;
let lastErrorInterceptorId: number | null = null;

@Controller('http-client')
@UseHttpRequestId()
export class HttpClientController {
  constructor(
    @Inject(HTTP_PROVIDER) private readonly http: HttpProviderInterface,
  ) {}

  @Get('pokemon')
  async listPokemon() {
    const res = await this.http.get({
      url: '/pokemon?limit=20',
      config: {
        logContext: {
          className: HttpClientController.name,
          methodName: this.listPokemon.name,
        },
      },
    });
    return res.data;
  }

  @Get('pokemon/:id')
  async getOne(@Param('id') id: string) {
    const res = await this.http.get({
      url: `/pokemon/${id}`,
      config: {
        logContext: {
          className: HttpClientController.name,
          methodName: this.getOne.name,
        },
      },
    });
    return res.data;
  }

  @Get('pokemon/:id/with-request-id')
  async getOneWithRequestId(
    @Param('id') id: string,
    @Headers('x-request-id') requestId?: string,
  ) {
    try {
      const res = await this.http.get({
        url: `/pokemon/${id}`,
        config: {
          headers: requestId ? { 'x-request-id': requestId } : undefined,
          logContext: {
            className: HttpClientController.name,
            methodName: this.getOneWithRequestId.name,
            requestId,
          },
        },
      });
      return res.data;
    } catch (error: any) {
      throw new HttpException(
        error?.message || 'Erro no cliente HTTP',
        error?.status || 500,
      );
    }
  }

  // PokeAPI is read-only; keep create/modify/delete endpoints as examples
  @Post('post')
  async create(@Body() body: any) {
    const res = await this.http.post({ url: '/pokemon', data: body }).catch((e) => e);
    return { status: res?.status ?? 500, data: res?.data };
  }

  @Put('put/:id')
  async replace(@Param('id') id: string, @Body() body: any) {
    const res = await this.http.put({ url: `/pokemon/${id}`, data: body }).catch((e) => e);
    return { status: res?.status ?? 500, data: res?.data };
  }

  @Patch('patch/:id')
  async modify(@Param('id') id: string, @Body() body: any) {
    const res = await this.http.patch({ url: `/pokemon/${id}`, data: body }).catch((e) => e);
    return { status: res?.status ?? 500, data: res?.data };
  }

  @Delete('delete/:id')
  async remove(@Param('id') id: string) {
    const res = await this.http.delete({ url: `/pokemon/${id}` }).catch((e) => e);
    return { status: res?.status ?? 500 };
  }

  @Head('head')
  async headReq(): Promise<{ status: number; headers: Record<string, any> }> {
    const res = await this.http.head({ url: '/pokemon' });
    return {
      status: res.status,
      headers: res.headers as unknown as Record<string, any>,
    };
  }

  @Options('options')
  async optionsReq() {
    const res = await this.http.options({ url: '/pokemon' });
    return { status: res.status };
  }

  // Observable example
  @Get('get-observable')
  getObservable(): Observable<any> {
    return this.http.get$({ url: '/pokemon' });
  }

  @Get('request-generic')
  async requestGeneric() {
    const res = await this.http.request({
      method: HttpMethod.GET,
      url: '/pokemon',
      params: { limit: 5 },
      logContext: {
        className: HttpClientController.name,
        methodName: this.requestGeneric.name,
      },
    });
    return res.data;
  }

  @Get('request-observable')
  requestObservable(): Observable<any> {
    return this.http.request$({
      method: HttpMethod.GET,
      url: '/pokemon',
      params: { limit: 5 },
      logContext: {
        className: HttpClientController.name,
        methodName: this.requestObservable.name,
      },
    });
  }

  @Get('demo/decorator-controller')
  async demoDecoratorController() {
    const res = await this.http.get({ url: '/pokemon/1' });
    return {
      decoratorScope: 'controller',
      pokemon: res.data,
    };
  }

  @Get('demo/decorator-method')
  @UseHttpRequestId({ headerName: 'x-request-id', autoGenerateIfMissing: true })
  async demoDecoratorMethod() {
    const res = await this.http.get({ url: '/pokemon/2' });
    return {
      decoratorScope: 'method',
      pokemon: res.data,
    };
  }

  @Post('set-base-url')
  async setBaseUrl(@Body() body: { baseURL: string }) {
    this.http.setBaseUrl(body.baseURL);
    return { baseURL: body.baseURL };
  }

  @Get('get-base-url')
  getBaseUrl() {
    return { baseURL: this.http.getBaseUrl() };
  }

  @Post('set-timeout')
  setTimeout(@Body() body: { timeout: number }) {
    this.http.setDefaultTimeout(body.timeout);
    return { timeout: body.timeout };
  }

  @Post('set-global-header')
  setGlobalHeader(@Body() body: { key: string; value: string }) {
    this.http.setGlobalHeader({ key: body.key, value: body.value });
    return { key: body.key, value: body.value };
  }

  @Post('remove-global-header')
  removeGlobalHeader(@Body() body: { key: string }) {
    this.http.removeGlobalHeader(body.key);
    return { removed: body.key };
  }

  @Get('global-headers')
  getGlobalHeaders() {
    return this.http.getGlobalHeaders();
  }

  @Post('set-token')
  async setToken(@Body() body: { token: string; type?: string }) {
    const t = body.type ?? 'Bearer';
    this.http.setAuthToken({ token: body.token, type: t });
    return { auth: `${t} ${body.token}` };
  }

  @Post('clear-token')
  async clearToken() {
    this.http.clearAuthToken();
    return { ok: true };
  }

  @Post('add-interceptors')
  addInterceptors() {
    lastRequestInterceptorId = this.http.addRequestInterceptor((cfg: any) => {
      cfg.headers = cfg.headers || {};
      cfg.headers['X-Example-Request'] = '1';
      return cfg;
    });

    lastResponseInterceptorId = this.http.addResponseInterceptor((res: any) => {
      res.config = res.config || {};
      (res.config as any).__receivedAt = Date.now();
      return res;
    });

    return {
      requestId: lastRequestInterceptorId,
      responseId: lastResponseInterceptorId,
    };
  }

  @Post('remove-interceptors')
  removeInterceptors() {
    if (lastRequestInterceptorId != null)
      this.http.removeRequestInterceptor(lastRequestInterceptorId);
    if (lastResponseInterceptorId != null)
      this.http.removeResponseInterceptor(lastResponseInterceptorId);
    lastRequestInterceptorId = null;
    lastResponseInterceptorId = null;
    return { removed: true };
  }

  @Post('add-error-interceptor')
  addErrorInterceptor() {
    lastErrorInterceptorId = this.http.addErrorInterceptor((error: any) => {
      if (error && typeof error === 'object') {
        (error as any).__handledByExample = true;
      }
      return error;
    });

    return { errorInterceptorId: lastErrorInterceptorId };
  }

  @Post('remove-error-interceptor')
  removeErrorInterceptor() {
    if (lastErrorInterceptorId != null) {
      this.http.removeErrorInterceptor(lastErrorInterceptorId);
      const removedId = lastErrorInterceptorId;
      lastErrorInterceptorId = null;
      return { removed: true, errorInterceptorId: removedId };
    }

    return { removed: false };
  }

  @Post('clear-cache')
  clearCache(@Body() body?: { key?: string }) {
    this.http.clearCache(body?.key);
    return { cleared: body?.key ?? 'all' };
  }

  @Get('cache-demo')
  async cacheDemo() {
    const first = await this.http.get({
      url: '/pokemon/1',
      config: {
        cache: true,
        cacheTtl: 10000,
        logContext: {
          className: HttpClientController.name,
          methodName: this.cacheDemo.name,
        },
      },
    });

    const second = await this.http.get({
      url: '/pokemon/1',
      config: {
        cache: true,
        cacheTtl: 10000,
        logContext: {
          className: HttpClientController.name,
          methodName: this.cacheDemo.name,
        },
      },
    });

    return {
      firstStatus: first.status,
      secondStatus: second.status,
      samePayload: JSON.stringify(first.data) === JSON.stringify(second.data),
    };
  }

  @Get('code-samples')
  codeSamples() {
    return {
      forRoot: `import { HttpModule } from '@adatechnology/http-client';\\n\\nimports: [HttpModule.forRoot(\\n  { baseURL: 'https://pokeapi.co/api/v2' },\\n  {\\n    logging: {\\n      enabled: true,\\n      environments: ['development', 'test'],\\n      types: ['request', 'response', 'error'],\\n      includeHeaders: true,\\n      includeBody: false,\\n      context: 'HttpClientExample',\\n    },\\n  },\\n)]`,
      explicit: `import { HttpImplementationAxiosModule } from '@adatechnology/http-client';\\n\\nimports: [HttpImplementationAxiosModule.forRoot({ baseURL: 'https://pokeapi.co/api/v2' }), HttpModule.forRoot()]`,
      logContext: `await httpProvider.get('/pokemon/1', {\\n  logContext: {\\n    className: 'PokemonService',\\n    methodName: 'findOne',\\n    requestId: 'req-123',\\n  },\\n});`,
      interceptors: `const id = httpProvider.addRequestInterceptor(config => { config.headers['X-Id']='1'; return config; }); httpProvider.removeRequestInterceptor(id);`,
      genericRequest: `await httpProvider.request({ method: 'GET', url: '/pokemon', params: { limit: 5 } });`,
      globalHeader: `httpProvider.setGlobalHeader('X-Tenant-Id', 'tenant-01');\\nconst headers = httpProvider.getGlobalHeaders();\\nhttpProvider.removeGlobalHeader('X-Tenant-Id');`,
      errorInterceptor: `const id = httpProvider.addErrorInterceptor(err => { err.__handledByExample = true; return err; });\\nhttpProvider.removeErrorInterceptor(id);`,
      cache: `await httpProvider.get('/pokemon/1', { cache: true, cacheTtl: 10000 });\\nhttpProvider.clearCache();`,
    };
  }
}
