
# pdf.js - create basic pdf files in the browser or node.js, simple as cake
<img src = "http://i.imgur.com/CIAll.jpg" border = "0">
### online demo @ <a href = "http://maraksquires.com/pdf.js/" target = "_blank">http://maraksquires.com/pdf.js/</a>
## USAGE
### browser - 
  
      <script src = "./lib/pdf.js" type = "text/javascript"></script>
      <script>

        /* create the PDF document */

          var doc = new pdf();
          doc.text(20, 20, 'hello, I am PDF.');
          doc.text(20, 30, 'i was created in the browser using javascript.');
          doc.text(20, 40, 'i can also be created from node.js');

          /* Optional - set properties on the document */
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

          var fileName = "testFile"+new Date().getSeconds()+".pdf";
          var pdfAsDataURI = doc.output('datauri', {"fileName":fileName});

        /* inject the pdf into the browser */

          // inject using an iframe
          // this seems to work in FF but not Chrome? try testing some more on your own >.<
          //$('#theFrame').attr('src',pdfAsDataURI);

          // inject using an object tag
          // doesnt really work but it does something interesting
          //$('body').append('<object data="'+pdfAsDataURI+'" type="application/pdf"></object>');

          // inject changing document.location
          // doesn't work in FF, kinda works in Chrome. this method is a bit brutal as the user sees a huge URL
          // document.location = pdfAsDataURI;

          // create a link
          // this seems to always work, except clicking the link destroys my FF instantly 
          $('#pdfLink').html('<a href = "'+pdfAsDataURI+'">'+fileName+'</a> <span class = "helper">right click and save file as pdf</span');

      </script>
### node.js - 
      var sys = require('sys');
      var fs = require('fs');
      var pdf = require('./lib/pdf').pdf;

      /* create the PDF document */

      var doc = new pdf();
      doc.text(20, 20, 'hello, I am PDF.');
      doc.text(20, 30, 'i was created using node.js version: ' + process.version);
      doc.text(20, 40, 'i can also be created from the browser');

      /* optional - set properties on the document */
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

      var fileName = "testFile"+new Date().getSeconds()+".pdf";

      fs.writeFile(fileName, doc.output(), function(err, data){
        sys.puts(fileName +' was created! great success!');
      });
    
## Authors
#### Marak Squires and Matthew Bergman
Heavily inspired by James Hall's jsPDF 