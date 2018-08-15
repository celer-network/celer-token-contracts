pragma solidity ^0.4.24;

import "./external/openzeppelin-solidity/contracts/crowdsale/Crowdsale.sol";
import "./SuccinctWhitelist.sol";


/**
 * @title SuccinctWhitelistedCrowdsale
 * @dev Crowdsale in which only whitelisted users can contribute.
 * Note: SuccinctWhitelistedCrowdsale inherits SuccinctWhitelist 
 * instead of openzeppelin-solidity's Whitelist but with same functionalities.
 */
contract SuccinctWhitelistedCrowdsale is SuccinctWhitelist, Crowdsale {
  /**
   * @dev Extend parent behavior requiring beneficiary to be in whitelist.
   * @param _beneficiary Token beneficiary
   * @param _weiAmount Amount of wei contributed
   */
  function _preValidatePurchase(
    address _beneficiary,
    uint256 _weiAmount
  )
    onlyIfWhitelisted(_beneficiary)
    internal
  {
    super._preValidatePurchase(_beneficiary, _weiAmount);
  }

}
