/* Copyright © 2021 Seneca Project Contributors, MIT License. */

import * as Fs from 'fs'

import NewrelicProvider from '../src/newrelic-provider';
import PluginTestProvider from './fixtures/PluginTestProvider';


const Seneca = require('seneca')
const SenecaMsgTest = require('seneca-msg-test')
const NewrelicProviderMessages = require('./newrelic-provider.messages').default

const CONFIG: any = {}
let missingKeys = true
if (Fs.existsSync(__dirname + '/local-config.js')) {
    Object.assign(CONFIG, require(__dirname + '/local-config.js'))
    missingKeys = false
}

jest.setTimeout(10000)

describe('newrelic-provider', () => {

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
            .use(NewrelicProvider)
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
            .use(NewrelicProvider)
        await (SenecaMsgTest(seneca, NewrelicProviderMessages)())
    })

    test('plugin-test-provider', async () => {
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
            .use(NewrelicProvider)
            .use(PluginTestProvider);

            const x = await seneca.post('sys:provider,provider:other,get:info')
            console.log(x)
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
                .use(NewrelicProvider)
            await seneca.ready()

            let native = seneca.export('NewrelicProvider/native')
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
                .use(NewrelicProvider)
            const cardAndBoardId = CONFIG.boardId + "/" + CONFIG.cardId
            let card = await seneca.entity('provider/trello/card')
                .load$(cardAndBoardId)
            await (SenecaMsgTest(seneca, NewrelicProviderMessages)())
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
                .use(NewrelicProvider)

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

