<?php

include_once('config.php');
include_once('../../globals/class/db.class.php');
include_once('class/crypt_file.class.php');

try
{    
    if ($_GET['id'] == null)
    {
        throw new Exception("Invalid id provided");
    }

    $db = new db(DB_HOST, DB_NAME, DB_USER, DB_PASSWORD);

    $crypt_file = crypt_file::get($db, $_GET['id']);

    if ($crypt_file->status != CRYPT_FILE_STATUS_COMPLETE)
    {
		throw new Exception("Invalid file");
    }

	$crypt_file->read();
}
catch(Exception $ex)
{
    http_response_code(500);
    echo $ex->getMessage();
}
