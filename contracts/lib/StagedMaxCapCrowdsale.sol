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

  uint256 public initialMaxCap; // in wei unit
  uint256 public stageDuration; // duration time of one stage

  /**
   * @dev Constructor, takes individual max cap of first stage and duration of each stage
   * @param _initialMaxCap Max cap of each user in first stage
   * @param _stageDuration Duration of each stage
   */
  constructor(uint256 _initialMaxCap, uint256 _stageDuration) public {
    require(_initialMaxCap > 0);
    require(_stageDuration > 0);

    initialMaxCap = _initialMaxCap;
    stageDuration = _stageDuration;
  }

  /**
   * @dev Returns the stage index at the present time.
   * Note that, stage index begins from 1 and increases one by one,
   * namely the index of the initial (first) stage is 1.
   * @return Current stage index
   */
  function getCurrentStageIndex() onlyWhileOpen public view returns (uint256) {
    uint256 timeAfterOpening = now.sub(openingTime);
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
    uint256 currentMaxCap = initialMaxCap.mul(times);
    return currentMaxCap;
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
