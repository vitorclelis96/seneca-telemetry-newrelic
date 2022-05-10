
// http://localhost:8000/p1?x=1


const NewRelic = require('newrelic')
const Express = require('express')
const Seneca = require('seneca')


setupSeneca()


function setupSeneca() {
  Seneca()
    .test()
    .add('a:1', function a1(msg, reply, meta) {
      NewRelic.startSegment(meta.pattern+'~'+meta.action, true, (endSegment)=>{

        setTimeout(()=>{
          this.act('b:1', {x:msg.x}, function(err, out) {
            reply({x:2*out.x})
            endSegment()
          })
        }, 400+(400*Math.random()))

      }, function endSegment() {})
    })
    .add('a:1', function a1p(msg, reply, meta) {
      NewRelic.startSegment(meta.pattern+'~'+meta.action, true, (endSegment)=>{

        setTimeout(()=>{
          this.prior(msg, function(err, out) {
            reply({x:out.x+0.5})
            endSegment()
          })
        }, 400+(400*Math.random()))

      }, function endSegment() {})
    })
    .add('b:1', function b1(msg, reply, meta) {
      NewRelic.startSegment(meta.pattern+'~'+meta.action, true, (endSegment)=>{

        setTimeout(()=>{
          reply({x:1+msg.x})
          endSegment()
        }, 400+(400*Math.random()))

      }, function endSegment() {})
    })
    .ready(function() {
      setupExpress(this)
    })
}


function setupExpress(seneca) {
  Express()
    .get('/p1', function p1(req, res) {
      let x = parseInt(req.query.x || 1)

      seneca.act('a:1', {x}, function p1r(err, out, meta) {
        res.send({ ...out, t:Date.now() })
      })
    })
    .listen(8000)
}
