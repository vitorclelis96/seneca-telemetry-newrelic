/* Copyright © 2021 Seneca Project Contributors, MIT License. */

import * as Fs from 'fs'

import TrelloProvider from '../src/trello-provider'


const Seneca = require('seneca')
const SenecaMsgTest = require('seneca-msg-test')
const TrelloProviderMessages = require('./trello-provider.messages').default

const CONFIG: any = {}
let missingKeys = true
if (Fs.existsSync(__dirname + '/local-config.js')) {
    Object.assign(CONFIG, require(__dirname + '/local-config.js'))
    missingKeys = false
}

jest.setTimeout(10000)

describe('trello-provider', () => {

    test('happy', async () => {
        const seneca = Seneca({legacy: false})
            .test()
            .use('promisify')
            .use('provider', {
                provider: {
                    trello: {
                        keys: {
                            api: {
                                value: CONFIG.key,
                            },
                            user: {
                                value: CONFIG.token
                            },
                            test: {
                                value: missingKeys
                            }
                        }
                    }
                }
            })
            .use(TrelloProvider)
        await seneca.ready()
    })


    test('messages', async () => {
        const seneca = Seneca({legacy: false})
            .test()
            .use('promisify')
            .use('provider', {
                provider: {
                    trello: {
                        keys: {
                            api: {
                                value: CONFIG.key,
                            },
                            user: {
                                value: CONFIG.token
                            },
                            test: {
                                value: missingKeys
                            }
                        }
                    }
                }
            })
            .use(TrelloProvider)
        await (SenecaMsgTest(seneca, TrelloProviderMessages)())
    })


    test('native', async () => {
        if (!missingKeys) {
            const seneca = Seneca({legacy: false})
                .test()
                .use('promisify')
                .use('provider', {
                    provider: {
                        trello: {
                            keys: {
                                api: {
                                    value: CONFIG.key,
                                },
                                user: {
                                    value: CONFIG.token
                                },
                            }
                        }
                    }
                })
                .use(TrelloProvider)
            await seneca.ready()

            let native = seneca.export('TrelloProvider/native')
            expect(native().trello).toBeDefined()
        }
    })


    test('entity-load', async () => {
        if (!missingKeys) {
            const seneca = Seneca({legacy: false})
                .test()
                .use('promisify')
                .use('entity')
                .use('provider', {
                    provider: {
                        trello: {
                            keys: {
                                api: {
                                    value: CONFIG.key,
                                },
                                user: {
                                    value: CONFIG.token
                                },
                            }
                        }
                    }
                })
                .use(TrelloProvider)
            const cardAndBoardId = CONFIG.boardId + "/" + CONFIG.cardId
            let card = await seneca.entity('provider/trello/card')
                .load$(cardAndBoardId)
            await (SenecaMsgTest(seneca, TrelloProviderMessages)())
            expect(card).toBeDefined()
            expect(card.id).toEqual(CONFIG.cardId)
            expect(card.entity$).toBe('provider/trello/card')
        }
    })


    test('entity-save', async () => {
        if (!missingKeys) {
            const provider_options = {
                provider: {
                    trello: {
                        keys: {
                            api: {
                                value: CONFIG.key,
                            },
                            user: {
                                value: CONFIG.token
                            },
                        }
                    }
                }
            }

            const seneca = Seneca({legacy: false})
                .test()
                .use('promisify')
                .use('entity')
                .use('provider', provider_options)
                .use(TrelloProvider)

            const cardAndBoardId = CONFIG.boardId + "/" + CONFIG.cardId
            let card = await seneca.entity('provider/trello/card')
                .load$(cardAndBoardId)

            expect(card).toBeDefined()
            card.desc = card.desc + 'M'

            card = await card.save$(CONFIG.cardId + `/desc/Teste`)
            expect(card).toBeDefined()
            expect(card.desc.endsWith('M')).toBeTruthy()
        }
    })

})

