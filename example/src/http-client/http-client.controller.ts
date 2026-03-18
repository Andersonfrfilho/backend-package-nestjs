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
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Inject } from '@nestjs/common';
import { HTTP_PROVIDER } from '@adatechnology/http-client';
import type { HttpProviderInterface } from '@adatechnology/http-client';

let lastRequestInterceptorId: number | null = null;
let lastResponseInterceptorId: number | null = null;

@Controller('http-client')
export class HttpClientController {
  constructor(
    @Inject(HTTP_PROVIDER) private readonly http: HttpProviderInterface,
  ) {}

  @Get('pokemon')
  async listPokemon() {
    const res = await this.http.get('/pokemon?limit=20');
    return res.data;
  }

  @Get('pokemon/:id')
  async getOne(@Param('id') id: string) {
    const res = await this.http.get(`/pokemon/${id}`);
    return res.data;
  }

  // PokeAPI is read-only; keep create/modify/delete endpoints as examples
  @Post('post')
  async create(@Body() body: any) {
    const res = await this.http.post('/pokemon', body).catch((e) => e);
    return { status: res?.status ?? 500, data: res?.data };
  }

  @Put('put/:id')
  async replace(@Param('id') id: string, @Body() body: any) {
    const res = await this.http.put(`/pokemon/${id}`, body).catch((e) => e);
    return { status: res?.status ?? 500, data: res?.data };
  }

  @Patch('patch/:id')
  async modify(@Param('id') id: string, @Body() body: any) {
    const res = await this.http.patch(`/pokemon/${id}`, body).catch((e) => e);
    return { status: res?.status ?? 500, data: res?.data };
  }

  @Delete('delete/:id')
  async remove(@Param('id') id: string) {
    const res = await this.http.delete(`/pokemon/${id}`).catch((e) => e);
    return { status: res?.status ?? 500 };
  }

  @Head('head')
  async headReq(): Promise<{ status: number; headers: Record<string, any> }> {
    const res = await this.http.head('/pokemon');
    return {
      status: res.status,
      headers: res.headers as unknown as Record<string, any>,
    };
  }

  @Options('options')
  async optionsReq() {
    const res = await this.http.options('/pokemon');
    return { status: res.status };
  }

  // Observable example
  @Get('get-observable')
  getObservable(): Observable<any> {
    return this.http.get$('/pokemon');
  }

  @Post('set-base-url')
  async setBaseUrl(@Body() body: { baseURL: string }) {
    this.http.setBaseUrl(body.baseURL);
    return { baseURL: body.baseURL };
  }

  @Post('set-token')
  async setToken(@Body() body: { token: string; type?: string }) {
    const t = body.type ?? 'Bearer';
    this.http.setAuthToken(body.token, t);
    return { auth: `${t} ${body.token}` };
  }

  @Post('clear-token')
  async clearToken() {
    this.http.clearAuthToken();
    return { ok: true };
  }

  @Post('add-interceptors')
  addInterceptors() {
    lastRequestInterceptorId = this.http.addRequestInterceptor((cfg) => {
      cfg.headers = cfg.headers || {};
      cfg.headers['X-Example-Request'] = '1';
      return cfg;
    });

    lastResponseInterceptorId = this.http.addResponseInterceptor((res) => {
      res.config.__receivedAt = Date.now();
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

  @Get('code-samples')
  codeSamples() {
    return {
      forRoot: `import { HttpModule } from '@adatechnology/http-client';\\n\\nimports: [HttpModule.forRoot({ baseURL: 'https://pokeapi.co/api/v2' })]`,
      explicit: `import { HttpImplementationAxiosModule } from '@adatechnology/http-client';\\n\\nimports: [HttpImplementationAxiosModule.forRoot({ baseURL: 'https://pokeapi.co/api/v2' }), HttpModule.forRoot()]`,
      interceptors: `const id = httpProvider.addRequestInterceptor(config => { config.headers['X-Id']='1'; return config; }); httpProvider.removeRequestInterceptor(id);`,
    };
  }
}
