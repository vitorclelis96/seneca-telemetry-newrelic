import NewRelic from 'newrelic'
import { Spec } from '../types'

type SegmentShim = {
  add_segment: (spec: Spec) => void
  end_segment: (spec: Spec) => void
  remove_segment: (spec: Spec) => void
} 

function shim(): SegmentShim {
  let origfunc: Function

  function add_segment(spec: Spec) {
    if (spec.ctx.actdef?.func) {
      const { ctx, data } = spec
      const pattern = ctx.actdef.pattern
      origfunc = ctx.actdef.func
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
  
      }

      ctx.actdef.func.$$newrelic_wrapped$$ = true
      
      Object.defineProperty(
        ctx.actdef.func, 'name', { value: 'newrelic_' + origfunc.name })
    }
  }
  
  function end_segment(spec: Spec) {
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
  
  function remove_segment(spec: Spec) {
    const { ctx, data } = spec
    if(ctx.actdef.func.$$newrelic_wrapped$$) {
      spec.ctx.actdef.func = origfunc
    }
  }

  return {
    add_segment,
    end_segment,
    remove_segment,
  }
}

export { shim }

export type { SegmentShim }
