const fs = require('fs');

process.on('uncaughtException', (err) => {
    console.log(err)
    process.exit(1);
})

createNewRelicConfigFile()

function createNewRelicConfigFile(callback) {
    console.log("Creating newrelic.js at Node.js application's root directory. \n")
    fs.readFile('./node_modules/newrelic/newrelic.js', (err, data) => {
        if(err) {
            throw new Error(err);
        }
    
        fs.writeFile('./newrelic.js', data, (err) => {
            if (err) throw new Error(err)

            console.log("Done. \n")

        })
    })
}
