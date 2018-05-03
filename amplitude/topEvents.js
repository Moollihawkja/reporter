/*
Report Generated using data found here:
https://analytics.amplitude.com/org/26411/taxonomy/project/170490/blueprint/events
*/

var fs = require('fs')
  , path = require('path')
;

function run() {
var inputFile = path.join(__dirname, './20180227_taxonomy.csv')
    , data = fs.readFileSync(inputFile, 'utf8').split('\n')
    , header = data.unshift()
    , rows = data.filter(r => !r.startsWith(',,,'))
    , output = header + '\n' + rows.join('\n')
    , outputFile = inputFile.replace(/\.csv$/, '_output.csv')
  ;
  fs.writeFileSync(outputFile, output)
}

run();
