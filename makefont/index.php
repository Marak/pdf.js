<?php
require_once 'makefont.php';
$font = 'COMIC';
$enc = 'cp1250';
makefont($font.'.ttf', $enc, false);
echo "<br>".file_get_contents($font.".js");
