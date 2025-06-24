<?php

$files = scandir('.');

foreach ($files as $file) {
    
    if ($file === '.' ||  $file === '..') continue;

     
    if (is_dir($file)) continue;

    
    $info = pathinfo($file);

    
    $newName = $info['filename'] . '-solid';

     
    if (!empty($info['extension'])) {
        $newName .= '.' . $info['extension'];
    }

    
    rename($file, $newName);
    
}
