"use strict";
/* Copyright © 2021-2022 Seneca Project Contributors, MIT License. */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const newrelic_1 = __importDefault(require("newrelic"));
function addSegment(spec) {
    var _a;
    if ((_a = spec.ctx.actdef) === null || _a === void 0 ? void 0 : _a.func) {
        const { ctx, data } = spec;
        const pattern = ctx.actdef.pattern;
        const origfunc = ctx.actdef.func;
        const meta = data.meta;
        const context = ctx.seneca.context;
        if (ctx.actdef.func.$$newrelic_wrapped$$) {
            return;
        }
        // ensure each action has it's own endSegment
        context.newrelic = context.newrelic || {};
        let endSegmentMap = (context.newrelic.endSegmentMap = context.newrelic.endSegmentMap || {});
        ctx.actdef.func = function (...args) {
            const instance = this;
            newrelic_1.default.startSegment(pattern + '~' + origfunc.name, true, function handler(endSegmentHandler) {
                endSegmentMap[meta.mi] = (endSegmentMap[meta.mi] || {});
                endSegmentMap[meta.mi].endSegmentHandler = endSegmentHandler;
                return origfunc.call(instance, ...args);
            }, function endSegmentHandler() { });
            ctx.actdef.func.$$newrelic_wrapped$$ = true;
        };
        Object.defineProperty(ctx.actdef.func, 'name', { value: 'newrelic_' + origfunc.name });
    }
}
function endSegment(spec) {
    var _a;
    const meta = spec.data.meta;
    const context = spec.ctx.seneca.context;
    const endSegmentMap = (_a = context.newrelic) === null || _a === void 0 ? void 0 : _a.endSegmentMap;
    if (endSegmentMap && endSegmentMap[meta.mi]) {
        const endSegmentHandler = endSegmentMap[meta.mi].endSegmentHandler;
        if (endSegmentHandler) {
            delete endSegmentMap[meta.mi];
            endSegmentHandler();
        }
    }
}
function preload(_opts) {
    const seneca = this;
    seneca.order.inward.add((spec) => addSegment(spec));
    seneca.order.outward.add((spec) => endSegment(spec));
}
function newrelic(_options) {
    // const seneca: any = this
}
// Default options.
const defaults = {
    // TODO: Enable debug logging
    debug: false
};
Object.assign(newrelic, { defaults, preload });
exports.default = newrelic;
if ('undefined' !== typeof (module)) {
    module.exports = newrelic;
}
//# sourceMappingURL=newrelic.js.map