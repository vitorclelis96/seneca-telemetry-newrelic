import { Span, SpanBatch, SpanClient } from "@newrelic/telemetry-sdk/dist/src/telemetry/spans";
import { Spec, TelemetrySpecMetadata } from "./types";

const ERROR_FAIL_TO_EXTRACT_JSON = "Error: Invalid JSON parsing;";

export class TracingCollector {
  seneca: any;
  serviceName: string;
  specList: TelemetrySpecMetadata[] = [];
  spanClient: SpanClient;

  constructor(seneca: any, apiKey: string, serviceName: string) {
    this.serviceName = serviceName;
    this.spanClient = new SpanClient({
      apiKey,
    });
    this.seneca = seneca;
  }

  extractFullMessage(spec: any) {
    try {
      let fullMessage = null;
      if (spec && spec.data && spec.data.msg) {
          fullMessage = JSON.stringify(spec.data.msg);
      }
      return fullMessage
    } catch (error) {
      return ERROR_FAIL_TO_EXTRACT_JSON;
    }
  };

  _extractFromSpec(spec: Spec, event: 'outward' | 'inward') {
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
  };

  async _updateSpecList(specMetadata: TelemetrySpecMetadata) {
    const spec = this.specList.find((s) => s.mi_id === specMetadata.mi_id);
    if (spec) {
      Object.assign(spec, specMetadata);
      if (spec.manualEndTime && spec.manualStartTime && !spec.dispatched) {
        try {
          await this.sendTracing(spec);
          spec.dispatched = true;
          this._clearQueue();
        } catch (error) {
          this.seneca.log.error(error);
        }
      }
    } else {
      this.specList.push(specMetadata);
    }
  };

  _clearQueue() {
    return new Promise((resolve, reject) => {
      this.specList = this.specList.filter((s) => !s.dispatched)
      resolve(true);
    })
  }

  dispatch(spec: Spec, event: 'outward' | 'inward') {
    const telemetrySpecMetadata = this._extractFromSpec(spec, event);
    this._updateSpecList(telemetrySpecMetadata);
  }

  sendTracing(spec: TelemetrySpecMetadata): Promise<string|void|boolean> {
    return new Promise((resolve, reject) => {
      const spanBatch = new SpanBatch();
      const span = new Span(
        spec.mi_id,
        spec.tx_id,
        spec.manualStartTime!,
        `${spec.plugin_name} ~ ${spec.pattern}`,
        spec.tx_id,
        this.serviceName,
        spec.manualEndTime! - spec.manualStartTime!,
        {
          plugin_name: spec.plugin_name!,
          pattern: spec.pattern!,
          fullMessage: spec.fullMessage!,
        }
      );
      spanBatch.addSpan(span);
      this.spanClient.send(spanBatch, (error: any, res: any, body: any) => {
        if (error) {
          this.seneca.log.error(error);
        }
        resolve(res.statusCode);
      })
    })
  }



}