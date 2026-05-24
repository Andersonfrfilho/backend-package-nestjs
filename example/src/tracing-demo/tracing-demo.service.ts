import { Injectable, Inject } from '@nestjs/common';
import { LOGGER_PROVIDER, LoggerProviderInterface } from '@adatechnology/logger';
import { TraceMethod } from '../shared/decorators/trace-method.decorator';

@Injectable()
export class TracingDemoService {
  constructor(@Inject(LOGGER_PROVIDER) private logger: LoggerProviderInterface) {}

  @TraceMethod()
  async processOrder(orderId: string) {
    this.logger.info({
      message: 'Processing order',
      context: `${this.constructor.name}.processOrder`,
      meta: { orderId },
    });

    const customer = await this.getCustomerForOrder(orderId);

    this.logger.info({
      message: 'Order processed successfully',
      context: `${this.constructor.name}.processOrder`,
      meta: { orderId, customerId: customer.customerId },
    });

    return { orderId, customer };
  }

  @TraceMethod()
  private async getCustomerForOrder(orderId: string) {
    this.logger.debug({
      message: 'Fetching customer for order',
      context: `${this.constructor.name}.getCustomerForOrder`,
      meta: { orderId },
    });

    const customerId = await this.getCustomerId(orderId);
    return { customerId, name: 'John Doe' };
  }

  @TraceMethod()
  private async getCustomerId(orderId: string): Promise<string> {
    this.logger.debug({
      message: 'Extracting customer ID',
      context: `${this.constructor.name}.getCustomerId`,
      meta: { orderId },
    });

    return `customer-${orderId}`;
  }
}
