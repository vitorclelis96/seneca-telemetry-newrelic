/* Copyright © 2021-2022 Seneca Project Contributors, MIT License. */


import NewRelic from 'newrelic'

type NewRelicOptions = {};

type Spec = Record<any, any>


function addSegment(spec: Spec) {
  if (spec.ctx.actdef?.func) {
    const { ctx, data } = spec
    const pattern = ctx.actdef.pattern
    const origfunc = ctx.actdef.func
    const meta = data.meta
    const context = ctx.seneca.context
    
    if(ctx.actdef.func.$$newrelic_wrapped$$) {
      return
    }

    // ensure each action has it's own endSegment
    context.newrelic = context.newrelic || {}
    let endSegmentMap =
      (context.newrelic.endSegmentMap = context.newrelic.endSegmentMap || {})

    ctx.actdef.func = function(this: any, ...args: any) {
      const instance = this
      NewRelic.startSegment(
        pattern + '~' + origfunc.name,
        true,
        function handler(endSegmentHandler: any) {
          endSegmentMap[meta.mi] = (endSegmentMap[meta.mi] || {})
          endSegmentMap[meta.mi].endSegmentHandler = endSegmentHandler
          return origfunc.call(instance, ...args)
        },
        function endSegmentHandler() { }
      )

      ctx.actdef.func.$$newrelic_wrapped$$ = true;
    }

    Object.defineProperty(
      ctx.actdef.func, 'name', { value: 'newrelic_' + origfunc.name })
  }
}


function endSegment(spec: Spec) {
  const meta = spec.data.meta
  const context = spec.ctx.seneca.context
  const endSegmentMap = context.newrelic?.endSegmentMap
  if (endSegmentMap && endSegmentMap[meta.mi]) {
    const endSegmentHandler = endSegmentMap[meta.mi].endSegmentHandler
    if (endSegmentHandler) {
      delete endSegmentMap[meta.mi]
      endSegmentHandler()
    }
  }
}


function preload(this: any, _opts: any) {
  const seneca = this

  seneca.order.inward.add((spec: Spec) => addSegment(spec))
  seneca.order.outward.add((spec: Spec) => endSegment(spec))
}


function newrelic(this: any, _options: any) {
  // const seneca: any = this
}



// Default options.
const defaults: NewRelicOptions = {

  // TODO: Enable debug logging
  debug: false
}


Object.assign(newrelic, { defaults, preload })

export default newrelic

if ('undefined' !== typeof (module)) {
  module.exports = newrelic
}
