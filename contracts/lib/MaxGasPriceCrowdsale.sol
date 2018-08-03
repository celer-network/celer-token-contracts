pragma solidity ^0.4.24;

import "./external/openzeppelin-solidity/contracts/crowdsale/Crowdsale.sol";


/**
 * @title MaxGasPriceCrowdsale
 * @dev Crowdsale with a max gas price limit.
 */
contract MaxGasPriceCrowdsale is Crowdsale {
  uint256 public maxGasPrice; // in wei unit

  /**
   * @dev Constructor, takes maximum amount of wei of gas price accepted for each purchase.
   * @param _maxGasPrice Max amount of wei of gas price for each purchase transaction
   */
  constructor(uint256 _maxGasPrice) public {
    require(_maxGasPrice > 0);
    maxGasPrice = _maxGasPrice;
  }

  /**
   * @dev Extend parent behavior requiring purchase to respect the max gas price limit.
   * @param _beneficiary Token purchaser
   * @param _weiAmount Amount of wei contributed
   */
  function _preValidatePurchase(
    address _beneficiary,
    uint256 _weiAmount
  )
    internal
  {
    super._preValidatePurchase(_beneficiary, _weiAmount);
    require(tx.gasprice <= maxGasPrice);
  }

}
