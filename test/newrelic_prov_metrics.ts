const Seneca = require('seneca');
import NewrelicProvider from '../src/newrelic-provider';

const sleep = (millis: any) => new Promise(r=>setTimeout(r,millis))

const s01 = Seneca()
    .test()
    .use('promisify')
    .use(NewrelicProvider, {
        metrics: {
            ENABLED: true,
            ACCOUNT_API_KEY: 'd2f92475f00f51add8f4b3e3235982a03990NRAL',
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
s01.act('sys:provider,provider:newrelic,record:metric,type:gauge,value:1,name:test.counter')
