<?php

include_once('config.php');
include_once('../../globals/class/db.class.php');
include_once('class/file.class.php');

try
{
    $db = new db(DB_HOST, DB_NAME, DB_USER, DB_PASSWORD);

    $file = file::create($db);
    $file->filename = ($_GET['filename'] != null) ? $_GET['filename'] : time();
    $file->expire_timestamp = (time()+86400);
    $file->save();

    $putdata = fopen("php://input", "r");
    $file->write_stream($putdata);
    fclose($putdata);

    echo json_encode(array('id'=>$file->uniq_id));
}
catch(Exception $ex)
{
    http_response_code(500);
    echo $ex->getMessage();
}