const Seneca = require('seneca');
const { exec } = require('child_process');

const ACCOUNT_API_KEY = "YOUR API KEY";
const SERVICE_NAME = "ORDU_TRACING_TEST";
const HOST = "LOCALHOST"

const TelemetryCollector = {
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
          metadata.manualEndTime = Date.now();
        }
        if (event === 'inward' && !metadata.startTime) {
          metadata.startTime = spec.data.meta.start;
          metadata.manualStartTime = Date.now();
        }
        return metadata;
      },
    updateSpecList(specMetadata) {
      const spec = this.specList.find((s) => s.mi_id === specMetadata.mi_id);
      if (spec) {
        Object.assign(spec, specMetadata);
        if (spec.manualEndTime && spec.manualStartTime && !spec.dispatched) {
          this.sendTracing(spec);
          spec.dispatched = true;
        }
      } else {
        this.specList.push(specMetadata);
      }
    },
    async sendTracing(spec) {
      const endpoint = "https://trace-api.newrelic.com/trace/v1";
      const headers = `-H "Content-Type: application/json" -H "Api-Key: ${ACCOUNT_API_KEY}" -H "Data-Format: newrelic" -H "Data-Format-Version: 1"`
      const tracingSpec = {
        id: spec.mi_id,
        'trace.id': spec.tx_id,
        timestamp: spec.manualStartTime,
        attributes: {
          'duration.ms': spec.manualEndTime - spec.manualStartTime,
          plugin_name: spec.plugin_name,
          pattern: spec.pattern,
          name: `${spec.plugin_name} ~ ${spec.pattern}`,
          'parent.id': spec.tx_id,
        },
      };
      const baseData = [
        {
          common: {
            attributes: {
              "service.name": SERVICE_NAME,
              host: HOST,
            },
          },
          spans: [tracingSpec],
        }
      ];
      const curlStr = `curl -i ${headers} -X POST -d '${JSON.stringify(baseData)}' '${endpoint}'`;
      exec(curlStr, (err, stdout, stderr) => {
        if (err) {
          console.log(err)
          return;
        }
        if (stderr) {
          console.log(stderr)
        }
        if (stdout) {
          console.log(stdout);
        }
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

// Test basic message
s01.act('m:1,k:2', Seneca.util.print) // { k: 6 }

// Test message with priors
s01.act('m:2,k:8', Seneca.util.print) // { k: 27 }