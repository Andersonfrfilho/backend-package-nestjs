import { Injectable } from '@nestjs/common';
import { ConfigurableTraceStackService, TraceMethod } from '@adatechnology/shared';

/**
 * Serviço de demonstração do novo sistema de tracing configurável
 */
@Injectable()
export class TracingDemoService {
  constructor(private traceStack: ConfigurableTraceStackService) {}

  /**
   * Simula uma operação com múltiplas camadas
   * Demonstra como o call stack é rastreado automaticamente
   */
  @TraceMethod()
  async processOrder(orderId: string) {
    console.log(`[TracingDemo] Call stack: ${this.traceStack.getStackFormatted()}`);
    console.log(`[TracingDemo] Depth: ${this.traceStack.getDepth()}`);

    // Chama método que também tem @TraceMethod
    const customer = await this.getCustomerForOrder(orderId);
    return { orderId, customer };
  }

  @TraceMethod()
  private async getCustomerForOrder(orderId: string) {
    console.log(`[TracingDemo] Call stack: ${this.traceStack.getStackFormatted()}`);
    console.log(`[TracingDemo] Depth: ${this.traceStack.getDepth()}`);

    // Chama método mais profundo
    const customerId = await this.getCustomerId(orderId);
    return { customerId, name: 'John Doe' };
  }

  @TraceMethod()
  private async getCustomerId(orderId: string): Promise<string> {
    console.log(`[TracingDemo] Call stack: ${this.traceStack.getStackFormatted()}`);
    console.log(`[TracingDemo] Depth: ${this.traceStack.getDepth()}`);
    console.log(`[TracingDemo] Current method: ${this.traceStack.getCurrentMethod()}`);
    console.log(`[TracingDemo] Parent method: ${this.traceStack.getParentMethod()}`);

    return `customer-${orderId}`;
  }

  /**
   * Teste simples sem decorador (stack deve ser vazio)
   */
  testEmptyStack() {
    console.log(`[TracingDemo] Stack when no decorator: ${this.traceStack.getStackFormatted()}`);
    console.log(`[TracingDemo] Should be empty: "${this.traceStack.getStackFormatted() === ''}"`);
  }
}
