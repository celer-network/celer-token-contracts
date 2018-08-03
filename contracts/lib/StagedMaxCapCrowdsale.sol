pragma solidity ^0.4.24;

import "./external/openzeppelin-solidity/contracts/math/SafeMath.sol";
import "./external/openzeppelin-solidity/contracts/crowdsale/validation/TimedCrowdsale.sol";
import "./ContributionsCrowdsale.sol";


/**
 * @title StagedMaxCapCrowdsale
 * @dev Extension of TimedCrowdsale and ContributionsCrowdsale contracts that holds different individual max caps in different stages.
 */
contract StagedMaxCapCrowdsale is TimedCrowdsale, ContributionsCrowdsale {
  using SafeMath for uint256;

  uint256 public originalMaxCap; // in wei unit
  uint256 public stageDuration; // duration time of one stage

  constructor(uint256 _originalMaxCap, uint256 _stageDuration) public {
    require(_originalMaxCap > 0);
    require(_stageDuration > 0);

    originalMaxCap = _originalMaxCap;
    stageDuration = _stageDuration;
  }

  /**
   * @dev Returns the stage index at the present time.
   * Note that, stage index begins from 1 and increases one by one,
   * namely the index of the original (first) stage is 1.
   * @return Current stage index
   */
  function getCurrentStageIndex() public view returns (uint256) {
    uint256 timeAfterOpening = now - openingTime;
    // division always truncates: http://solidity.readthedocs.io/en/v0.4.24/types.html#integers
    uint256 tmp = timeAfterOpening.div(stageDuration);
    uint256 index = tmp.add(1);
    return index;
  }

  /**
   * @dev Returns the individual max cap at the present time.
   * @return Current max cap for every individual user
   */
  function getCurrentMaxCap() public view returns (uint256) {
    uint256 index = getCurrentStageIndex();
    uint256 times = 2 ** (index.sub(1));
    uint256 currentMaxCap = originalMaxCap.mul(times);
    return currentMaxCap;
  }

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
   * @dev Extend parent behavior requiring purchase to respect the user's funding max cap.
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
    uint256 currentMaxCap = getCurrentMaxCap();
    require(contributions[_beneficiary].add(_weiAmount) <= currentMaxCap);
  }

}
