

const Seneca = require('seneca')


// const NewRelicAPI = ???

const sleep = (millis) => new Promise(r=>setTimeout(r,millis))

let s01 = Seneca()
    .test()
    .use('promisify')

// Use msg.x to validate correct message called

// Basic message 
    .message('a:1', async function a1(msg, meta) {
      // NewRelic start?
      actionStart(meta)

      await sleep(100)

      // NewRelic end?
      actionEnd(meta)
      
      return {x:msg.x}
    })

// Message with child
    .message('b:1', async function b1(msg, meta) {
      // NewRelic start?
      actionStart(meta)

      await sleep(100)
      let a1 = await this.post('a:1',{x:msg.x})
      let x = 1 + a1.x

      // NewRelic end?
      actionStart(meta)

      return {x}
    })

// Message with prior
    .message('c:1', async function c1(msg, meta) {
      // NewRelic start?
      actionStart(meta)

      await sleep(100)

      // NewRelic end?
      actionEnd(meta)
      
      return {x: 2 + msg.x}
    })

// Message with prior
    .message('c:1', async function c1p(msg, meta) {
      // NewRelic start?
      actionStart(meta)

      await sleep(100)
      msg.x = 2 * msg.x

      let out = await this.prior(msg)

      // NewRelic end?
      actionEnd(meta)
      
      return out
    })


run(s01)


async function run(seneca) {
  console.log('\n---')
  let a1o0 = await seneca.post('a:1,x:10')
  console.log(a1o0) // { x: 10 }

  console.log('\n---')
  let b1o0 = await seneca.post('b:1,x:10')
  console.log(b1o0) // { x: 11 }

  console.log('\n---')
  let c1o0 = await seneca.post('c:1,x:10')
  console.log(c1o0) // { x: 22 }
}



function actionStart(meta) {
  console.log('START', meta.id, meta.pattern, meta.action)
}


function actionEnd(meta) {
  console.log('END  ', meta.id, meta.pattern, meta.action)
}
