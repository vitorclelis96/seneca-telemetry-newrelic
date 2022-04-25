

const Seneca = require('seneca')


// const NewRelicAPI = ???

const sleep = (millis) => new Promise(r=>setTimeout(r,millis))

let s01 = Seneca()
    .test()
    .use('promisify')

// Use msg.x to validate correct message called

// Basic message 
    .message('a:1', async function a1(msg) {
      // NewRelic start?
      await sleep(100)
      // NewRelic end?
      return {x:msg.x}
    })

// Message with child
    .message('b:1', async function b1(msg) {
      // NewRelic start?
      await sleep(100)
      let a1 = await this.post('a:1',{x:msg.x})
      let x = 1 + a1.x
      // NewRelic end?
      return {x}
    })

// Message with prior
    .message('c:1', async function c1(msg) {
      // NewRelic start?
      await sleep(100)
      // NewRelic end?
      return {x: 2 + msg.x}
    })

    .message('c:1', async function c1p(msg) {
      // NewRelic start?
      await sleep(100)
      msg.x = 2 * msg.x
      let out = this.prior(msg)
      // NewRelic end?
      return out
    })

    .act('a:1,x:10', Seneca.util.print) // { x: 10 }
 
    .act('b:1,x:10', Seneca.util.print) // { x: 11 }

    .act('c:1,x:10', Seneca.util.print) // { x: 22 }


