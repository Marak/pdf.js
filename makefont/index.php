<?php
require_once 'makefont.php';
$font = 'ubuntu';
$enc = 'cp1250';
$embed = true;
makefont($font.'.ttf', $enc, $embed);
echo "<br>".file_get_contents($font.".js");
