
/*
  There's two types of general transactions:
    Web Transactions
    Background Transactions

  Should ask Richard:
    seneca.order.inward.add(spec => {// Also works for outward
      ...
    })
    This function runs even when booting plugins, how should we tackle this?
    It's a bit unclear, but it looks like when a method is called, 
    all plugins also instantiate?

  How/when to instantiate an transaction, and then finish it?


  Try to group by pattern,
    have a class to manage the data
    and a class to consume the data.
    Like a pub/sub

  O que tem que acontecer na vdd:
  Ter uma lista de objetos com chamadas,
  Quando iniciar, dar um transaction,
  quando terminar, finalizar o objeto e dar transaction.end()
  Pelo que ue entendi a transaction é singleton

  Estudar, ver video.

  The issue is:
    All inwards run before outwards, and I believe the transaction object
    is a singleton, so there's no way to keep state from that

})
*/

/*
class TelemetryCollector {

}
*/
const newrelic = require('newrelic')
const Seneca = require('seneca')

function Transaction(specMetadata) {
    let transaction;
  
    function start() {
      return newrelic.startBackgroundTransaction(specMetadata.pattern, specMetadata.id, () => {
        transaction = newrelic.getTransaction()
        return
      })
    }
  
    function end() {
      if(!transaction) {
        throw new Error('transaction not started')
      }
      console.log(`end transaction ${meta.action}`)
      transaction.end()
      return
    }
  
    return {
      start,
      end
    }
  }

const TelemetryCollector = {
    defaultTime: 5000,
    specList: [],
    extractFromSpec(spec, event) {
        const metadata = {
          id: spec.data.meta.id,
          tx_id: spec.data.meta.tx,
          mi_id: spec.data.meta.mi,
          msg: JSON.stringify(spec.data.msg),
        }
        if (spec.ctx.actdef) {
          metadata.plugin_name = spec.ctx.actdef.plugin_fullname;
          metadata.pattern = spec.ctx.actdef.pattern;
        }
      
        if (event === 'outward') {
          metadata.duration = spec.ctx.duration;
          metadata.endTime = spec.data.meta.end;
          metadata.res = spec.data.res;
        }
        if (event === 'inward' && !metadata.startTime) {
          metadata.startTime = spec.data.meta.start;
        }
        return metadata;
      },
    updateSpecList(specMetadata) {
        const spec = this.specList.find((s) => s.tx_id === specMetadata.tx_id);
        if (spec) {
            const actionExists = spec.stackList.find((ss) => ss.mi_id === specMetadata.mi_id);
            if (actionExists) {
                Object.assign(actionExists, specMetadata);
            } else {
                spec.stackList.push(specMetadata);
            }
        } else {
            /*
            this.bootTransaction(specMetadata)
                .then((transaction) => {
                    this.specList.push({
                        tx_id: specMetadata.tx_id,
                        stackList: [specMetadata],
                        transaction: transaction,
                    });
                })
            */
            this.specList.push({
                tx_id: specMetadata.tx_id,
                stackList: [specMetadata],
            });
        }
    },
    async bootTransaction(specMetadata) {
        return new Promise((resolve, reject) => {
            const { pattern, id } = specMetadata;
            const name = pattern ?? "TEST"; // TODO
            newrelic.startBackgroundTransaction(name, id, () => {
                const transaction = newrelic.getTransaction();
                // console.log(transaction)
                resolve(transaction);
            })
        })
    },
    async testTransaction(specMetadata) {
        return new Promise((resolve, reject) => {
            const { pattern, id } = specMetadata;
            const name = pattern ?? "TEST"; // TODO
            newrelic.startBackgroundTransaction(name, id, async () => {
                const transaction = newrelic.getTransaction();
                await sleep(1000);
                console.log('aqui!');
                // newrelic.recordMetric('vitor_metric', specMetadata);
                transaction.end();
                resolve(true);
            })
        })
    },
    async testCloseAll() {
        this.specList.forEach(async (s) => {
            await this.testTransaction(s);
        })
    }
}






const sleep = (millis) => new Promise(r=>setTimeout(r,millis))

let s01 = Seneca()
    .test()
    .use('promisify')

// Basic message 
    .message('m:1', async function m1(msg) {
      await sleep(100)
      return {k: 3 * msg.k}
    })

// Message with prior
    .message('m:2', async function m2(msg) {
      await sleep(100)
      return {k: 3 * msg.k}
    })
    .message('m:2', async function m1Hook(msg) {
      await sleep(100);
      msg.k = msg.k + 1;
      return this.prior(msg);
    })

s01.order.inward.add(spec=>{
  const specMetadata = TelemetryCollector.extractFromSpec(spec, 'inward');
  TelemetryCollector.updateSpecList(specMetadata);
})


s01.order.outward.add(spec=>{
  const specMetadata = TelemetryCollector.extractFromSpec(spec, 'outward');
  TelemetryCollector.updateSpecList(specMetadata);
})

/*
  Things I've discovered:
    inward and outward .add functions get called several times.
    All inwards run before the first outward
    Inward hooks runs before a function gets executed, and the outward hook
      runs after a function finishes.
*/

/*
Simple example:
 [
   {
      "tx_id":"y134e3fdj3ow",
      "stackList":[
         {
            "id":"ivj0x2z6gp07/y134e3fdj3ow",
            "tx_id":"y134e3fdj3ow",
            "mi_id":"ivj0x2z6gp07",
            "plugin_name":"root$",
            "pattern":"m:1",
            "msg":"{\"m\":1,\"k\":2}",
            "startTime":1651168356247,
            "duration":119,
            "endTime":1651168356366,
            "res":{
               "k":6
            }
         }
      ]
   },
   {
      "tx_id":"5v83pwrptrpt",
      "stackList":[
         {
            "id":"2d1oqc29bixh/5v83pwrptrpt",
            "tx_id":"5v83pwrptrpt",
            "mi_id":"2d1oqc29bixh",
            "plugin_name":"root$",
            "pattern":"m:2",
            "msg":"{\"m\":2,\"k\":9}",
            "startTime":1651168356248,
            "duration":247,
            "endTime":1651168356495,
            "res":{
               "k":27
            }
         },
         {
            "id":"g1ybph0c62ya/5v83pwrptrpt",
            "tx_id":"5v83pwrptrpt",
            "mi_id":"g1ybph0c62ya",
            "plugin_name":"root$",
            "pattern":"m:2",
            "msg":"{\"m\":2,\"k\":9,\"plugin$\":{\"full\":\"root$\",\"name\":\"root$\"},\"tx$\":\"5v83pwrptrpt\"}",
            "startTime":1651168356392,
            "duration":102,
            "endTime":1651168356494,
            "res":{
               "k":27
            }
         }
      ]
   }
  ]

*/


s01.act('m:1,k:2', (msg) => {
  //console.log(JSON.stringify(specList))
}) // { k: 6 }

setTimeout(async () => {
    // console.log(TelemetryCollector.specList);
    await TelemetryCollector.testCloseAll();
    // console.log(JSON.stringify(TelemetryCollector.specList));
    /*
    newrelic.startBackgroundTransaction('test', '123', () => {
        const transaction = newrelic.getTransaction()
        transaction.endTransaction()
      })
      */
}, 5000)



// s01.act('m:2,k:8', Seneca.util.print) // { k: 27 }

