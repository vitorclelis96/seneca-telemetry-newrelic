const Seneca = require('seneca');
import newrelicPlugin from '../src/newrelic';

const sleep = (millis: any) => new Promise(r=>setTimeout(r,millis))

const s01 = Seneca()
    .test()
    .use('promisify')
    .use(newrelicPlugin, {
        events: {
          enabled: true,
          accountApiKey: 'YOUR API KEY',
        }
    })
    // Basic message 
    .message('m:1', async function m1(msg: any) {
        await sleep(100)
        return {k: 3 * msg.k}
      })
  
  // Message with prior
      .message('m:2', async function m2(msg: any) {
        await sleep(100)
        return {k: 3 * msg.k}
      })
      .message('m:2', async function m1Hook(msg: any) {
        await sleep(100);
        msg.k = msg.k + 1;
        return this.prior(msg);
      })

// Test basic message
//s01.act('m:1,k:2', Seneca.util.print) // { k: 6 }

// Test message with priors
//s01.act('m:2,k:8', Seneca.util.print) // { k: 27 }
// s01.act('sys:provider,provider:newrelic,record:metric,type:count,value:1,name:Custom/Test')

// Gauge test
// s01.act("plugin:newrelic,api:event,type:gauge,value:2,name:custom.seneca.counter,attributes:{'user.name': 'Vitor', age: 26}")

// Summary test
// s01.act('plugin:newrelic,api:event,type:summary,name:custom.seneca.countsumm,value:{sum: 1}');

// Count test
// s01.act('plugin:newrelic,api:event,type:count,name:custom.seneca.countpp,value:10');

s01.act('plugin:newrelic,api:event,eventType:aThingHappened,attributes:{isOK:true,currentVal:28.5}', (err, response) => {
  console.log(err, response);
});

s01.act('plugin:newrelic,api:event,eventType:anotherThingHappened!!,attributes:{isOK:false,error:"JHENFU"}');