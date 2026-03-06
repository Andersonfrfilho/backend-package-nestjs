"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var ExampleModule_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExampleModule = exports.createExampleServiceToken = exports.createExampleOptionsToken = exports.EXAMPLE_LIB = exports.EXAMPLE_SERVICE_PROVIDE = exports.EXAMPLE_OPTIONS_TOKEN = void 0;
const common_1 = require("@nestjs/common");
const shared_service_1 = require("./shared.service");
exports.EXAMPLE_OPTIONS_TOKEN = "EXAMPLE_OPTIONS";
exports.EXAMPLE_SERVICE_PROVIDE = "EXAMPLE_SERVICE_PROVIDE";
exports.EXAMPLE_LIB = "EXAMPLE_LIB";
const createExampleOptionsToken = (name) => name ? `${exports.EXAMPLE_OPTIONS_TOKEN}_${name}` : exports.EXAMPLE_OPTIONS_TOKEN;
exports.createExampleOptionsToken = createExampleOptionsToken;
const createExampleServiceToken = (name) => name ? `${exports.EXAMPLE_SERVICE_PROVIDE}_${name}` : exports.EXAMPLE_SERVICE_PROVIDE;
exports.createExampleServiceToken = createExampleServiceToken;
let ExampleModule = ExampleModule_1 = class ExampleModule {
    static forRoot(options) {
        console.log("[ExampleModule.forRoot] options:", options);
        const opts = {
            provide: exports.EXAMPLE_OPTIONS_TOKEN,
            useValue: options ?? {},
        };
        return {
            module: ExampleModule_1,
            global: true,
            providers: [
                opts,
                {
                    provide: exports.EXAMPLE_SERVICE_PROVIDE,
                    useFactory: (sOptions) => new shared_service_1.ExampleService(sOptions),
                    inject: [exports.EXAMPLE_OPTIONS_TOKEN],
                },
            ],
            exports: [exports.EXAMPLE_SERVICE_PROVIDE],
        };
    }
    static register(name, options) {
        const optionsToken = (0, exports.createExampleOptionsToken)(name);
        const serviceToken = (0, exports.createExampleServiceToken)(name);
        const opts = {
            provide: optionsToken,
            useValue: options ?? {},
        };
        return {
            module: ExampleModule_1,
            providers: [
                opts,
                {
                    provide: serviceToken,
                    useFactory: (sOptions) => new shared_service_1.ExampleService(sOptions),
                    inject: [optionsToken],
                },
            ],
            exports: [serviceToken],
        };
    }
    static forRootAsync(opts) {
        const optionsProvider = {
            provide: exports.EXAMPLE_OPTIONS_TOKEN,
            useFactory: opts.useFactory,
            inject: opts.inject || [],
        };
        return {
            module: ExampleModule_1,
            global: true,
            providers: [
                optionsProvider,
                {
                    provide: exports.EXAMPLE_SERVICE_PROVIDE,
                    useFactory: (sOptions) => new shared_service_1.ExampleService(sOptions),
                    inject: [exports.EXAMPLE_OPTIONS_TOKEN],
                },
            ],
            exports: [exports.EXAMPLE_SERVICE_PROVIDE],
        };
    }
};
exports.ExampleModule = ExampleModule;
exports.ExampleModule = ExampleModule = ExampleModule_1 = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({})
], ExampleModule);
//# sourceMappingURL=shared.module.js.map