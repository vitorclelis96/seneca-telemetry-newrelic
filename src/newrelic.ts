/* Copyright © 2021 Seneca Project Contributors, MIT License. */


import NewRelic from 'newrelic';
import { exec } from 'child_process';
import { MetricBatch, SummaryMetric, CountMetric, MetricClient, GaugeMetric } from '@newrelic/telemetry-sdk/dist/src/telemetry/metrics';
import { SummaryValue } from '@newrelic/telemetry-sdk/dist/src/telemetry/metrics/summary';
import { MetricBase } from '@newrelic/telemetry-sdk/dist/src/telemetry/metrics/metric';

type NewRelicOptions = {
    tracing?: NewrelicTracingApi,
    segment?: NewrelicSegmentApi,
    metrics?: NewrelicMetricsApi,
    debug: boolean,
};

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

                    NewRelic.startSegment(                        
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

function preload(this: any, opts: any) {
    const seneca = this;
    const { options }: { options: NewRelicOptions } = opts;
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

function newrelic(this: any, options: NewRelicOptions) {
    const seneca: any = this

    seneca
        .message('plugin:newrelic,get:info', get_info)
        .message('plugin:newrelic,api:metrics', metric_handler)

    async function get_info(this: any, _msg: any) {
        return {
            ok: true,
            name: 'newrelic',
            details: {
                sdk: 'newrelic'
            }
        }
    }

    const metricBatchBuilder = (metric: MetricBase<any>) => {
      const batch = new MetricBatch({}, Date.now(), 1000);
      batch.addMetric(metric)
      return batch;
    };

    const sendBatch = (batch: MetricBatch) => {
      seneca.metricsClient.send(batch, (err: any, res: any, body: any) => {
      if (err) {
          console.log('aq', err);
      }
          console.log(res.statusCode);
          console.log(body);
      })
    }

    async function metric_count_handler(name: string, value: number, attributes?: any) {
      const countMetrics = new CountMetric(name, value, attributes || {});
      const batch = metricBatchBuilder(countMetrics);
      sendBatch(batch);
    }

    async function metric_gauge_handler(name: string, value: number, attributes?: any) {
      const gaugeMetric = new GaugeMetric(name, value, attributes || {});
      const batch = metricBatchBuilder(gaugeMetric);
      sendBatch(batch);
    }

    async function metric_summary_handler(name: string, value: SummaryValue, attributes?: any) {
        const summaryMetrics = new SummaryMetric(name, value, attributes || {});
        const batch = metricBatchBuilder(summaryMetrics);
        sendBatch(batch);
    }

    async function metric_handler(this: any, msg: any) {
      const extractSummaryData = (): SummaryValue => {
        const { count, sum, min, max } = msg;
        return {
          count: count || 0,
          sum: sum || 0,
          min: min || Infinity,
          max: max || -Infinity ,
        };
      }
      const { type, name, value, attributes } = msg;
      if (!type || !name || (!value && type !== 'summary')) {
        throw new Error(`
          Invalid pattern, please make sure you provide type:(gauge|count|summary),name:string,value:(number|string)
        `)
      }
      switch (type) {
        case 'count':
          return metric_count_handler(name, value, attributes);
        case 'gauge':
          return metric_gauge_handler(name, value, attributes);
        case 'summary':
          const summaryData = extractSummaryData();
          return metric_summary_handler(name, summaryData, attributes);
        default:
          throw new Error('Invalid or missing type');
      }
    }

    return {
      exports: {
        native: () => ({})
      }
    }
}


// Default options.
const defaults: NewRelicOptions = {

    // TODO: Enable debug logging
    debug: false
}


Object.assign(newrelic, {defaults, preload})

export default newrelic

if ('undefined' !== typeof (module)) {
    module.exports = newrelic
}