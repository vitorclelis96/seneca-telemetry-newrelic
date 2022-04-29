

const Seneca = require('seneca')


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

const specList = [];

const extractFromSpec = (spec, event) => {
  const metadata = {
    id: spec.data.meta.id,
    tx_id: spec.data.meta.tx,
    mi_id: spec.data.meta.mi,
    plugin_name: spec.ctx.actdef.plugin_fullname,
    pattern: spec.ctx.actdef.pattern,
    msg: JSON.stringify(spec.data.msg),

  }
  if (event === 'outward') {
    metadata.duration = spec.ctx.duration;
    metadata.endTime = spec.data.meta.end;
    metadata.res = spec.data.res;
  }
  if (event === 'inward') {
    metadata.startTime = spec.data.meta.start;
  }
  return metadata;
};

/*
[
  {
    tx_id: "asd12",
    stackList: [

    ] 
  }
]
*/

const updateSpecList = (specMetadata) => {
  const spec = specList.find((s) => s.tx_id === specMetadata.tx_id);
  if (spec) {
    const actionExists = spec.stackList.find((ss) => ss.mi_id === specMetadata.mi_id);
    if (actionExists) {
      Object.assign(actionExists, specMetadata);
    } else {
      spec.stackList.push(specMetadata);
    }
  } else {
    specList.push({
      tx_id: specMetadata.tx_id,
      stackList: [specMetadata],
    });
  }
}

s01.order.inward.add(spec=>{
  if(spec.data.msg.m) {
    const specMetadata = extractFromSpec(spec, 'inward');
    updateSpecList(specMetadata);
  }
})


s01.order.outward.add(spec=>{
  if(spec.data.msg.m) {
    const specMetadata = extractFromSpec(spec, 'outward');
    updateSpecList(specMetadata);
    // console.log(JSON.stringify(specList));
  }
})

/*
  Things I've discovered:
    inward and outward .add functions get called several times.
    All inwards run before the first outward
    Inward hooks runs before a function gets executed, and the outward hook
      runs after a function finishes.
*/

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


s01.act('m:1,k:2', Seneca.util.print) // { k: 6 }


s01.act('m:2,k:8', Seneca.util.print) // { k: 27 }


console.log(1651168356392 > 1651168356248)
