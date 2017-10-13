<?php

define('CRYPT_FILE_STATUS_NEW', 0);
define('CRYPT_FILE_STATUS_COMPLETE', 2);
define('CRYPT_FILE_STATUS_ERROR', 3);
define('CHUNK_SIZE', 1024);


class crypt_file
{
	private $db = null;

	private $id = 0;
	public $timestamp = 0;
	public $uniq_id = '';
	public $expire_timestamp = 0;
	public $status = 0;
	public $status_message = '';
	public $filename = '';


	public function __construct($db)
	{
		$this->db = $db;
	}

	public static function create($db)
	{
		$crypt_file = new crypt_file($db);
		$crypt_file->timestamp = time();
		$crypt_file->uniq_id = self::new_uniqid();
		$crypt_file->status = CRYPT_FILE_STATUS_NEW;

		return $crypt_file->insert();
	}

	public static function exists($db, $uniq_id)
	{
		$query = "SELECT id FROM file WHERE uniq_id = :uniq_id";
        $results = $db->execute_prepared($query, array("uniq_id"=>$uniq_id), true);
        if (count($results) > 0)
        {
            return true;
        }

        return false;
	}

	public static function get($db, $uniq_id)
	{
		$query = "SELECT * FROM file WHERE uniq_id = :uniq_id";
        $results = $db->execute_prepared($query, array("uniq_id"=>$uniq_id), true);
        if (count($results) == 0)
        {
            throw new Exception("Cannot find file with id {$uniq_id}");
        }

        return (new crypt_file($db))->hydrate($results[0]);
	}

	public static function get_expired($db)
	{
		$files = array();

		$query = "SELECT * FROM file WHERE expire_timestamp < :seconds";
        $results = $db->execute_prepared($query, array("seconds"=>time()), true);
        if (count($results) > 0)
        {
        	foreach ($results as $result)
        	{
        		$files[] = (new crypt_file($db))->hydrate($result);
        	}
        }

        return $files;
	}

	public function hydrate($result)
	{
		$this->id = $result->id;
		$this->timestamp = $result->timestamp;
		$this->uniq_id = $result->uniq_id;
		$this->expire_timestamp = $result->expire_timestamp;
		$this->status = $result->status;
		$this->filename = $result->filename;

		return $this;
	}

	public function insert()
	{
		if (self::exists($this->db, $this->uniq_id))
		{
			throw new Exception('uniq_id clash');
		}

	    $query = "INSERT INTO file (`timestamp`,`uniq_id`,`expire_timestamp`,`status`,`filename`) VALUES (:timestamp,:uniq_id,:expire_timestamp,:status,:filename)";

	    $result = $this->db->execute_prepared($query, array(
	    	"timestamp"=>$this->timestamp,
	    	"uniq_id"=>$this->uniq_id,
	    	"expire_timestamp"=>$this->expire_timestamp,
	    	"status"=>$this->status,
	    	"filename"=>$this->filename
	    ));

	    $this->id = $this->db->connection->lastInsertId();

	    return $this;
	}


	public function write_stream($handle)
	{
	    $file_path = $this->get_filepath();

		if (!$fp = fopen($file_path, "w"))
		{
	    	$status_message = "Failed to write file";
	    	$this->set_status(CRYPT_FILE_STATUS_ERROR, $status_message);

	    	throw new Exception($status_message);
		}

		while ($data = fread($handle, CHUNK_SIZE))
		{
			fwrite($fp, $data);
		}

		fclose($fp);

    	$this->set_status(CRYPT_FILE_STATUS_COMPLETE);
	}

	public function read()
	{
	    $file_path = $this->get_filepath();

	    if (!file_exists($file_path))
	    {
	    	$status_message = "Cannot find file";
	    	$this->set_status(CRYPT_FILE_STATUS_ERROR, $status_message);

	    	throw new Exception($status_message);
	    }

	    $buffer = '';
	    if (!$handle = fopen($file_path, 'rb'))
	    {
	    	$status_message = "Failed to read file";
	    	$this->set_status(CRYPT_FILE_STATUS_ERROR, $status_message);

	    	throw new Exception($status_message);
	    }

	    while (!feof($handle))
	    {
	        $buffer = fread($handle, CHUNK_SIZE);
	        echo $buffer;
	        ob_flush();
	        flush();
	    }

	    fclose($handle);

	    $this->burn();
	}

	public function burn()
	{
	    $file_path = $this->get_filepath();
	    if (!file_exists($file_path))
	    {
	    	return;
	    }

    	if (!unlink($file_path))
    	{
	    	$status_message = "Failed to delete file";
	    	$this->set_status(CRYPT_FILE_STATUS_ERROR, $status_message);

	        throw new Exception($status_message);
    	}

    	$this->delete();
	}

	private function get_filepath()
	{
		return STORAGE_PATH."/".$this->uniq_id;
	}

	private function set_status($status, $status_message = '')
	{
		if ($this->status != $status)
        {
            $query = "UPDATE file SET status = :status, status_message = :status_message WHERE id = :id LIMIT 1";
            $result = $this->db->execute_prepared($query, array("id"=>$this->id, "status"=>$status, "status_message"=>$status_message));

            $this->status = $status;
        }
	}

	public function save()
	{
		$query = "UPDATE file SET timestamp = :timestamp, uniq_id = :uniq_id, expire_timestamp = :expire_timestamp, status = :status, filename = :filename WHERE id = :id LIMIT 1";

	    $result = $this->db->execute_prepared($query, array(
	    	"id"=>$this->id,
	    	"timestamp"=>$this->timestamp,
	    	"uniq_id"=>$this->uniq_id,
	    	"expire_timestamp"=>$this->expire_timestamp,
	    	"status"=>$this->status,
	    	"filename"=>$this->filename
	    ));
    }

    private function delete()
    {
        $query = "DELETE FROM file WHERE id = :id LIMIT 1";
        $result = $this->db->execute_prepared($query, array("id"=>$this->id));
    }

	private static function new_uniqid($length = 13)
	{
	    $bytes = openssl_random_pseudo_bytes(ceil($length / 2));
	    return substr(bin2hex($bytes), 0, $length);
	}
}
