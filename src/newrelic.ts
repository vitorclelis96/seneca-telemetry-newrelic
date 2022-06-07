/* Copyright © 2021 Seneca Project Contributors, MIT License. */


import NewRelic from 'newrelic';
import { Skip, Some } from 'gubu';

import { TracingCollector } from './tracing-collector';
import { Segments } from './segments/segments';
import { MetricsCollector } from './metrics-collector';
import { EventsCollector } from './events-collector';

import { NewRelicOptions, Nullable, Spec } from './types';


function preload(this: any, opts: any) {
  const seneca = this;
  const { options }: { options: NewRelicOptions } = opts;
  const isPluginActive = options && options.active
  const segmentIsEnabled = isPluginActive && options.segment && options.segment.enabled;
  const tracingIsEnabled = isPluginActive && options.tracing && options.tracing.enabled;
  const metricsIsEnabled = isPluginActive && options.metrics && options.metrics.enabled;
  const eventsIsEnabled = isPluginActive && options.events && options.events.enabled;

  const segments = Segments.emmiter()
  
  // if segment is enabled, defines initial tasks for inward/outward
  segments.emit('statusChange', segmentIsEnabled)
  
  let tracingCollector: Nullable<TracingCollector> = null;
  if (tracingIsEnabled && options.tracing) {
    const { accountApiKey, serviceName } = options.tracing;
    tracingCollector = new TracingCollector(
      seneca, accountApiKey, serviceName
    );
  }

  seneca.order.inward.add((spec: Spec) => {
    segments.inward(spec)

    if (tracingCollector) {
      tracingCollector.dispatch(spec, 'inward');
    }
  })

  seneca.order.outward.add((spec: Spec) => {    
    segments.outward(spec)

    if (tracingCollector) {
      tracingCollector.dispatch(spec, 'outward');
    }
  })

  if (metricsIsEnabled) {
    if (!options.metrics?.accountApiKey) {
      throw new Error("Please provide accountApiKey parameter to Metrics API");
    }
    this.metrics_api_key = options.metrics.accountApiKey;
  }

  if (eventsIsEnabled) {
    if (!options.events?.accountApiKey) {
      throw new Error("Please provide accountApiKey parameter to Events API");
    }
    this.events_api_key = options.events.accountApiKey;
  }
}

function newrelic(this: any, options: NewRelicOptions) {
    const seneca: any = this

    seneca
      .message('plugin:newrelic,get:info', get_info)
      .message({
        sys:'telemetry',
        telemetry:'newrelic',
        active: Boolean
      }, async function onOff(this: any, msg: any) {
        Segments.emmiter().emit('statusChange', msg.active)
      })

    if (seneca.metrics_api_key) {
      const { metric_count_handler, metric_summary_handler, metric_gauge_handler} = MetricsCollector(seneca.metrics_api_key);
      seneca
        .message({
          plugin: 'newrelic',
          api: 'metric',
          type: 'count',
          value: Number,
          name: String,
          attributes: Skip({}),
        }, metric_count_handler)
        .message({
          plugin: 'newrelic',
          api: 'metric',
          type: 'gauge',
          value: Number,
          name: String,
          attributes: Skip({}),
        }, metric_gauge_handler)
        .message({
          plugin: 'newrelic',
          api: 'metric',
          type: 'summary',
          value: Some({
            count: Skip(Number),
            sum: Skip(Number),
            min: Skip(Number),
            max: Skip(Number),
          }),
          name: String,
          attributes: Skip({})
        }, metric_summary_handler);
    }
    if (seneca.events_api_key) {
      const { event_handler } = EventsCollector(seneca.events_api_key);
      seneca
        .message({
          plugin: 'newrelic',
          api: 'event',
          eventType: String,
          attributes: Some({}),
        }, event_handler)
    }

    async function get_info(this: any, _msg: any) {
      return {
        ok: true,
        name: 'newrelic',
        details: {
          sdk: 'newrelic'
        }
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
  active: true,
  tracing: {
    enabled: false,
    accountApiKey: '',
    serviceName: '',
  },
  events: {
    enabled: false,
    accountApiKey: '',
  },
  metrics: {
    accountApiKey: '',
    enabled: false,
  },
  segment: {
    enabled: false,
  },
  // TODO: Enable debug logging
  debug: false
}

Object.assign(newrelic, {defaults, preload})

export default newrelic

if ('undefined' !== typeof (module)) {
    module.exports = newrelic
}