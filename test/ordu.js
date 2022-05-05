const { exec } = require('child_process');
const newrelic = require('newrelic');
const { stderr } = require('process');
const Seneca = require('seneca');

// Test function
function sendCurl(eventType, specList) {
  specList.forEach((s) => {
    const tx_id = s.tx_id;
    s.stackList.forEach((sL) => {
      const obj = {
        ...sL,
        tx_id,
        res: JSON.stringify(sL.res),
        finished_at: sL.endTime,
        started_at: sL.startTime,
        eventType: 'DoTestSt',
      }
      delete obj.endTime;
      delete obj.startTime;
      /*
        MELHORAR ISSO AQUI
      */
     const accountApiKey = "YOUR API KEY";
     const accountId = "3487050";
     const objStr = JSON.stringify(obj);
     const curlStr = `curl -X POST -H "Content-Type: application/json" -H "Api-Key: ${accountApiKey}" https://insights-collector.newrelic.com/v1/accounts/${accountId}/events -d '${objStr}'`;
     exec(curlStr, (err, stdout, stderr) => {
       if (err) {
         console.log(err)
         return;
       }
       if (stderr) {
         console.log(stderr)
       }
       if (stdout) {
         // console.log(stdout);
       }
     })
    })
  })
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
            this.specList.push({
                tx_id: specMetadata.tx_id,
                stackList: [specMetadata],
            });
        }
    },
    testDispatchEvents() {
      sendCurl('SenecaPlugin', this.specList);
      /*
      this.specList.forEach((s) => {
        newrelicReportEvent('SenecaPlugin', {
          ok: true,
          val: 1
        });
      })
      */
    },
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


// Test basic message
s01.act('m:1,k:2', (msg) => {
  //console.log(JSON.stringify(specList))
}) // { k: 6 }

// Test message with priors
// s01.act('m:2,k:8', Seneca.util.print) // { k: 27 }


setTimeout(() => {
  TelemetryCollector.testDispatchEvents();
}, 5000)