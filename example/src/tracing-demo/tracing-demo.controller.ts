import { Controller, Get, Param, Inject } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { TracingDemoService } from './tracing-demo.service';
import { TracingFactoryService, ConfigurableTraceStackService } from '@adatechnology/shared';

/**
 * Controller para testar o novo sistema de tracing configurável
 *
 * Endpoints:
 * - GET /tracing/status - Status do provedor de tracing
 * - GET /tracing/order/:orderId - Testa rastreamento de call stack
 * - GET /tracing/test-empty-stack - Testa stack vazio sem decoradores
 */
@Controller('tracing')
export class TracingDemoController {
  constructor(
    private tracingDemo: TracingDemoService,
    private tracingFactory: TracingFactoryService,
    private traceStack: ConfigurableTraceStackService,
    @Inject(REQUEST) private request: Request,
  ) {}

  /**
   * Verifica qual provedor de tracing está ativo
   */
  @Get('status')
  getTracingStatus() {
    const providerName = this.tracingFactory.getCurrentProviderName();
    const requestId = (this.request as any).requestId;

    return {
      message: 'Tracing Status',
      provider: providerName,
      requestId,
      availableProviders: ['opentelemetry', 'datadog', 'cloudtrace', 'none'],
      instructions: 'Set TRACING_PROVIDER env var to switch providers',
    };
  }

  /**
   * Testa o rastreamento de call stack
   */
  @Get('order/:orderId')
  async processOrder(@Param('orderId') orderId: string) {
    const requestId = (this.request as any).requestId;

    console.log(`\n=== TRACING TEST START ===`);
    console.log(`Request ID: ${requestId}`);
    console.log(`Provider: ${this.tracingFactory.getCurrentProviderName()}`);
    console.log(`Initial stack: "${this.traceStack.getStackFormatted()}"`);

    const result = await this.tracingDemo.processOrder(orderId);

    console.log(`Final stack: "${this.traceStack.getStackFormatted()}"`);
    console.log(`=== TRACING TEST END ===\n`);

    return {
      message: 'Order processed with call stack tracing',
      requestId,
      provider: this.tracingFactory.getCurrentProviderName(),
      result,
      testDetails: {
        orderId,
        stackTracked: true,
        decoratorsUsed: 3,
        callDepthObserved: 'TracingDemoController.processOrder → TracingDemoService.processOrder → getCustomerForOrder → getCustomerId',
      },
    };
  }

  /**
   * Testa se stack fica vazio quando não há decoradores
   */
  @Get('test-empty-stack')
  testEmptyStack() {
    const requestId = (this.request as any).requestId;

    console.log(`\n=== EMPTY STACK TEST ===`);
    this.tracingDemo.testEmptyStack();
    console.log(`=== TEST END ===\n`);

    return {
      message: 'Empty stack test completed (check console logs)',
      requestId,
      provider: this.tracingFactory.getCurrentProviderName(),
      expectedBehavior: 'Stack should be empty when methods have no @TraceMethod decorator',
    };
  }
}
