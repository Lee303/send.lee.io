
onmessage = function(e)
{
 	(async() => {
		if (e.data.passphrase == null || e.data.ciphertext == null) {
			postMessage({success:false, data:'Invalid data provided to decrypt worker'});
		}
 		// utf8 encode passphrase
		var pwUtf8 = new TextEncoder().encode(e.data.passphrase);

		// sha256 hash passphrase
	    var pwHash = await crypto.subtle.digest('SHA-256', pwUtf8);

	    // retrieve iv from prefix of ciphertext
	    var iv = e.data.ciphertext.slice(0,24).match(/.{2}/g).map(byte => parseInt(byte, 16));

	    // define algorithm that we are using
	    var alg = { name: 'AES-GCM', iv: new Uint8Array(iv) };

	    // import the key from hashed passphrase
	    var key = await crypto.subtle.importKey('raw', pwHash, alg, false, ['decrypt']);

	    // decode base64 ciphertext
	    var ctStr = atob(e.data.ciphertext.slice(24));

	    // convert decoded ciphertext to byte array
		var ctUint8 = new Uint8Array(new ArrayBuffer(ctStr.length));
		for(i = 0; i < ctStr.length; i++) {
		    ctUint8[i] = ctStr.charCodeAt(i);
		}

		// decrypt ciphertext using imported key
	    crypto.subtle.decrypt(alg, key, ctUint8).then(function(plainBuffer) {
		    // decode utf8 plaintext buffer
		    var plaintext = new TextDecoder().decode(plainBuffer);

		    // we're done here, return decrypted plaintext
		    postMessage({success:true, data:plaintext});
	    }, function(error) {
	    	// decryption failed, post failure message back
		    postMessage({success:false, data:'Decryption failure: '+error});
	    });
	})()
}
