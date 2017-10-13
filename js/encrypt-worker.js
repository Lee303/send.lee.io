
onmessage = function(e)
{
 	(async() => {
		if (e.data.passphrase == null || e.data.plaintext == null) {
			postMessage({success:false, data:'Invalid data provided to encrypt worker'});
		}

 		// utf8 encode passphrase
		var pwUtf8 = new TextEncoder().encode(e.data.passphrase);

		// sha256 hash passphrase
	    var pwHash = await crypto.subtle.digest('SHA-256', pwUtf8);

	    // get random 96bit IV
	    var iv = crypto.getRandomValues(new Uint8Array(12));
	    
	    // define algorithm that we are using
	    var alg = { name: 'AES-GCM', iv: iv };

		// import the key from hashed passphrase
	    var key = await crypto.subtle.importKey('raw', pwHash, alg, false, ['encrypt']);

	    // utf8 encode plaintext
	    var ptUint8 = new TextEncoder().encode(e.data.plaintext);

	    // encrypt plaintext using imported key
	    var ctBuffer = await crypto.subtle.encrypt(alg, key, ptUint8);

	    // retrieve bytearray from cyphertext
	    var ctArray = Array.from(new Uint8Array(ctBuffer));

	    // retrieve ciphertext as string
	    var ctStr = ctArray.map(byte => String.fromCharCode(byte)).join('');

	    // base64 encode cyphertext string
	    var ctBase64 = btoa(ctStr);

	    // convert IV to IV hex string
	    var ivHex = Array.from(iv).map(b => ('00' + b.toString(16)).slice(-2)).join('');

	    // we're done here, return encrypted ciphertext base64, prefixed with IV hex string
	    postMessage({success:true, data:ivHex+ctBase64});
	})()
}
