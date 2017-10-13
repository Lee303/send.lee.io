<?php
error_reporting(E_ERROR);

include_once(__DIR__.'/../config.php');
include_once(__DIR__.'/../class/crypt_file.class.php');
include_once(__DIR__.'/../../../globals/class/db.class.php');

$db = new db(DB_HOST, DB_NAME, DB_USER, DB_PASSWORD);
$expired_files = crypt_file::get_expired($db);
if (count($expired_files) > 0)
{
	foreach ($expired_files as $expired_file)
	{
		$expired_file->burn();
	}
}
