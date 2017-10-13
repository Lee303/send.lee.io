<?php

include_once('config.php');
include_once('../../globals/class/db.class.php');
include_once('class/crypt_file.class.php');

try
{
    $db = new db(DB_HOST, DB_NAME, DB_USER, DB_PASSWORD);

    $crypt_file = crypt_file::create($db);
    $crypt_file->filename = $_GET['filename'];
    $crypt_file->expire_timestamp = (time()+86400);
    $crypt_file->save();

    $putdata = fopen("php://input", "r");
    $crypt_file->write_stream($putdata);
    fclose($putdata);

    echo json_encode(array('id'=>$crypt_file->uniq_id));
}
catch(Exception $ex)
{
    http_response_code(500);
    echo $ex->getMessage();
}