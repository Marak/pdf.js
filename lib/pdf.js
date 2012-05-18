/*

Original Project
Copyright (c) 2009 James Hall http://code.google.com/p/jspdf/
https://github.com/MrRio/jsPDF

Contributor(s) - pdf.js
Copyright (c) 2010 Marak Squires http://github.com/marak/pdf.js/
Copyright (c) 2012 Stekot Squires http://github.com/stekot/pdf.js/


Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 
 */

/* dual-side hack, i sorry */
var sprintf;
var Base64;
if (typeof exports == 'undefined') {
	var exports = window;
	var Base64 = window;
}
if (!Object.keys) {
	Object.keys = function(o) {
		if (o !== Object(o))
			throw new TypeError('Object.keys called on non-object');
		var ret = [];
		for ( var p in o)
			if (Object.prototype.hasOwnProperty.call(o, p))
				ret.push(p);
		return ret;
	};
}

var pdf = exports.pdf = function(listener) {

	// Private properties
	var version = '20120510';
	var buffer = '';

	var pdfVersion = '1.3'; // PDF Version
	var defaultPageFormat = 'a4';
	var pageFormats = { // Size in mm of various paper formats
		'a3' : [ 841.89, 1190.55 ],
		'a4' : [ 595.28, 841.89 ],
		'a5' : [ 420.94, 595.28 ],
		'letter' : [ 612, 792 ],
		'legal' : [ 612, 1008 ]
	};
	var page = 0;
	var objectNumber = 2; // 'n' Current object number
	var state = 0; // Current document state
	var pages = new Array();
	var offsets = new Array(); // List of offsets
	var lineWidth = 0.200025; // 2mm
	var pageHeight;
	var pageWidth;
	var pageHeightPt;
	var pageWidthPt;
	var k; // Scale factor
	var unit = 'mm'; // Default to mm for units
	var documentProperties = {};
	var fontSize = 16; // Default font size
	var pageFontSize = 16;
	var font = 'Helvetica'; // Default font
	var pageFont = font;
	var fonts = {}; // fonts holder, namely use in putRessource
	var fontData = {}; // fonts data
	var fontIndex = 0; // F1, F2, etc. using setFont
	var fontsNumber = {}; // object number holder for fonts
	var encodings = {};
	var curEnc = null;
	var baseFonts = {
		courier : 'Courier',
		courierB : 'Courier-Bold',
		courierI : 'Courier-Oblique',
		courierBI : 'Courier-BoldOblique',
		helvetica : 'Helvetica',
		helveticaB : 'Helvetica-Bold',
		helveticaI : 'Helvetica-Oblique',
		helveticaBI : 'Helvetica-BoldOblique',
		times : 'Times-Roman',
		timesB : 'Times-Bold',
		timesI : 'Times-Italic',
		timesBI : 'Times-BoldItalic',
		symbol : 'Symbol',
		zapfdingbats : 'ZapfDingbats'
	};
	var images = {};

	var lMargin = 30;
	var rMargin = 30;
	var tMargin = 30;
	var bMargin = 30;
	var curX, curY;
	var stringWidths = {};
	var openConnections = 0;
	var replacement = {};
	var outputFlag = false;
	var createCon = function() {
		openConnections++;
	};
	var closeCon = function() {
		openConnections--;
		if (openConnections == 0 && outputFlag) {
			var type = outputFlag[0];
			var opts = outputFlag[1];
			outputFlag = false;
			_output(type, opts);
		}
	};

	// Initilisation
	if (unit == 'pt') {
		k = 1;
	} else if (unit == 'mm') {
		k = 72 / 25.4;
	} else if (unit == 'cm') {
		k = 72 / 2.54;
	} else if (unit == 'in') {
		k = 72;
	}

	var lMarginPt = lMargin / k;
	var rMarginPt = rMargin / k;
	var tMarginPt = tMargin / k;
	var bMarginPt = bMargin / k;

	// Private functions
	var newObject = function() {
		// Begin a new object
		objectNumber++;
		offsets[objectNumber] = buffer.length;
		out(objectNumber + ' 0 obj');
	};

	var putHeader = function() {
		out('%PDF-' + pdfVersion);
	};

	var putPages = function() {

		var wPt = pageWidth * k;
		var hPt = pageHeight * k;

		for ( var n = 1; n <= page; n++) {
			newObject();
			out('<</Type /Page');
			out('/Parent 1 0 R');
			out('/Resources 2 0 R');
			out('/Contents ' + (objectNumber + 1) + ' 0 R>>');
			out('endobj');

			// Page content
			p = pages[n];
			newObject();
			out('<</Length ' + p.length + '>>');
			putStream(p);
			out('endobj');
		}
		offsets[1] = buffer.length;
		out('1 0 obj');
		out('<</Type /Pages');
		var kids = '/Kids [';
		for ( var i = 0; i < page; i++) {
			kids += (3 + 2 * i) + ' 0 R ';
		}
		out(kids + ']');
		out('/Count ' + page);
		out(sprintf('/MediaBox [0 0 %.2f %.2f]', wPt, hPt));
		out('>>');
		out('endobj');
	};

	var putStream = function(str, b64) {
		// FIXME add support for binary objects
		out('stream');
		if (b64) {
			out(Base64.decode(str));
		} else {
			out(str);
		}
		out('endstream');
	};

	var putResources = function() {
		// Deal with fonts, defined in fonts by user (using setFont).
		if (!fontIndex) {
			fonts[font] = 0;
		}
		putFonts();
		putImages();

		// Resource dictionary
		offsets[2] = buffer.length;
		out('2 0 obj');
		out('<<');
		putResourceDictionary();
		out('>>');
		out('endobj');
	};

	var putFonts = function() {
		// put encodings
		for (enc in encodings) {
			newObject();
			out('<</Type /Encoding /BaseEncoding /WinAnsiEncoding '
					+ '/Differences [' + encodings[enc]['diff'] + ']');
			out('>>');
			out('endobj');
			encodings[enc]['i'] = objectNumber;
		}
		for (f in fonts) {
			newObject();
			fontsNumber[f] = objectNumber;
			// basefonts
			if (!(f in fontData)) {
				out('<</Type /Font');
				out('/BaseFont /' + f);
				out('/Subtype /Type1');
				if (f != 'Symbol' || f != 'ZapfDingbats') {
					out('/Encoding /WinAnsiEncoding');
				}
				out('>>');
				out('endobj');
			}
			// embeded fonts
			else {
				var f = fontData[f];
				out('<</Type /Font');
				out('/BaseFont /' + f['name']);
				out('/Subtype /' + f['type']);
				if ('enc' in f) {
					out('/FirstChar 0 /LastChar 255');
					out('/Encoding ' + encodings[f['enc']]['i'] + ' 0 R');
				} else {
					out('/Encoding /WinAnsiEncoding');
				}
				out('/FontDescriptor ' + (objectNumber + 1) + ' 0 R');
				out('/Widths '+ (objectNumber + 2) +' 0 R');
				out('>>');
				out('endobj');
				newObject();
				out('<</Type /FontDescriptor /FontName /' + f['name']);
				for (d in f['desc']) {
					out(' /' + d + ' ' + f['desc'][d]);
				}
				if ('file' in f) {
					out(' /FontFile' + (f['type'] == 'Type1' ? '' : '2') + ' '
							+ (objectNumber + 1) + ' 0 R');
					out('>>');
					out('endobj');
					newObject();
					out('<</Length ' + f['filesize']);
					out('/Filter /FlateDecode');
					out('/Length1 ' + f['originalsize']);
					out('>>');
					putStream(f['file']);
					out('endobj');
				} else {
					out('>>');
					out('endobj');
				}
				newObject();
				out('[ ' + (f['cw'].join(' '))+ ' ]');
				out('endobj');
			}
		}
	};

	var putImg = function(img, url) {
		newObject();
		// $this->_newobj();
		// FIXME
		images[url]['n'] = objectNumber;
		out('<</Type /XObject');
		out('/Subtype /Image');
		out('/Width ' + img['w']);
		out('/Height ' + img['h']);
		if (img['cs'] === 'Indexed') {
			out('/ColorSpace [/Indexed /DeviceRGB '
					+ (img['pal'].length / 3 - 1) + ' ' + (objectNumber + 1)
					+ ' 0 R]');
		} else {
			out('/ColorSpace /' + img['cs']);
			if (img['cs'] === 'DeviceCMYK') {
				out('/Decode [1 0 1 0 1 0 1 0]');
			}
		}
		out('/BitsPerComponent ' + img['bpc']);
		if ('f' in img) {
			out('/Filter /' + img['f']);
		}
		if ('dp' in img) {
			out('/DecodeParms <<' + img['dp'] + '>>');
		}
		if ('trns' in img && img['trns'].constructor == Array) {
			var trns = '';
			for ( var i = 0; i < img['trns'].length; i++) {
				trns += (img[trns][i] + ' ' + img['trns'][i] + ' ');
				out('/Mask [' + trns + ']');
			}
		}
		if ('smask' in img) {
			out('/SMask ' + (objectNumber + 1) + ' 0 R');
		}
		out('/Length ' + img['data'].length + '>>');
		putStream(img['data']);
		out('endobj');
	};

	var putImages = function() {
		for ( var url in images) {
			putImg(images[url], url);
		}
	};

	var _drawLine = function(x1, y1, x2, y2, weight, style) {
		if (typeof weight === "undefined" || weight < 0) {
			weight = 1;
		}

		if (typeof style === "undefined") {
			style = '[] 0 d';
		} else {
			if (style === 'dotted') {
				style = '[1 2] 1 d';
			} else if (style === 'dashed') {
				style = '[4 2] 2 d';
			} else {
				style = '[] 0 d';
			}
		}

		var str = sprintf(
				'\n/LEP BMC \nq\n0 G\n%.2f w\n%s\n0 J\n1 0 0 1 0 0 cm\n%.2f '
						+ '%.2f m\n%.2f %.2f l\nS\nQ\nEMC\n', weight, style, k
						* x1, k * (pageHeight - y1), k * x2, k
						* (pageHeight - y2));
		out(str);
	};

	var putResourceDictionary = function() {
		var i = 0, index, fx;

		out('/ProcSet [/PDF /Text /ImageB /ImageC /ImageI]');
		out('/Font <<');

		// Do this for each font, the '1' bit is the index of the font
		// fontNumber is currently the object number related to 'putFonts'
		for (index in fontsNumber) {
			out(fonts[index] + ' ' + fontsNumber[index] + ' 0 R');
		}

		out('>>');
		out('/XObject <<');
		putXobjectDict();
		out('>>');
	};

	var putXobjectDict = function() {
		for (img in images) {
			out('/I' + images[img]['i'] + ' ' + images[img]['n'] + ' 0 R');
		}

	};

	var putInfo = function() {
		out('/Producer (pdf.js ' + version + ')');
		if (documentProperties.title != undefined) {
			out('/Title (' + pdfEscape(documentProperties.title) + ')');
		}
		if (documentProperties.subject != undefined) {
			out('/Subject (' + pdfEscape(documentProperties.subject) + ')');
		}
		if (documentProperties.author != undefined) {
			out('/Author (' + pdfEscape(documentProperties.author) + ')');
		}
		if (documentProperties.keywords != undefined) {
			out('/Keywords (' + pdfEscape(documentProperties.keywords) + ')');
		}
		if (documentProperties.creator != undefined) {
			out('/Creator (' + pdfEscape(documentProperties.creator) + ')');
		}
		var created = new Date();
		var year = created.getFullYear();
		var month = (created.getMonth() + 1);
		var day = created.getDate();
		var hour = created.getHours();
		var minute = created.getMinutes();
		var second = created.getSeconds();
		out('/CreationDate (D:'
				+ sprintf('%02d%02d%02d%02d%02d%02d', year, month, day, hour,
						minute, second) + ')');
	};

	var putCatalog = function() {
		out('/Type /Catalog');
		out('/Pages 1 0 R');
		// TODO: Add zoom and layout modes
		out('/OpenAction [3 0 R /FitH null]');
		out('/PageLayout /OneColumn');
	};

	var putTrailer = function() {
		out('/Size ' + (objectNumber + 1));
		out('/Root ' + objectNumber + ' 0 R');
		out('/Info ' + (objectNumber - 1) + ' 0 R');
	};

	var unicodeToAscii = function(text) {
		if (!curEnc || !text) {
			return text;
		}
		returnText = [];
		for ( var i = 0; i < text.length; i++) {
			var charCode = text.charCodeAt(i);
			if (charCode in encodings[curEnc]['uni2ascii']) {
				charCode = encodings[curEnc]['uni2ascii'][charCode];
			}
			returnText.push(String.fromCharCode(charCode));
		}
		return returnText.join('');
	};

	var getStringWidthCSS = function(text) {
		// FIXME: include bold fonts.
		// using CSS
		var span = document.createElement('span');
		span.style.position = 'absolute';
		span.style.visibile = 'hidden';
		span.style.whiteSpace = 'pre';
		span.style.height = 'auto';
		span.style.width = 'auto';
		span.style.fontSize = fontSize;
		if (font in fontData) {
			span.style.fontFamily = fontData[font['cssname']];
		} else {
			span.style.fontFamily = baseFonts[font];
		}
		(document.getElementsByTagName('body')[0]).appendChild(span);
		span.textContent = text;
		var width = span.offsetWidth / k;
		span.parentNode.removeChild(span);
		return width;
	};
	// pouzit prostredi listing latex
	var getStringWidthAFM = function(text) {
		if (text in stringWidths) {
			return stringWidths[text];
		}
		text2 = unicodeToAscii(text);
		width = 0;
		len = text2.length;
		for ( var i = 00; i < len; i++) {
			var charCode = text2.charCodeAt(i);
			width += fontData[font]['cw'][charCode];
		}
		if (width == undefined) {
			raise("width is undefined");
		}
		width = width * fontSize / 2834 / 0.5176945533026998 / k;
		if (buffer) {
			stringWidths[text] = width;
		}
		return width;
	};

	var getStringWidth = function(text, buffer) {
		if (buffer === undefined) {
			buffer = false;
		}
		if (buffer && text in stringWidths) {
			return stringWidths[text];
		}
		if (font in fontData) {
			var width = getStringWidthAFM(text, buffer);
		} else {
			var width = getStringWidthCSS(text, buffer);
		}
		if (buffer) {
			stringWidths[text] = width;
		}
		return width;
	}

	var endDocument = function() {
		state = 1;
		putHeader();
		putPages();
		putResources();
		// Info
		newObject();
		out('<<');
		putInfo();
		out('>>');
		out('endobj');

		// Catalog
		newObject();
		out('<<');
		putCatalog();
		out('>>');
		out('endobj');

		// Cross-ref
		var o = buffer.length;
		out('xref');
		out('0 ' + (objectNumber + 1));
		out('0000000000 65535 f ');
		for ( var i = 1; i <= objectNumber; i++) {
			out(sprintf('%010d 00000 n ', offsets[i]));
		}
		// Trailer
		out('trailer');
		out('<<');
		putTrailer();
		out('>>');
		out('startxref');
		out(o);
		out('%%EOF');
		state = 3;
		for (r in replacement) {
			buffer = buffer.replace(r, replacement[r]);
		}
	};

	var beginPage = function() {
		page++;
		// Do dimension stuff
		state = 2;
		pages[page] = '';

		pageHeightPt = pageFormats[defaultPageFormat][1];
		pageWidthPt = pageFormats[defaultPageFormat][0];
		pageHeight = pageFormats[defaultPageFormat][1] / k;
		pageWidth = pageFormats[defaultPageFormat][0] / k;
		curX = lMarginPt;
		curY = tMarginPt;
	};

	var out = function(str) {
		if (state == 2) {
			pages[page] += str + '\n';
		} else {
			buffer += str + '\n';
		}
	};

	var _setFont = function(f) {
		stringWidths = {};
		if (!(f in fonts)) {
			// if not known font yet, add in fonts array, then used in
			// endDocument while putting ressource
			fonts[f] = '/F' + (fontIndex++);

		}
		font = f;
		if (f in fontData) {
			curEnc = fontData[f]['enc'];
		}
	};

	var _addFont = function(family, style, data) {
		var fontKey = family + style;
		if (!(fontKey in fonts)) {
			fonts[fontKey] = '/F' + fontIndex;
			if (data) {
				data['i'] = fontIndex;
				if ('enc' in data) {
					_addEncoding(data['enc'], data['uni2ascii'], data['diff']);
					data['diff'] = undefined;
					data['uni2ascii'] = undefined
				}
				if ('file' in data) {
					data['file'] = Base64.decode(data['file']);
				}
				fontData[fontKey] = data;
			}
			fontIndex++;
		}
	};

	var _addEncoding = function(enc, uni2ascii, diff) {
		if (!(enc in encodings)) {
			encodings[enc] = {};
			encodings[enc]['uni2ascii'] = uni2ascii;
			encodings[enc]['diff'] = diff.replace("\\");
			encodings[enc]['i'] = null;
		}
	};

	_setFont(font);
	var _addPage = function() {
		beginPage();
		// Set line width
		out(sprintf('%.2f w', (lineWidth * k)));

		// 16 is the font size
		pageFontSize = fontSize;
		pageFont = font;
		out('BT ' + fonts[font] + ' ' + parseInt(fontSize) + '.00 Tf ET');
	};

	// Add the first page automatically
	_addPage();

	// Escape text
	var pdfEscape = function(text) {
		return text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g,
				'\\)');
	};

	var _output = function(type, options) {
		endDocument();
		if (!options) {
			var options = {};
		}
		if (!options.fileName) {
			options.fileName = 'doc.pdf';
		}
		if (type === 'datauri') {
			listener('data:application/pdf;filename=' + options.fileName
					+ ';base64,' + Base64.encode(buffer));
		} else {
			listener(buffer);
		}
		// @TODO: Add different output options
	};

	return {
		addPage : function() {
			_addPage();
		},
		text : function(x, y, text, f) {
			if (f) {
				this.setFont(f);
			}

			// need either page height or page font
			if (pageFontSize !== fontSize || pageFont !== font) {
				pageFontSize = fontSize;
				pageFont = font;
			}
			text = unicodeToAscii(text);
			var str = sprintf('BT %.2f %.2f Td (%s) Tj ET', x * k,
					(pageHeight - y) * k, pdfEscape(text));
			out('BT ' + (fonts[font] ? fonts[font] : '/F0') + ' '
					+ parseInt(fontSize, 10) + '.00 Tf ET');
			out(str);
		},
		write : function(h, text, f, w) {
			if (f) {
				this.setFont(f);
			}
			text = text.replace('\r', '');
			var maxW = pageWidth - lMarginPt - rMarginPt - 60;
			if (w) {
				maxW = w;
			}
			var lineW = 0;
			var sep = -1;
			var n = text.length;
			var i = 0; // actual letter
			var j = 0; // last line break
			this.newLine(h);
			if (getStringWidth(text) < pageWidth) {
				this.text(curX, curY, text);
				this.newLine(h);
			}
			while (i < n) {
				// @TODO add handeling of new line
				letterW = getStringWidth(text[i]);
				if ((lineW) >= maxW) {
					// new line
					this.text(curX, curY, text.substr(j, sep - j));
					j = sep + 1;
					sep = -1;
					i = j;
					lineW = 0;
					this.newLine(h);
					if (getStringWidth(text.substr(i, n)) < maxW) {
						this.text(curX, curY, text.substr(i, n));
						this.newLine(h);
						i = n;
					}
					i++;
					continue;
				}
				if (text[i] === ' ') {
					sep = i;
				}
				lineW += letterW;
				i++;
				if (i == n) {// end of the text
					this.text(curX, curY, text.substr(j, sep - i));
					this.newLine(h);
				}

			}
		},
		newLine : function(h) {
			if (pageHeight - bMargin < curY) {
				_addPage();
			}
			curY += h;
		},
		drawRect : function(x, y, w, h, style) {
			var op = 'S';
			if (style === 'F') {
				op = 'f';
			} else if (style === 'FD' || style === 'DF') {
				op = 'B';
			}
			out(sprintf('%.2f %.2f %.2f %.2f re %s', x * k, (pageHeight - y)
					* k, w * k, -h * k, op));
		},
		drawLine : _drawLine,
		setProperties : function(properties) {
			documentProperties = properties;
		},
		setFontSize : function(size) {
			stringWidths = {};
			fontSize = size;
		},
		setFont : _setFont,
		addFont : _addFont,
		image : function(obj, x, y, w, h) {
			if (typeof (obj) === 'string') {
				var url = obj;
				var replacementKey = sprintf('{{img%s}}', Object
						.keys(replacement).length);
				replacement[replacementKey] = '';
				out(replacementKey);
				if (!(url in images)) {
					images[url] = {};
					images[url]['i'] = (Object.keys(images).length + 1);
				}
				var i = images[url]['i'];
				var img = new Image();
				createCon();
				img.onload = function() {
					var canvas = document.getElementById('canvas');
					canvas = document.createElement('canvas');
					document.body.appendChild(canvas);
					var height = img.height;
					var width = img.width;
					canvas.width = width;
					canvas.height = height;
					var ctx = canvas.getContext("2d");
					ctx.drawImage(img, 0, 0);
					var info = {
						w : width,
						h : height,
						cs : 'DeviceRGB',
						bpc : 8,
						f : 'DCTDecode',
						i : i,
						data : Base64.decode(canvas.toDataURL("image/jpeg")
								.replace('data:image/jpeg;base64,', ''))
					};
					document.body.removeChild(canvas);
					images[url] = info;
					if (!w && !h) {
						w = -96;
						h = -96;
					}
					if (w < 0) {
						w = (-1) * info['w'] * 72 / w / k;
					}
					if (h < 0) {
						h = (-1) * info['h'] * 72 / h / k;
					}
					if (w === 0) {
						w = h * info['w'] / info['h'];
					}
					if (h === 0) {
						h = w * info['h'] / info['w'];
					}
					replacement[replacementKey] = sprintf(
							'q %.2f 0 0 %.2f %.2f %.2f cm /I%d Do Q', w * k, h
									* k, x * k, (pageHeight - (y + h)) * k,
							info['i']);
					closeCon();
				};
				img.src = url;
			}
			if (typeof (obj) === 'object') {
				if (obj.tagName.toLowerCase() !== 'img'
						&& obj.tagName.toLowerCase() !== 'canvas') {
					raise("unknown type");
				}
				var url = 'document' + (Object.keys(images).length + 1);
				images[url] = {};
				images[url]['i'] = (Object.keys(images).length + 1);
				var i = images[url]['i'];
				if (obj.tagName.toLowerCase() === 'img') {
					var img = obj;
					var canvas = document.getElementById('canvas');
					canvas = document.createElement('canvas');
					document.body.appendChild(canvas);
					canvas.width = img.width;
					canvas.height = img.height;
					var ctx = canvas.getContext("2d");
					ctx.drawImage(img, 0, 0);
				} else {
					var canvas = obj;
				}
				var info = {
					w : canvas.width,
					h : canvas.height,
					cs : 'DeviceRGB',
					bpc : 8,
					f : 'DCTDecode',
					i : i,
					data : Base64.decode(canvas.toDataURL("image/jpeg")
							.replace('data:image/jpeg;base64,', ''))
				};
				if (obj.tagName.toLowerCase() === 'img') {
					document.body.removeChild(canvas);
				}
				images[url] = info;
				if (!w && !h) {
					w = -96;
					h = -96;
				}
				if (w < 0) {
					w = (-1) * info['w'] * 72 / w / k;
				}
				if (h < 0) {
					h = (-1) * info['h'] * 72 / h / k;
				}
				if (w === 0) {
					w = h * info['w'] / info['h'];
				}
				if (h === 0) {
					h = w * info['h'] / info['w'];
				}
				out(sprintf('q %.2f 0 0 %.2f %.2f %.2f cm /I%d Do Q', w * k, h
						* k, x * k, (pageHeight - (y + h)) * k, info['i']));
			}
		},
		table : function(header, data, opts) {
			var widths = opts.innerWidths;
			var height = opts.innerHeight;
			var headerHeight = opts.headerInnerHeight;
			if (!headerHeight) {
				headerHeight = height;
			}
			var charHeight = opts.charHeight;
			var headerCharHeight = opts.headerCharHeight;
			if (!headerCharHeight) {
				headerCharHeight = charHeight;
			}
			var padding = opts.padding;
			var headerPadding = opts.headerPadding;
			if (!headerPadding) {
				headerPadding = padding;
			}
			var font2 = opts.font;
			if (!font2) {
				font2 = font;
			}
			var fontSize2 = opts.fontSize;
			if (!fontSize2) {
				fontSize2 = fontSize;
			}
			var headerFont = opts.headerFont;
			if (!headerFont) {
				headerFont = font2;
			}
			var headerFontSize = opts.headerFontSize;
			if (!headerFontSize) {
				headerFontSize = fontSize2;
			}
			var borderStyle = opts.borderStyle;
			var orX = curX;
			var orY = curY;
			var orFontSize = fontSize;
			var orFont = font;
			this.setFontSize(headerFontSize);
			this.setFont(headerFont);
			for ( var i = 0; i < header.length; i++) {
				if (borderStyle) {
					this.drawRect(curX - headerPadding, curY - headerPadding,
							widths[i] + (2 * headerPadding), height
									+ (2 * headerPadding), 'B');
				}
				this.write(headerCharHeight, header[i], undefined, widths[i]);
				curY = orY;
				curX += widths[i] + padding * 2;
			}
			this.setFontSize(orFontSize);
			this.setFont(orFont);
			this.setFontSize(fontSize2);
			this.setFont(font2);
			for ( var j = 0; j < data.length; j++) {
				curX = orX;
				orY += height + padding * 2;
				curY = orY;
				for ( var i = 0; i < data[j].length; i++) {
					if (borderStyle) {
						this.drawRect(curX - padding, curY - padding, widths[i]
								+ (2 * padding), height + (2 * padding),
								'dotted');
					}
					this.write(charHeight, data[j][i], undefined, widths[i]);
					curY = orY;
					curX += widths[i] + padding * 2;
				}
			}
		},
		output : function(type, options) {
			if (openConnections == 0) {
				_output(type, options);
			} else {
				outputFlag = [ type, options ];
			}
		},
	};
};

/**
 * 
 * Base64 encode / decode http://www.webtoolkit.info/
 * 
 */

// private property
var keyStr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";

// public method for encoding
exports.encode = function(input) {
	var output = "";
	var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
	var i = 0;

	// input = utf8_encode(input);

	while (i < input.length) {

		chr1 = input.charCodeAt(i++);
		chr2 = input.charCodeAt(i++);
		chr3 = input.charCodeAt(i++);

		enc1 = chr1 >> 2;
		enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
		enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
		enc4 = chr3 & 63;

		if (isNaN(chr2)) {
			enc3 = enc4 = 64;
		} else if (isNaN(chr3)) {
			enc4 = 64;
		}

		output = output + keyStr.charAt(enc1) + keyStr.charAt(enc2)
				+ keyStr.charAt(enc3) + keyStr.charAt(enc4);

	}

	return output;
};

// public method for decoding
exports.decode = function(input) {
	var output = "";
	var chr1, chr2, chr3;
	var enc1, enc2, enc3, enc4;
	var i = 0;

	input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");

	while (i < input.length) {

		enc1 = keyStr.indexOf(input.charAt(i++));
		enc2 = keyStr.indexOf(input.charAt(i++));
		enc3 = keyStr.indexOf(input.charAt(i++));
		enc4 = keyStr.indexOf(input.charAt(i++));

		chr1 = (enc1 << 2) | (enc2 >> 4);
		chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
		chr3 = ((enc3 & 3) << 6) | enc4;

		output = output + String.fromCharCode(chr1);

		if (enc3 != 64) {
			output = output + String.fromCharCode(chr2);
		}
		if (enc4 != 64) {
			output = output + String.fromCharCode(chr3);
		}

	}

	// output = utf8_decode(output);

	return output;

};

// private method for UTF-8 encoding
function utf8_encode(string) {
	string = string.replace(/\r\n/g, "\n");
	var utftext = "";

	for ( var n = 0; n < string.length; n++) {

		var c = string.charCodeAt(n);

		if (c < 128) {
			utftext += String.fromCharCode(c);
		} else if ((c > 127) && (c < 2048)) {
			utftext += String.fromCharCode((c >> 6) | 192);
			utftext += String.fromCharCode((c & 63) | 128);
		} else {
			utftext += String.fromCharCode((c >> 12) | 224);
			utftext += String.fromCharCode(((c >> 6) & 63) | 128);
			utftext += String.fromCharCode((c & 63) | 128);
		}

	}

	return utftext;
}

// private method for UTF-8 decoding
function utf8_decode(utftext) {
	var string = "";
	var i = 0;
	var c = c1 = c2 = 0;

	while (i < utftext.length) {

		c = utftext.charCodeAt(i);

		if (c < 128) {
			string += String.fromCharCode(c);
			i++;
		} else if ((c > 191) && (c < 224)) {
			c2 = utftext.charCodeAt(i + 1);
			string += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
			i += 2;
		} else {
			c2 = utftext.charCodeAt(i + 1);
			c3 = utftext.charCodeAt(i + 2);
			string += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6)
					| (c3 & 63));
			i += 3;
		}

	}

	return string;
}

/**
 * ** BUNDLED SOME EXTRA STUFF FOR THE BROWSER, IF YOU REALLY DONT LIKE THIS
 * HERE IN YOUR NODE VERSION YOU CAN DELETE IT.... SORRY... *****
 */
// Modified to work as a CommonJS/NodeJS lib
// Use: sprintf = require("sprintf").sprintf
var sprintf = exports.sprintf = function() {
	// Return a formatted string
	// 
	// version: 903.3016
	// discuss at: http://phpjs.org/functions/sprintf
	// + original by: Ash Searle (http://hexmen.com/blog/)
	// + namespaced by: Michael White (http://getsprink.com)
	// + tweaked by: Jack
	// + improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
	// + input by: Paulo Ricardo F. Santos
	// + improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
	// + input by: Brett Zamir (http://brettz9.blogspot.com)
	// + improved by: Kevin van Zonneveld (http://kevin.vanzonneveld.net)
	// * example 1: sprintf("%01.2f", 123.1);
	// * returns 1: 123.10
	// * example 2: sprintf("[%10s]", 'monkey');
	// * returns 2: '[ monkey]'
	// * example 3: sprintf("[%'#10s]", 'monkey');
	// * returns 3: '[####monkey]'
	var regex = /%%|%(\d+\$)?([-+\'#0 ]*)(\*\d+\$|\*|\d+)?(\.(\*\d+\$|\*|\d+))?([scboxXuidfegEG])/g;
	var a = arguments, i = 0, format = a[i++];

	// pad()
	var pad = function(str, len, chr, leftJustify) {
		if (!chr)
			chr = ' ';
		var padding = (str.length >= len) ? '' : Array(
				1 + len - str.length >>> 0).join(chr);
		return leftJustify ? str + padding : padding + str;
	};

	// justify()
	var justify = function(value, prefix, leftJustify, minWidth, zeroPad,
			customPadChar) {
		var diff = minWidth - value.length;
		if (diff > 0) {
			if (leftJustify || !zeroPad) {
				value = pad(value, minWidth, customPadChar, leftJustify);
			} else {
				value = value.slice(0, prefix.length)
						+ pad('', diff, '0', true) + value.slice(prefix.length);
			}
		}
		return value;
	};

	// formatBaseX()
	var formatBaseX = function(value, base, prefix, leftJustify, minWidth,
			precision, zeroPad) {
		// Note: casts negative numbers to positive ones
		var number = value >>> 0;
		prefix = prefix && number && {
			'2' : '0b',
			'8' : '0',
			'16' : '0x'
		}[base] || '';
		value = prefix + pad(number.toString(base), precision || 0, '0', false);
		return justify(value, prefix, leftJustify, minWidth, zeroPad);
	};

	// formatString()
	var formatString = function(value, leftJustify, minWidth, precision,
			zeroPad, customPadChar) {
		if (precision != null) {
			value = value.slice(0, precision);
		}
		return justify(value, '', leftJustify, minWidth, zeroPad, customPadChar);
	};

	// doFormat()
	var doFormat = function(substring, valueIndex, flags, minWidth, _,
			precision, type) {
		var number;
		var prefix;
		var method;
		var textTransform;
		var value;

		if (substring == '%%')
			return '%';

		// parse flags
		var leftJustify = false, positivePrefix = '', zeroPad = false, prefixBaseX = false, customPadChar = ' ';
		var flagsl = flags.length;
		for ( var j = 0; flags && j < flagsl; j++)
			switch (flags.charAt(j)) {
			case ' ':
				positivePrefix = ' ';
				break;
			case '+':
				positivePrefix = '+';
				break;
			case '-':
				leftJustify = true;
				break;
			case "'":
				customPadChar = flags.charAt(j + 1);
				break;
			case '0':
				zeroPad = true;
				break;
			case '#':
				prefixBaseX = true;
				break;
			}

		// parameters may be null, undefined, empty-string or real valued
		// we want to ignore null, undefined and empty-string values
		if (!minWidth) {
			minWidth = 0;
		} else if (minWidth == '*') {
			minWidth = +a[i++];
		} else if (minWidth.charAt(0) == '*') {
			minWidth = +a[minWidth.slice(1, -1)];
		} else {
			minWidth = +minWidth;
		}

		// Note: undocumented perl feature:
		if (minWidth < 0) {
			minWidth = -minWidth;
			leftJustify = true;
		}

		if (!isFinite(minWidth)) {
			throw new Error('sprintf: (minimum-)width must be finite');
		}

		if (!precision) {
			precision = 'fFeE'.indexOf(type) > -1 ? 6 : (type == 'd') ? 0
					: void (0);
		} else if (precision == '*') {
			precision = +a[i++];
		} else if (precision.charAt(0) == '*') {
			precision = +a[precision.slice(1, -1)];
		} else {
			precision = +precision;
		}

		// grab value using valueIndex if required?
		value = valueIndex ? a[valueIndex.slice(0, -1)] : a[i++];

		switch (type) {
		case 's':
			return formatString(String(value), leftJustify, minWidth,
					precision, zeroPad, customPadChar);
		case 'c':
			return formatString(String.fromCharCode(+value), leftJustify,
					minWidth, precision, zeroPad);
		case 'b':
			return formatBaseX(value, 2, prefixBaseX, leftJustify, minWidth,
					precision, zeroPad);
		case 'o':
			return formatBaseX(value, 8, prefixBaseX, leftJustify, minWidth,
					precision, zeroPad);
		case 'x':
			return formatBaseX(value, 16, prefixBaseX, leftJustify, minWidth,
					precision, zeroPad);
		case 'X':
			return formatBaseX(value, 16, prefixBaseX, leftJustify, minWidth,
					precision, zeroPad).toUpperCase();
		case 'u':
			return formatBaseX(value, 10, prefixBaseX, leftJustify, minWidth,
					precision, zeroPad);
		case 'i':
		case 'd': {
			number = parseInt(+value);
			prefix = number < 0 ? '-' : positivePrefix;
			value = prefix
					+ pad(String(Math.abs(number)), precision, '0', false);
			return justify(value, prefix, leftJustify, minWidth, zeroPad);
		}
		case 'e':
		case 'E':
		case 'f':
		case 'F':
		case 'g':
		case 'G': {
			number = +value;
			prefix = number < 0 ? '-' : positivePrefix;
			method = [ 'toExponential', 'toFixed', 'toPrecision' ]['efg'
					.indexOf(type.toLowerCase())];
			textTransform = [ 'toString', 'toUpperCase' ]['eEfFgG'
					.indexOf(type) % 2];
			value = prefix + Math.abs(number)[method](precision);
			return justify(value, prefix, leftJustify, minWidth, zeroPad)[textTransform]
					();
		}
		default:
			return substring;
		}
	};

	return format.replace(regex, doFormat);
};
