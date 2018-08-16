var MoonToken = artifacts.require("MoonToken");

module.exports = function(deployer) {
  deployer.deploy(MoonToken);
};
