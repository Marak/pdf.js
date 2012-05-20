<?php
require_once 'makefont.php';
$font = 'times.ttf'; //path to font file
$enc = 'cp1250'; // encoding used in font - default: cp1252
$embed = true; // font is embeded to pdf file
makefont($font, $enc, $embed);
