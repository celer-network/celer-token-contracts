pragma solidity ^0.4.24;

import "./external/openzeppelin-solidity/contracts/math/SafeMath.sol";
import "./ContributionsCrowdsale.sol";


/**
 * @title MinCapCrowdsale
 * @dev ContributionsCrowdsale with a min cap for each individual user.
 */
contract MinCapCrowdsale is ContributionsCrowdsale {
  using SafeMath for uint256;

  uint256 public minCap; // in wei unit

  /**
   * @dev Constructor, takes minimum amount of wei accepted for each user in the crowdsale.
   * @param _minCap Min amount of wei to be contributed for each user
   */
  constructor(uint256 _minCap) public {
    require(_minCap > 0);
    minCap = _minCap;
  }

  /**
   * @dev Extend parent behavior requiring purchase to respect the funding min cap.
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
    require(contributions[_beneficiary].add(_weiAmount) >= minCap);
  }

}
