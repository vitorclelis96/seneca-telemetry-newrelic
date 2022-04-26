/* Copyright © 2021 Seneca Project Contributors, MIT License. */

type NewRelicProviderOptions = {};

function NewrelicProvider(this: any, _options: any) {
    const seneca: any = this
    const ZONE_BASE = 'provider/newrelic/'

    // NOTE: sys- zone prefix is reserved.

    seneca
        .message('sys:provider,provider:newrelic,get:info', get_info)


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


Object.assign(NewrelicProvider, {defaults})

export default NewrelicProvider

if ('undefined' !== typeof (module)) {
    module.exports = NewrelicProvider
}
