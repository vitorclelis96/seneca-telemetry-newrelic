import { CountMetric, GaugeMetric, MetricBatch, MetricClient, SummaryMetric } from "@newrelic/telemetry-sdk/dist/src/telemetry/metrics";
import { MetricBase } from "@newrelic/telemetry-sdk/dist/src/telemetry/metrics/metric";
import { BaseMetricsResponse } from "./types";

export function MetricsCollector(metricApiKey: string) {
  const metricsClient = new MetricClient({
    apiKey: metricApiKey,
  });

  async function metric_count_handler(this: any, msg: any) {
    const { name, value, attributes } = msg;
    const countMetrics = new CountMetric(name, value, attributes || {});
    const batch = _metricBatchBuilder(countMetrics);
    return _sendBatch(batch);
  }

  async function metric_gauge_handler(this: any, msg: any) {
    const { name, value, attributes } = msg;
    const gaugeMetric = new GaugeMetric(name, value, attributes || {});
    const batch = _metricBatchBuilder(gaugeMetric);
    return _sendBatch(batch);
  }

  async function metric_summary_handler(this: any, msg: any) {
    const { name, value, attributes } = msg;
    const { count, sum, min, max } = value;
    const summaryData = {
      count: count || 0,
        sum: sum || 0,
        min: min || Infinity,
        max: max || -Infinity ,
    }
    const summaryMetrics = new SummaryMetric(name, summaryData, attributes || {});
    const batch = _metricBatchBuilder(summaryMetrics);
    return _sendBatch(batch);
  }

  const _metricBatchBuilder = (metric: MetricBase<any>) => {
    const batch = new MetricBatch({}, Date.now(), 1000);
    batch.addMetric(metric)
    return batch;
  };

  const _sendBatch = (batch: MetricBatch): Promise<BaseMetricsResponse> => {
    return new Promise((resolve, reject) => {
      metricsClient.send(batch, (err: any, res: any, body: any) => {
        const response = {
          err: null,
          statusCode: null,
          body: null,
        }
        if (err) {
          response.err = err;
          return reject(response);
        }
        response.statusCode = res.statusCode;
        response.body = body;
        return resolve(response);
      })
    })
  }

  return { metric_count_handler, metric_gauge_handler, metric_summary_handler };
}