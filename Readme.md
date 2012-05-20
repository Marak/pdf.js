
# pdf.js - create basic pdf files in the browser or node.js, simple as cake
<img src = "http://i.imgur.com/CIAll.jpg" border = "0">
### online demo @ <a href = "http://maraksquires.com/pdf.js/" target = "_blank">http://maraksquires.com/pdf.js/</a>
## USAGE
### browser - 
  
      <script src = "./lib/pdf.js" type = "text/javascript"></script>
      <script>

        /* create the PDF document */

              var doc = new pdf(function(data){
      window.open(data, 'doc');
    });
    /* optional - set properties on the document */
    doc.setProperties({
      title: 'A sample document created by pdf.js',
      subject: 'PDFs are kinda cool, i guess',    
      author: 'Anonymous',
      keywords: 'pdf.js, javascript',
      creator: 'pdf.js'
    });

    doc.text(20, 30, 'You can also override page fonts with text method', 'Times-Roman');
    doc.text(20, 40, 'Monaco -This is some normal sized text underneath.', 'Monaco');
    doc.text(20, 50, 'Times-Roman - This is some normal sized text underneath.', 'Times-Roman');
    doc.text(20, 60, 'Helvetica - This is some normal sized text underneath.', 'Helvetica');
    doc.text(20, 70, 'Courier - This is some normal sized text.', 'Courier');
    doc.addFont('courcs', '', cour);
    doc.setFont('courcs');
    doc.text(20, 80, 'Text with some foreign characters: ìšèøžýáíù');        
    doc.drawLine(100, 100, 100, 120, 1.0, 'dashed');
    doc.drawLine(100, 100, 120, 100, 1.2, 'dotted');
    doc.drawLine(120, 120, 100, 120, 1.4, 'dashed');
    doc.drawLine(120, 120, 120, 100, 1.6, 'solid');
    doc.image('stekot.jpg', 50, 100);

    doc.drawRect(140, 140, 10, 10, 'solid');
    doc.addPage();    
    doc.setFontSize(18);
    doc.setFont('Verdana');
    doc.write(8, 'Lorem ipsum dolor sit amet, consectetuer adipiscing elit. Fusce tellus odio, dapibus id fermentum quis, suscipit id erat. Mauris dolor felis, sagittis at, luctus sed, aliquam non, tellus. Etiam posuere lacus quis dolor. Fusce aliquam vestibulum ipsum. Integer rutrum, orci vestibulum ullamcorper ultricies, lacus quam ultricies odio, vitae placerat pede sem sit amet enim. Mauris dolor felis, sagittis at, luctus sed, aliquam non, tellus. Etiam egestas wisi a erat. Etiam dictum tincidunt diam. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Integer lacinia. Curabitur bibendum justo non orci. Proin mattis lacinia justo.');
    doc.write(8, 'Fusce consectetuer risus a nunc. Maecenas ipsum velit, consectetuer eu lobortis ut, dictum at dui. Mauris dolor felis, sagittis at, luctus sed, aliquam non, tellus. Nulla pulvinar eleifend sem. Fusce tellus odio, dapibus id fermentum quis, suscipit id erat. Aliquam in lorem sit amet leo accumsan lacinia. Mauris metus. Integer malesuada. Mauris suscipit, ligula sit amet pharetra semper, nibh ante cursus purus, vel sagittis velit mauris vel metus. Nullam dapibus fermentum ipsum. Sed convallis magna eu sem. Pellentesque pretium lectus id turpis. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Fusce tellus odio, dapibus id fermentum quis, suscipit id erat. Nunc tincidunt ante vitae massa.');
    
    var fileName = "testFile"+new Date().getSeconds()+".pdf";
    doc.output('datauri', {"fileName":fileName});
      </script>

## Authors
#### Marak Squires, Matthew Bergman and Stepan Kotek
Heavily inspired by James Hall's jsPDF 