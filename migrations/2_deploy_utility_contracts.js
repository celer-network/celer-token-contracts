var CelerToken = artifacts.require("CelerToken");

module.exports = function(deployer) {
  deployer.deploy(CelerToken);
};
