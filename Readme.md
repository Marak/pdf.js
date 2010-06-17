# pdf.js - create basic pdf files in the browser or node.js, simple as cake
<img src = "http://imgur.com/ARmuX.jpg" border = "0">
### online demo @ <a href = "http://maraksquires.com/pdf.js/">http://maraksquires.com/pdf.js/</a>
## USAGE
### browser - 
  
      <script src = "pdf.js" type = "text/javascript"></script>
      <script>
       
       /* create the PDF document */

         var doc = new pdf();
         doc.text(20, 20, 'Hello world!');
         
         /* Optional - set properties on the document */
         doc.setProperties({
         	title: 'A sample document created by pdf.js',
         	subject: 'PDFs are kinda cool, i guess',		
         	author: 'Marak Squires',
         	keywords: 'pdf.js, javascript, Marak, Marak Squires',
         	creator: 'pdf.js'
         });
      
      /* Add Pages */
         doc.addPage();
      
      /* Change Font Sizes */
         doc.setFontSize(22);
         doc.text(20, 20, 'This is a title');

         doc.setFontSize(16);
         doc.text(20, 30, 'This is some normal sized text underneath.');
         var pdfAsDataURI = doc.output('datauri');
      </script>
### node.js - 
     var sys = require('sys');
     var pdf = require('./lib/pdf').pdf;
     var fs = require('fs');

     var today = new Date().getTime();

     var doc = new pdf();
     doc.text(20, 20, 'hello, I am a PDF file.');
     doc.text(20, 30, 'i was created using node.js version: ' + process.version);
     doc.text(20, 40, 'It allows for meta data. This Page has a title, subject, author, keywords and a creator.');
     doc.text(20, 50, 'sup mang');

     // Optional - set properties on the document
     doc.setProperties({
     	title: 'A sample document created by pdf.js',
     	subject: 'PDFs are kinda cool, i guess',		
     	author: 'Marak Squires',
     	keywords: 'pdf.js, javascript, Marak, Marak Squires',
     	creator: 'pdf.js'
     });


     doc.addPage();

     doc.setFontSize(22);
     doc.text(20, 20, 'This is a title');

     doc.setFontSize(16);
     doc.text(20, 30, 'This is some normal sized text underneath.');	

     fs.writeFile('test.pdf', doc.output(), function(err, data){
       sys.puts('file written');
     });
     
## Authors
#### Marak Squires and Matthew Bergman
Heavily inspired by James Hall's jsPDF