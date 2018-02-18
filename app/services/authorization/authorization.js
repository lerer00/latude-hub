const Web3 = require('web3');

var authorizationAbi = require('../../../build/contracts/Authorization.json').abi;

function Authorization() {
    this.web3 = new Web3(new Web3.providers.WebsocketProvider(process.env.RPC_URL));
}

Authorization.prototype.isAllowedOnContract = function (contractAddress) {
    authorizationInstance = new this.web3.eth.Contract(authorizationAbi, contractAddress);
    return authorizationInstance.methods.owner().call();
}

// export the class
module.exports = Authorization;