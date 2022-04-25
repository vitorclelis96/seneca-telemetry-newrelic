/* Copyright © 2021 Seneca Project Contributors, MIT License. */


// TODO: namespace provider zone; needs seneca-entity feature

import Trello from 'trello'

type TrelloProviderOptions = {}

function TrelloProvider(this: any, _options: any) {
    const seneca: any = this
    const ZONE_BASE = 'provider/trello/'
    let trello: Trello

    // NOTE: sys- zone prefix is reserved.

    seneca
        .message('sys:provider,provider:trello,get:info', get_info)
        .message('role:entity,cmd:load,zone:provider,base:trello,name:card',
            load_card)
        .message('role:entity,cmd:save,zone:provider,base:github,name:card',
            update_card)


    async function get_info(this: any, _msg: any) {
        return {
            ok: true,
            name: 'trello',
            details: {
                sdk: 'trello'
            }
        }
    }

    async function load_card(this: any, msg: any) {
        let ent: any = null

        let q: any = msg.q
        let [boardId, cardId]: [string, string] = q.id.split('/')

        let res = await trello.getCard(boardId, cardId)

        if (res.id) {
            res.id = cardId
            ent = this.make$(ZONE_BASE + 'card').data$(res)
        }
        return ent
    }


    async function update_card(this: any, msg: any) {
        let ent: any = msg.ent
        let [cardId, field, value]: [string, string, string] = ent.id.split('/')
        let res = await trello.updateCard(cardId,
            field,
            value)

        if (res.id) {
            res.id = cardId
            ent = this.make$(ZONE_BASE + 'card').data$(res)
        }

        return ent
    }


    seneca.prepare(async function (this: any) {
        let apiKey = await this.post('sys:provider,get:key,provider:trello,key:api')
        let userToken = await this.post('sys:provider,get:key,provider:trello,key:user')
        let inTestMode = await this.post('sys:provider,get:key,provider:trello,key:test')
        if ((!apiKey.value || !userToken.value) && !inTestMode.value) {
            this.fail('api-key-missing/user-key-missing')
        }
        trello = new Trello(apiKey.value, userToken.value)
    })


    return {
        exports: {
            native: () => ({
                trello
            })
        }
    }
}


// Default options.
const defaults: TrelloProviderOptions = {

    // TODO: Enable debug logging
    debug: false
}


Object.assign(TrelloProvider, {defaults})

export default TrelloProvider

if ('undefined' !== typeof (module)) {
    module.exports = TrelloProvider
}
