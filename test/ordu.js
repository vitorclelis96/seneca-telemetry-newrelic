

const Seneca = require('seneca')


// const NewRelicAPI = ???

const sleep = (millis) => new Promise(r=>setTimeout(r,millis))

let s01 = Seneca()
    .test()
    .use('promisify')

// Use msg.x to validate correct message called

// Basic message 
    .message('m:1', async function m1(msg) {
      // NewRelic start?
      await sleep(100)
      // NewRelic end?
      return {k: 3 * msg.k}
    })

s01.order.inward.add(spec=>{
  if(spec.data.msg.a) {
    console.log('MSG INWARD', spec.data.msg, Date.now())
  }
})


s01.order.outward.add(spec=>{
  if(spec.data.msg.a) {
    console.log('MSG OUTWARD', spec.data.msg, Date.now())
  }
})



s01
    .act('m:1,k:2', Seneca.util.print) // { k: 6 }
 


