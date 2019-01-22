pragma solidity ^0.4.24;

import "./external/openzeppelin-solidity/contracts/crowdsale/Crowdsale.sol";
import "./external/openzeppelin-solidity/contracts/lifecycle/Pausable.sol";


/**
 * @title PausableCrowdsale
 * @dev Crowdsale which is operable only when not paused.
 */
contract PausableCrowdsale is Pausable, Crowdsale {
  /**
   * @dev Extend parent behavior requiring contract not to be paused.
   * @param _beneficiary Token beneficiary
   * @param _weiAmount Amount of wei contributed
   */
  function _preValidatePurchase(
    address _beneficiary,
    uint256 _weiAmount
  )
    whenNotPaused
    internal
  {
    super._preValidatePurchase(_beneficiary, _weiAmount);
  }

}
