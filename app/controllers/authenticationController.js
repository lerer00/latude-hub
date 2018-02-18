var jwt = require('jsonwebtoken');
var ethUtil = require('ethereumjs-util');

function checkSignature(signature, owner, data) {
    var message = ethUtil.toBuffer(data);
    var messageHash = ethUtil.hashPersonalMessage(message);

    // Get the address of whoever signed this message  
    var signatureBuffer = ethUtil.toBuffer(signature);
    var signatureParams = ethUtil.fromRpcSig(signatureBuffer);
    var publicKey = ethUtil.ecrecover(messageHash, signatureParams.v, signatureParams.r, signatureParams.s);
    var sender = ethUtil.publicToAddress(publicKey);
    var address = ethUtil.bufferToHex(sender);

    // Determine if it is the same address as 'owner' 
    if (address == owner.toLowerCase())
        return true;

    return false;
}

exports.post_authenticate = function (req, res) {
    var match = checkSignature(req.body.signature, req.body.owner, 'latude');
    if (!match) {
        res.status(500).send({ err: 'Signature did not match.' });
    } else {
        var token = jwt.sign({ user: req.body.owner }, 'latude', { expiresIn: "1d" });
        res.status(200).send({ success: 1, token: token });
    }
};