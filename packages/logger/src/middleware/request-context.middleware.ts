import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { asyncLocalStorage } from '../context/async-context.service';
import { HEADERS_PARAMS } from '../request-id.constants';

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction) {
    const existing =
      (req.headers[HEADERS_PARAMS.REQUEST_ID] as string) ||
      (req.headers[HEADERS_PARAMS.FALLBACKS[0]] as string);
    const id = existing || (randomUUID ? randomUUID() : `${Date.now()}-${Math.random()}`);
    // Run the rest of the request inside the async local storage context
    asyncLocalStorage.run({ requestId: id }, () => next());
  }
}
