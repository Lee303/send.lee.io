var jqContent = $('#content');


//-- Encryption/Decryption --//

var encryptWorker = new Worker("/js/encrypt-worker.js");
var decryptWorker = new Worker("/js/decrypt-worker.js");

function encryptData(plaintext, passphrase, callback) {
    var payload = {
        plaintext: plaintext,
        passphrase: passphrase
    }

    encryptWorker.onmessage = function(e) {
        callback(e.data);
    }

    encryptWorker.postMessage(payload);
}

function decryptData(ciphertext, passphrase, callback) {
    var payload = {
        ciphertext: ciphertext,
        passphrase: passphrase
    }

    decryptWorker.onmessage = function(e) {
        callback(e.data);
    }

    decryptWorker.postMessage(payload);
}


//-- Handle Drag and Drop --//

var uploadBox = document.getElementById('upload-box');

uploadBox.ondragover = function(e) {
    return false;
};

uploadBox.ondrop = function(e) {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files) {
        var files = e.dataTransfer.files;
        for (var i = 0; i < files.length; i++) {
            uploadFile(files[i]);
        }
    }
};


//-- Handle File Upload --//

var input = document.getElementById('input');

uploadBox.onclick = function(e) {
    if (e.target.classList.contains('clickable')) {//e.target.className == 'clickable') {
        return;
    }
    
    input.click();
};

input.onchange = function(e) {
    if (this.files) {
        for (var i = 0; i < this.files.length; i++) {
            uploadFile(this.files[i]);
        }
    }
};


//-- UI --//

function uiSetProgress() {
    var progressContent = `
        <div class="progress" id="progress"></div>
    `;

    jqContent.html(progressContent);

    var bar = new ProgressBar.Line('#progress', {
        strokeWidth: 4,
        easing: 'easeInOut',
        duration: 1400,
        color: '#FFFFFF',
        trailColor: '#eee',
        trailWidth: 1,
        svgStyle: {width: '100%', height: '100%'},
        from: {color: '#fff'},
        to: {color: '#9AD58C'},
        step: (state, bar) => {
            bar.path.setAttribute('stroke', state.color);
        }
    });

    return {bar: bar};
}

function uiSetUploadComplete(id, passphrase) {
    uiSetContent(`<span id="send-url" class="clickable">https://send.lee.io/${id}/#${passphrase}</span>`);
}

function uiSetDownloadComplete(url, filename) {
    uiSetContent(`File burnt`);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
}

function uiSetEncryptionProgress() {
    jqContent.html('Encrypting..');
}

function uiSetDecryptionProgress() {
    uiSetContent('Decrypting..');
}

function uiSetDownloadProgress() {
    jqContent.html('Downloading..');
}

function uiSetDownloadFailed(error) {
    uiSetContent(`Download failed: ${error}`);
}

function uiSetUploadFailed(error) {
    uiSetContent(`Upload failed: ${error}`);
}

function uiSetContent(html) {
    jqContent.html(html);
}


//-- Upload --//

function uploadFile(file) {
    var max_size_mb = 50;
    if (file.size > (max_size_mb*1024*1024)) {
        uiSetUploadFailed('File larger than maximum supported size ('+max_size_mb+'MB)');
        return;
    }

    var passphrase = generatePassword(12);

    var reader = new FileReader();
    reader.onload = function(e) {

        console.log('Encrypting file');
        uiSetEncryptionProgress();

        var result = encryptData(e.target.result, passphrase, function(encrypted) {
            if (encrypted.success != true) {
                uiSetUploadFailed('Failed to encrypt file data: '+encrypted.data);
                return;
            }

            console.log('Uploading file');
            var progress = uiSetProgress();

            $.ajax({
                url: '/upload.php?filename='+file.name,
                type: 'PUT',
                dataType: 'json',
                data: encrypted.data,
                xhr: function(){
                    var xhr = new window.XMLHttpRequest();

                    xhr.upload.addEventListener("progress", function(evt) {
                        if (evt.lengthComputable) {
                            var percentComplete = evt.loaded/evt.total;
                            console.log("Upload progress: "+Math.round(percentComplete*100)+"%")
                            progress.bar.set(evt.loaded/evt.total);
                        }
                    }, false);

                    return xhr;
                },
                error: function(jqXHR, textStatus) {
                    uiSetUploadFailed('Upload failed. Please try again later');
                },
                success: function(data, textStatus, jqXHR) {
                    console.log('Upload complete');
                    uiSetUploadComplete(data.id, passphrase);
                }
            });
        });
    };
    reader.readAsDataURL(file);
}

function processDownloadedFile(file, data) {
    var blob = dataUrlToBlob(data);
    var objectURL = URL.createObjectURL(blob);
    uiSetDownloadComplete(objectURL, file.filename);
    //URL.revokeObjectURL(objectURL);
}

function downloadFile(file, passphrase) {

    console.log('Downloading file: '+file.id);
    uiSetDownloadProgress();

    $.ajax({
        url: '/download.php?id='+file.id,
        type: 'GET',
        error: function(jqXHR, textStatus) {
            uiSetDownloadFailed(jqXHR.responseText);
        },
        success: function(data, textStatus, jqXHR) {
            if (passphrase != null) {
                console.log('Passphrase provided, decrypting data');
                uiSetDecryptionProgress();

                var result = decryptData(data, passphrase, function(decrypted) {
                    if (decrypted.success != true) {
                        uiSetDownloadFailed('Failed to decrypt data: '+decrypted.data);
                        return;
                    }
                    processDownloadedFile(file, decrypted.data);
                });
            } else {
                processDownloadedFile(file, data);
            }
        }
    });
}

function downloadFileById(id, passphrase) {

    console.log('Retrieving filename for id '+id);

    $.ajax({
        url: '/file.php?id='+id,
        type: 'GET',
        dataType: 'json',
        error: function(jqXHR, textStatus) {
            uiSetDownloadFailed('Failed to retrieve file: '+jqXHR.responseText);
        },
        success: function(file, textStatus, jqXHR) {
            downloadFile(file, passphrase);
        }
    });
}


//-- Helpers --//

function dataUrlToBlob(strUrl) {
    var parts= strUrl.split(/[:;,]/),
    type= parts[1],
    decoder= parts[2] == "base64" ? atob : decodeURIComponent,
    binData= decoder( parts.pop() ),
    mx= binData.length,
    i= 0,
    uiArr= new Uint8Array(mx);

    for(i;i<mx;++i) uiArr[i]= binData.charCodeAt(i);

    return new Blob([uiArr], {type: type});
}

function getRandom() {
    var result = new Uint32Array(1);
    window.crypto.getRandomValues(result);
    return (result[0]/(0xffffffff + 1));
}

function generatePassword(passwordLength) {
    var numberChars = "0123456789";
    var upperChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    var lowerChars = "abcdefghiklmnopqrstuvwxyz";
    var allChars = numberChars + upperChars + lowerChars;

    var randPasswordArray = Array(passwordLength);
    randPasswordArray[0] = numberChars;
    randPasswordArray[1] = upperChars;
    randPasswordArray[2] = lowerChars;
    randPasswordArray = randPasswordArray.fill(allChars, 3);

    return shuffleArray(randPasswordArray.map(function(x) { return x[Math.floor(getRandom() * x.length)] })).join('');
}

function shuffleArray(array) {
    for (var i = array.length - 1; i > 0; i--) {
        var j = Math.floor(getRandom() * (i + 1));
        var temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }

    return array;
}    

function selectText(elem) {
    var select = window.getSelection();
    select.removeAllRanges();

    var range = document.createRange();
    range.selectNodeContents(elem);

    select.addRange(range);
}

document.addEventListener('click', function(e) {
    if (e.target.id == 'send-url') {
        e.preventDefault();
        selectText(e.target);
    }
}, false);




var idMatch = window.location.pathname.match(/([a-zA-Z0-9]+)/);
if (idMatch != null) {
    console.log('Found download ID: '+idMatch[1]);
    var pwMatch = window.location.hash.match(/([a-zA-Z0-9]+)/);
    downloadFileById(idMatch[1], (pwMatch != null) ? pwMatch[1] : null);
}
