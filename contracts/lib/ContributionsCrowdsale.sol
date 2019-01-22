pragma solidity ^0.4.24;

import "./external/openzeppelin-solidity/contracts/math/SafeMath.sol";
import "./external/openzeppelin-solidity/contracts/crowdsale/Crowdsale.sol";


/**
 * @title ContributionsCrowdsale
 * @dev Crowdsale which records and updates the contributions of all users.
 */
contract ContributionsCrowdsale is Crowdsale {
  using SafeMath for uint256;

  mapping(address => uint256) public contributions;

  /**
   * @dev Returns the amount contributed so far by a sepecific user.
   * @param _beneficiary Address of contributor
   * @return User contribution so far
   */
  function getUserContribution(address _beneficiary)
    public view returns (uint256)
  {
    return contributions[_beneficiary];
  }

  /**
   * @dev Extend parent behavior to update user contributions
   * @param _beneficiary Token purchaser
   * @param _weiAmount Amount of wei contributed
   */
  function _updatePurchasingState(
    address _beneficiary,
    uint256 _weiAmount
  )
    internal
  {
    super._updatePurchasingState(_beneficiary, _weiAmount);
    contributions[_beneficiary] = contributions[_beneficiary].add(_weiAmount);
  }

}
