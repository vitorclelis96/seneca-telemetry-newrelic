/* Copyright © 2021 Seneca Project Contributors, MIT License. */
import newrelic from 'newrelic';
const {MetricBatch,CountMetric,MetricClient, GaugeMetric } = require('@newrelic/telemetry-sdk').telemetry.metrics
import { exec } from 'child_process';

type NewRelicProviderOptions = {};

type Spec = Record<any, any>

type Nullable<T> = T | null

interface NewrelicTracingApi {
    ENABLED: boolean,
    ACCOUNT_API_KEY: string,
    SERVICE_NAME: string,
    HOST: string,
}

interface NewrelicSegmentApi {
    ENABLED: boolean,
}

interface NewrelicMetricsApi {
  ENABLED: boolean,
  ACCOUNT_API_KEY: string,
}

interface NewrelicProviderOptions {
    tracing?: NewrelicTracingApi,
    segment?: NewrelicSegmentApi,
    metrics?: NewrelicMetricsApi,
}
interface TelemetrySpecMetadata {
    id: string,
    tx_id: string,
    mi_id: string,
    fullMessage: Nullable<string>,
    plugin_name?: string,
    pattern?: string,
    duration?: string,
    endTime?: string,
    res?: string,
    manualEndTime?: number,
    manualStartTime?: number,
    startTime?: string,
    dispatched?: boolean,
}

interface TelemetryCollector {
    API_KEY: string,
    SERVICE_NAME: string,
    HOST: string,
    specList: TelemetrySpecMetadata[],
    extractFullMessage: (spec: any) => Nullable<string>,
    extractFromSpec: (spec: any, event: any) => TelemetrySpecMetadata,
    updateSpecList: (specMetadata: TelemetrySpecMetadata) => void,
    sendTracing: (spec: TelemetrySpecMetadata) => Promise<void | string>
}

function TelemetryCollector(apiKey: string, serviceName: string, host: string): TelemetryCollector {
    return {
        API_KEY: apiKey,
        SERVICE_NAME: serviceName,
        HOST: host,
        specList: [],
        extractFullMessage(spec: any) {
                try {
                    let fullMessage = null;
                    if (spec && spec.data && spec.data.msg) {
                        fullMessage = JSON.stringify(spec.data.msg);
                    }
                    return fullMessage
                } catch (error) {
                    let fullMessage = 'Error: Invalid JSON parsing';
                    return fullMessage
                }
            },
        extractFromSpec(spec: any, event: any) {
            const metadata: TelemetrySpecMetadata = {
              id: spec.data.meta.id,
              tx_id: spec.data.meta.tx,
              mi_id: spec.data.meta.mi,
              fullMessage: this.extractFullMessage(spec)
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
        updateSpecList(specMetadata: TelemetrySpecMetadata) {
          const spec = this.specList.find((s) => s.mi_id === specMetadata.mi_id);
          if (spec) {
            Object.assign(spec, specMetadata);
            if (spec.manualEndTime && spec.manualStartTime && !spec.dispatched) {
              this.sendTracing(spec)
                .catch(err => console.log(err));
              spec.dispatched = true;
            }
          } else {
            this.specList.push(specMetadata);
          }
        },
        async sendTracing(spec: TelemetrySpecMetadata) {
          return new Promise((resolve, reject) => {
            const endpoint = "https://trace-api.newrelic.com/trace/v1";
            const headers = `-H "Content-Type: application/json" -H "Api-Key: ${this.API_KEY}" -H "Data-Format: newrelic" -H "Data-Format-Version: 1"`
            const tracingSpec = {
              id: spec.mi_id,
              'trace.id': spec.tx_id,
              timestamp: spec.manualStartTime,
              attributes: {
                'duration.ms': spec.manualEndTime! - spec.manualStartTime!,
                plugin_name: spec.plugin_name,
                pattern: spec.pattern,
                name: `${spec.plugin_name} ~ ${spec.pattern}`,
                'parent.id': spec.tx_id,
                fullMessage: spec.fullMessage,
              },
            };
            const baseData = [
              {
                common: {
                  attributes: {
                    "service.name": this.SERVICE_NAME,
                    host: this.HOST,
                  },
                },
                spans: [tracingSpec],
              }
            ];
            const curlStr = `curl -i ${headers} -X POST -d '${JSON.stringify(baseData)}' '${endpoint}'`;
            exec(curlStr, (err, stdout, stderr) => {
              if (err) {
                console.log(err)
                reject(err);
              }
              if (stderr) {
                console.log(stderr)
                reject(stderr);
              }
              if (stdout) {
                console.log(stdout);
                resolve(stdout);
              }
            })
          })
        }
    }
}

function changeSpec(spec: Spec, event: "inward" | "outward") {
    return {
        addSegments: () => {
            if(spec.ctx.actdef?.func) {
                const { func, pattern }: Record<string, any> = spec.ctx.actdef

                spec.ctx.actdef.func = function (this:any, ...args: any) {
                    const seneca = this

                    const segment = (func.name == '' ? pattern : func.name)

                    newrelic.startSegment(                        
                        segment,
                        true,
                        function handler(endSegment) {
                            console.log('start segment ', segment)
                            // call action function
                            func.bind(seneca)(...args)

                            // include endSegment to inward/outward context
                            let context = spec.ctx.seneca.context

                            let mi = spec.data.meta.mi
                            context.peract = context.peract || {}

                            let peract = (context.peract[mi] = (context.peract[mi] || {}))

                            peract.pattern = pattern
                            peract.endSegment = endSegment
                        },
                        function endSegment() {
                            console.log('end segment ' + segment)
                        }
                    )
                }
            }
        },
        endSegments: () => {
            const mi = spec.data.meta.mi

            if(spec.ctx.seneca.context.peract) {
                const peract = spec.ctx.seneca.context.peract[mi]
                if(peract) {
                    (peract.endSegment())
                }
            }
        },
        extractFromSpec: () => {

        }
    }
}

function PreloadNewrelicProvider(this: any, opts: any) {
    const seneca = this;
    const { options }: { options: NewrelicProviderOptions } = opts;
    const segmentIsEnabled = options && options.segment && options.segment.ENABLED;
    const tracingIsEnabled = options && options.tracing && options.tracing.ENABLED;
    const metricsIsEnabled = options && options.metrics && options.metrics.ENABLED;
    
    let telemetryCollector: Nullable<ReturnType<typeof TelemetryCollector>> = null;
    if (tracingIsEnabled && options.tracing) {
        const { ACCOUNT_API_KEY, SERVICE_NAME, HOST } = options.tracing;
        telemetryCollector = TelemetryCollector(
            ACCOUNT_API_KEY, SERVICE_NAME, HOST
        );
    }

    seneca.order.inward.add((spec: Spec) => {
        if (segmentIsEnabled) {
            changeSpec(spec, 'inward').addSegments();
        }
        if (telemetryCollector) {
            const specMetadata = telemetryCollector.extractFromSpec(spec, 'inward');
            telemetryCollector.updateSpecList(specMetadata);
        }
    })

    seneca.order.outward.add((spec: Spec) => {
        if (segmentIsEnabled) {
            changeSpec(spec, 'outward').endSegments()
        }
        if (telemetryCollector) {
            const specMetadata = telemetryCollector.extractFromSpec(spec, 'outward');
            telemetryCollector.updateSpecList(specMetadata);
        }
    })

    if (metricsIsEnabled) {
      if (!options.metrics?.ACCOUNT_API_KEY) {
        throw new Error("Please provide ACCOUNT_API_KEY parameter to Metrics API");
      }
      const metricsClient = new MetricClient({
        apiKey: options.metrics.ACCOUNT_API_KEY,
      })
  
      this.metricsClient = metricsClient;
    }
}

function NewrelicProvider(this: any, options: NewrelicProviderOptions) {
    const seneca: any = this
    const ZONE_BASE = 'provider/newrelic/'

    // NOTE: sys- zone prefix is reserved.

    seneca
        .message('sys:provider,provider:newrelic,get:info', get_info)
        .message('sys:provider,provider:newrelic,record:metric', metric_handler)

    async function get_info(this: any, _msg: any) {
        return {
            ok: true,
            name: 'newrelic',
            details: {
                sdk: 'newrelic'
            }
        }
    }

    async function metric_count_handler(name: string, value: number, attributes?: any) {
      // TODO: Something is broken.
      // const countMetrics = new CountMetric(name, value, attributes || {}, Date.now());
      const countMetrics = new CountMetric(name, value);
      // const batch = new MetricBatch({}, )
      seneca.metricsClient.send(countMetrics, (err, res, body) => {
        if (err) {
          console.log('aq', err);
        }
        console.log(res.statusCode);
        console.log(body);
      })
    }

    async function metric_gauge_handler(name: string, value: number, attributes?: any) {
      const headers = `-H "Content-Type: application/json" -H "Api-Key: ${options.metrics?.ACCOUNT_API_KEY}"`;
      const jsonData = JSON.stringify([{
        metrics: [{
          "name": "test.custom.manual",
          "type": "gauge",
          "value": 1,
          "timestamp": Date.now(),
          "attributes": {"host.name": "localhost"}
        }]
      }]);
      const curlStr = `curl -vvv -k ${headers} -X POST https://metric-api.newrelic.com/metric/v1 --data ${jsonData}`;
      exec(curlStr, (err, stdout, stderr) => {
        if (err) {
          console.log(err)
        }
        if (stderr) {
          console.log(stderr)
        }
        if (stdout) {
          console.log(stdout);
        }
      })
      /*
      const gaugeMetric = new GaugeMetric(name, value, attributes || {});
      const batch = new MetricBatch({}, Date.now(), 1000);
      batch.addMetric(gaugeMetric);
      seneca.metricsClient.send(batch, (err, res, body) => {
        if (err) {
          console.log('aq', err);
        }
        console.log('xD')
        console.log(res.statusCode);
        console.log(body);
      })
      */
    }

    async function metric_summary_handler(msg: any) {
      
    }

    async function metric_handler(this: any, msg: any) {
      // gauge, count, summary
      // timestamp
      // interval.ms 
      // attributes => labels
      // For gauge and count the value should be a single number
      const { type, name, value, attributes } = msg;
      if (!type || !name || !value) {
        throw new Error(`
        Invalid pattern, please make sure you provide type:(gauge|count|summary),name:string,value:(number|string)
        `)
      }
      switch (type) {
        case 'count':
          return metric_count_handler(name, value, attributes);
        case 'gauge':
          return metric_gauge_handler(msg);
        case 'summary':
          return metric_summary_handler(msg);
        default:
          throw new Error('Invalid or missing type');
      }
      return {
        ok: true,
      }
    }

    return {
        exports: {
            native: () => ({})
        }
    }
}


// Default options.
const defaults: NewRelicProviderOptions = {

    // TODO: Enable debug logging
    debug: false
}


Object.assign(NewrelicProvider, {defaults})

export default NewrelicProvider

if ('undefined' !== typeof (module)) {
    module.exports = NewrelicProvider
    module.exports.preload = PreloadNewrelicProvider
}