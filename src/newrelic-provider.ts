/* Copyright © 2021 Seneca Project Contributors, MIT License. */
import newrelic from 'newrelic';

type NewRelicProviderOptions = {};

type Spec = Record<any, any>

function changeSpec(spec: Spec, event: "inward" | "outward") {
    return {
        addSegments: () => {
            if(spec.ctx.actdef?.func) {
                const { func, pattern }: Record<string, any> = spec.ctx.actdef

                spec.ctx.actdef.func = (...args: any) => {
                    newrelic.startSegment(
                        pattern,
                        true,
                        function handler(endSegment) {
                            func(...args)
                            // include endSegment to context
                            let context = spec.ctx.seneca.context
                            context.shared = context.shared || {}
                            context.shared.endSegment = (context.shared.endSegment || endSegment)
                        },
                        function endSegment() {
                            console.log('end for action of pattern ' + spec.ctx.actdef.pattern)                          
                        }
                    )
                }

            }
        },
        endSegments: () => {
            let context = spec.ctx.seneca.context
            const endSegmentCb = context.shared?.endSegment
            if(endSegmentCb) {
                endSegmentCb()
            }
        },
        extractFromSpec: () => {

        }
    }
}

function PreloadNewrelicProvider(this: any, opts: any) {
    const seneca = this

    seneca.order.inward.add((spec: Spec) => {
        changeSpec(spec, 'inward').addSegments()
    })

    seneca.order.outward.add((spec: Spec) => {
        changeSpec(spec, 'outward').endSegments()
    })
}

function NewrelicProvider(this: any, _options: any) {
    const seneca: any = this
    const ZONE_BASE = 'provider/newrelic/'

    // NOTE: sys- zone prefix is reserved.

    const sleep = (millis: number) => new Promise(r=>setTimeout(r,millis))


    seneca
        .message('sys:provider,provider:newrelic,get:info', get_info)
        .message('m:1', async function m1(msg: any) {
            console.log('inside m1');
            await sleep(3000)
            const m = msg.m
            return { m: m * 2 }
        })


    async function get_info(this: any, _msg: any) {
        return {
            ok: true,
            name: 'newrelic',
            details: {
                sdk: 'newrelic'
            }
        }
    }

    seneca.prepare(async function (this: any) {
        // TODO: Check what need to be done to "boot" Newrelic
    })


    return {
        exports: {
            native: () => ({})
        }
    }
}


// Default options.
const defaults: NewRelicProviderOptions = {

    // TODO: Enable debug logging
    debug: false
}

function preload_newrelic(plugin: any) {
    /*
    const self = this;
    console.log('here', this);
    console.log(plugin);
    */
}

Object.assign(NewrelicProvider, {defaults})

export default NewrelicProvider

if ('undefined' !== typeof (module)) {
    module.exports = NewrelicProvider
    module.exports.preload = PreloadNewrelicProvider
}
