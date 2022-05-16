/* Copyright © 2021-2022 Seneca Project Contributors, MIT License. */


import Plugin from '../src/newrelic'


const Seneca = require('seneca')



jest.setTimeout(10000)

describe('newrelic', () => {

  test('happy', async () => {
    const seneca = Seneca({ legacy: false })
      .test()
      .use('promisify')
      .use(Plugin)
    await seneca.ready()
    await seneca.close()
  })


})

