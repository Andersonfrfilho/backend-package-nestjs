import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { asyncLocalStorage } from '../context/async-context.service';

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction) {
    const existing = (req.headers['x-request-id'] as string) || (req.headers['x-correlation-id'] as string);
    const id = existing || (randomUUID ? randomUUID() : `${Date.now()}-${Math.random()}`);
    // Run the rest of the request inside the async local storage context
    asyncLocalStorage.run({ requestId: id }, () => next());
  }
}
