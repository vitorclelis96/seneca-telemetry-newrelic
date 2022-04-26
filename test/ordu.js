

const Seneca = require('seneca')


const sleep = (millis) => new Promise(r=>setTimeout(r,millis))

let s01 = Seneca()
    .test()
    .use('promisify')

// Basic message 
    .message('m:1', async function m1(msg) {
      await sleep(100)
      return {k: 3 * msg.k}
    })

s01.order.inward.add(spec=>{
  if(spec.data.msg.m) {
    console.log('MSG INWARD', spec.data.msg, Date.now())
  }
})


s01.order.outward.add(spec=>{
  if(spec.data.msg.m) {
    console.log('MSG OUTWARD', spec.data.msg, Date.now())
  }
})



s01
    .act('m:1,k:2', Seneca.util.print) // { k: 6 }
 


