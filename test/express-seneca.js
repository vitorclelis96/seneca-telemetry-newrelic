
// http://localhost:8000/p1?x=1

const NewRelic = require('newrelic')
const Express = require('express')
const Seneca = require('seneca')
const Plugin = require('..')

setupSeneca()


function setupSeneca() {
  Seneca()
    .test()
    .use(Plugin)
    .add('a:1', function a1(msg, reply, meta) {
      setTimeout(()=>{
        this.act('b:1', {x:msg.x}, function(err, out) {
          reply({x:2*out.x})
        })
      }, 400+(400*Math.random()))
    })
    .add('a:1', function a1p(msg, reply, meta) {
      setTimeout(()=>{
        this.prior(msg, function(err, out) {
          reply({x:out.x+0.5})
        })
      }, 400+(400*Math.random()))
    })
    .add('b:1', function b1(msg, reply, meta) {
      setTimeout(()=>{
        reply({x:1+msg.x})
      }, 400+(400*Math.random()))
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
