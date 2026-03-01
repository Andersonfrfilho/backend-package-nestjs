import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ExampleModule } from '@backend/package-nestjs';

@Module({
  imports: [ExampleModule.forRoot({ prefix: 'example', enabled: true })],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
