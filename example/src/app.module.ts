import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ExampleModule } from '@backend/package-nestjs';

@Module({
  imports: [
    // register the example library with options
    ExampleModule.forRoot({ prefix: 'demo', enabled: true }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
