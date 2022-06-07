export type NewRelicOptions = {
  tracing?: NewrelicTracingApi,
  segment?: NewrelicSegmentApi,
  metrics?: NewrelicMetricsApi,
  events?: NewrelicEventsApi,
  debug: boolean,
};

export type Spec = Record<any, any>
export type Nullable<T> = T | null

export interface NewrelicTracingApi {
  enabled: boolean,
  accountApiKey: string,
  serviceName: string,
}

export interface NewrelicSegmentApi {
  enabled: boolean,
}

export interface NewrelicMetricsApi {
  enabled: boolean,
  accountApiKey: string,
}

export interface NewrelicEventsApi {
  enabled: boolean,
  accountApiKey: string,
}

export interface TelemetryCollector {
  API_KEY: string,
  SERVICE_NAME: string,
  HOST: string,
  specList: TelemetrySpecMetadata[],
  extractFullMessage: (spec: any) => Nullable<string>,
  extractFromSpec: (spec: any, event: any) => TelemetrySpecMetadata,
  updateSpecList: (specMetadata: TelemetrySpecMetadata) => void,
  sendTracing: (spec: TelemetrySpecMetadata) => Promise<void | boolean | string>
}

export interface TelemetrySpecMetadata {
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

export interface BaseMetricsResponse {
  err?: any,
  statusCode?: any,
  body?: any,
}

