// TODO

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
      async sendTracing(spec: TelemetrySpecMetadata): Promise<string|void|boolean> {
        return new Promise((resolve, reject) => {
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
          const requestData = JSON.stringify(baseData);
          const options = {
            hostname: 'trace-api.newrelic.com',
            port: 443,
            path: '/trace/v1',
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Api-Key': this.API_KEY,
              'Data-Format': 'newrelic',
              'Data-Format-Version': '1',
            },
          };
          const httpRequest = request(options, (res: any) => {});

          httpRequest.on('error', (err: any) => {
            console.log(err)
            reject(err);
          });

          httpRequest.end(requestData, () => {
            console.log('Finished successfully')
            resolve(true);
          })
        })
      },
  }
}