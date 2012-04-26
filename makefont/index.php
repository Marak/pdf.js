<?php
require_once 'makefont.php';
$font = 'ubuntu.ttf'; //path to font file
$enc = 'cp1250'; // encoding used in font - default: cp1252
$embed = true; // font is embeded to pdf file
makefont($font.'.ttf', $enc, $embed);
echo "<br>".file_get_contents($font.".js");
