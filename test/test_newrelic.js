const newrelic = require('newrelic')


console.log(
    newrelic.recordCustomEvent('VitorLelis', {
        ok: true,
        value: 12,
    })
)