/* Copyright © 2021 Seneca Project Contributors, MIT License. */


function PluginTestProvider(this: any, _options: any) {
    const seneca: any = this
    const ZONE_BASE = 'provider/other/'

    // NOTE: sys- zone prefix is reserved.

    seneca
        .message('sys:provider,provider:other,get:info', get_info)
        .message('sys:provider,provider:other,get:info', do_stuff)


    async function get_info(this: any, msg: any) {
        return {
            ok: true,
            msg
        }
    }

    async function do_stuff(this: any, msg: any) {
        msg.here = true;
        return this.prior(this, msg);
    }


    return {
        exports: {
            native: () => ({})
        }
    }
}


// Default options.
const defaults = {

    // TODO: Enable debug logging
    debug: false
}


Object.assign(PluginTestProvider, {defaults})

export default PluginTestProvider

if ('undefined' !== typeof (module)) {
    module.exports = PluginTestProvider;
}
