/**
 * Decorator para rastrear chamadas de métodos automaticamente
 * Funciona com qualquer provedor de tracing (agnóstico a fornecedor)
 *
 * Uso:
 * ```typescript
 * @Injectable()
 * export class MyService {
 *   constructor(private traceStack: ConfigurableTraceStackService) {}
 *
 *   @TraceMethod()
 *   async myMethod() {
 *     // Stack automatically tracked on entry/exit
 *   }
 * }
 * ```
 */
export function TraceMethod() {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const className = target.constructor.name;
    const methodName = `${className}.${propertyKey}`;

    descriptor.value = async function (...args: any[]) {
      const traceStack = (this as any).traceStack;

      if (traceStack) {
        traceStack.push(methodName);
        try {
          const result = originalMethod.apply(this, args);
          if (result instanceof Promise) {
            return await result;
          }
          return result;
        } finally {
          traceStack.pop();
        }
      } else {
        // Fallback se traceStack não disponível
        return await originalMethod.apply(this, args);
      }
    };

    return descriptor;
  };
}

/**
 * Alias para compatibilidade com código existente
 */
export const TraceMethodWithDI = TraceMethod;
