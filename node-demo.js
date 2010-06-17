var sys = require('sys');
var pdf = require('./lib/pdf').pdf;
var fs = require('fs');

var today = new Date().getTime();

var doc = new pdf();
doc.text(20, 20, 'hello, I am a PDF file.');
doc.text(20, 30, 'i was created using node.js version: ' + process.version);

doc.text(20, 40, 'sup mang');


doc.addPage();

fs.writeFile('test.pdf', doc.output(), function(err, data){
  sys.puts('file written');
});

