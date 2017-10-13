async function aesGcmEncrypt(plaintext, password) {
    const pwUtf8 = new TextEncoder().encode(password);                                 // encode password as UTF-8
    const pwHash = await crypto.subtle.digest('SHA-256', pwUtf8);                      // hash the password

    const iv = crypto.getRandomValues(new Uint8Array(12));                             // get 96-bit random iv

    const alg = { name: 'AES-GCM', iv: iv };                                           // specify algorithm to use

    const key = await crypto.subtle.importKey('raw', pwHash, alg, false, ['encrypt']); // generate key from pw

    const ptUint8 = new TextEncoder().encode(plaintext);                               // encode plaintext as UTF-8
    const ctBuffer = await crypto.subtle.encrypt(alg, key, ptUint8);                   // encrypt plaintext using key

    const ctArray = Array.from(new Uint8Array(ctBuffer));                              // ciphertext as byte array
    const ctStr = ctArray.map(byte => String.fromCharCode(byte)).join('');             // ciphertext as string
    const ctBase64 = btoa(ctStr);                                                      // encode ciphertext as base64

    const ivHex = Array.from(iv).map(b => ('00' + b.toString(16)).slice(-2)).join(''); // iv as hex string

    return ivHex+ctBase64;                                                             // return iv+ciphertext
}


async function aesGcmDecrypt(ciphertext, password) {
    const pwUtf8 = new TextEncoder().encode(password);                                 // encode password as UTF-8
    const pwHash = await crypto.subtle.digest('SHA-256', pwUtf8);                      // hash the password

    const iv = ciphertext.slice(0,24).match(/.{2}/g).map(byte => parseInt(byte, 16));  // get iv from ciphertext

    const alg = { name: 'AES-GCM', iv: new Uint8Array(iv) };                           // specify algorithm to use

    const key = await crypto.subtle.importKey('raw', pwHash, alg, false, ['decrypt']); // use pw to generate key

    const ctStr = atob(ciphertext.slice(24));                                          // decode base64 ciphertext
    const ctUint8 = new Uint8Array(ctStr.match(/./g).map(ch => ch.charCodeAt(0)));     // ciphertext as Uint8Array
    // note: why doesn't ctUint8 = new TextEncoder().encode(ctStr) work?

    const plainBuffer = await crypto.subtle.decrypt(alg, key, ctUint8);                // decrypt ciphertext using key
    const plaintext = new TextDecoder().decode(plainBuffer);                           // decode password from UTF-8

    return plaintext;                                                                  // return the plaintext
}





















////////////////////////////////////////////////////////////////////////////////////////////////////////////////

















var secretmessage = "";
var password = "";
var key_object = null;
var promise_key = null;
var encrypted_data = null;
var encrypt_promise = null;
var vector = window.crypto.getRandomValues(new Uint8Array(16));
var decrypt_promise = null;
var decrypted_data = null;

function encryptThenDecrypt() {
    secretmessage = "my secret message"
    password = "superstrongpassword!"

    promise_key = window.crypto.subtle.importKey(
        "raw",
        convertStringToArrayBuffer(password),
        {"name": "PBKDF2"},
        false,
        ["deriveKey"]
    );
    promise_key.then(function(importedPassword) {
        return window.crypto.subtle.deriveKey(
            {
                "name": "PBKDF2",
                "salt": convertStringToArrayBuffer("the salt is this random string"),
                "iterations": 100000,
                "hash": "SHA-256"
            },
            importedPassword,
            {
                "name": "AES-GCM",
                "length": 128
            },
            false,
            ["encrypt", "decrypt"]
        );
    }).then(function(key) {
        key_object = key;
        encrypt_data();
    });
    promise_key.catch = function(e) {
        alert("Error while importing key: " + e.message);
    }
}

function encrypt_data() {
    encrypt_promise = window.crypto.subtle.encrypt({name: "AES-GCM", iv: vector}, key_object, convertStringToArrayBuffer(secretmessage));
    encrypt_promise.then(
        function(result) {
            encrypted_data = new Uint8Array(result);
            decrypt_data();
        },
        function(e) {
            alert("Error while encrypting data: " + e.message);
        }
    );
}

function decrypt_data() {
    decrypt_promise = window.crypto.subtle.decrypt({name: "AES-GCM", iv: vector}, key_object, encrypted_data);

    decrypt_promise.then(
        function(result){
            decrypted_data = new Uint8Array(result);
            alert("Decrypted data: " + convertArrayBuffertoString(decrypted_data));
        },
        function(e) {
            alert("Error while decrypting data: " + e.message);
        }
    );
}

function convertStringToArrayBuffer(str) {
    var encoder = new TextEncoder("utf-8");
    return encoder.encode(str);
}

function convertArrayBuffertoString(buffer) {
    var decoder = new TextDecoder("utf-8");
    return decoder.decode(buffer);
}
