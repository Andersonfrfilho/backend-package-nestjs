import { Module } from '@nestjs/common';
import { HttpClientController } from './http-client.controller';
import { HttpModule } from '@adatechnology/http-client';

@Module({
  imports: [
    // configure the shared http module to point to PokeAPI
    HttpModule.forRoot({ baseURL: 'https://pokeapi.co/api/v2', timeout: 5000 }),
  ],
  controllers: [HttpClientController],
})
export class HttpClientModule {}
