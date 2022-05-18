const Seneca = require('seneca');
import NewrelicProvider from '../src/newrelic';

const sleep = (millis: any) => new Promise(r=>setTimeout(r,millis))

const s01 = Seneca()
    .test()
    .use('promisify')
    .use(NewrelicProvider, {
        tracing: {
          enabled: true,
          accountApiKey: 'YOU API KEY',
          serviceName: 'ORDU_TRACING_TEST',
          host: 'LOCALHOST',
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
s01.act('m:1,k:2', Seneca.util.print) // { k: 6 }

// Test message with priors
s01.act('m:2,k:8', Seneca.util.print) // { k: 27 }
