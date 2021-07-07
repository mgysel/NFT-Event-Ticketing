const Event = artifacts.require("Event");

// Migration file allows us to deploy to blockchain
module.exports = function(deployer) {
  deployer.deploy(Event);
};
