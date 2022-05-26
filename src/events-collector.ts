import { events } from "@newrelic/telemetry-sdk/dist/src/telemetry";
import { Event, EventBatch, EventClient } from "@newrelic/telemetry-sdk/dist/src/telemetry/events";
import { BaseMetricsResponse } from "./types";

export function EventsCollector(eventsApiKey: string) {
  const eventsClient = new EventClient({
    apiKey: eventsApiKey,
  });

  function event_handler(this: any, msg: any): Promise<BaseMetricsResponse> {
    const { eventType, attributes, timestamp } = msg;
    const event = new Event(eventType, attributes || {}, timestamp || Date.now());
    const eventBatch = new EventBatch({}, [event]);
    return new Promise((resolve, reject) => {
      eventsClient.send(eventBatch, (err: any, res: any, body: any) => {
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

  return { event_handler };
}