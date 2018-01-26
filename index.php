<?php
if ($_SERVER['REQUEST_METHOD'] == 'PUT')
{
    ob_start();
    include('upload.php');
    $output = ob_get_clean();
    echo "https://send.lee.io/".json_decode($output)->id."\n";
    exit;
}
?>
<!DOCTYPE html>
<html>
<head>
<title>send.lee.io</title>
<meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no">
<meta name="theme-color" content="#E7A8D1" />
<link href="/css/send.lee.io.css" rel="stylesheet">
<link href="/css/font-awesome.min.css" rel="stylesheet">
</head>
<body>
    <div id="upload-box">
        <div class="icon">
            <i class="fa fa-paper-plane" aria-hidden="true"></i><br />
        </div>
        <div id="content" class="content">
            <input type="file" name="files[]" id="input" class="input" multiple/>
            Drag+drop or click here to upload  <a href="#" data-tooltip onclick="" class="left-margin"><i class="fa fa-question-circle-o" aria-hidden="true"></i></a>
        </div>
    </div>

<script src="/js/vendor/jquery.min.js"></script>
<script src="/js/vendor/progressbar.min.js"></script>
<script src="/js/send.lee.io.js"></script>
</body>
</html>
