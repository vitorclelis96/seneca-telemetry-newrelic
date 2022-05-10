/* Copyright © 2021 Seneca Project Contributors, MIT License. */

import * as Fs from 'fs'

import NewrelicProvider from '../src/newrelic-provider';


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
            /*
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
            */
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
})

