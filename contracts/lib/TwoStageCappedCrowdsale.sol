pragma solidity ^0.4.24;

import "./external/openzeppelin-solidity/contracts/math/SafeMath.sol";
import "./external/openzeppelin-solidity/contracts/crowdsale/Crowdsale.sol";


contract TwoStageCappedCrowdsale is Crowdsale {
  using SafeMath for uint256;

  // weiAmount a user has already contributed
  mapping(address => uint256) public contributions;
  uint256 public individualCap; // for IndividuallyCapped stage
  uint256 public perTimeCap; // for FirstComeFirstGet stage
  uint256 public stageChangingTime;
  mapping(address => uint256) public nextBuyTimes;
  uint256 public cooldownInterval;

  enum StageType { IndividuallyCapped, FirstComeFirstGet }

  constructor(
    uint256 _individualCap, 
    uint256 _perTimeCap, 
    uint256 _stageChangingTime, 
    uint256 _cooldownInterval
  ) 
    public 
  {
    require(_individualCap > 0);
    require(_perTimeCap > 0);
    require(_stageChangingTime > now);
    require(_cooldownInterval > 0);

    individualCap = _individualCap;
    perTimeCap = _perTimeCap;
    stageChangingTime = _stageChangingTime;
    cooldownInterval = _cooldownInterval;
  }

  function getCurrentStage()
    public view returns (StageType)
  {
    if (now < stageChangingTime) {
      return StageType.IndividuallyCapped;
    }
    else if (now >= stageChangingTime) {
      return StageType.FirstComeFirstGet;
    }
    else {
      assert(false);
    }
  }

  function getUserContribution(address _beneficiary)
    public view returns (uint256)
  {
    return contributions[_beneficiary];
  }

  function _preValidatePurchase(
    address _beneficiary,
    uint256 _weiAmount
  )
    internal
  {
    super._preValidatePurchase(_beneficiary, _weiAmount);

    StageType currentStage = getCurrentStage();
    if (currentStage == StageType.IndividuallyCapped) {
      require(contributions[_beneficiary].add(_weiAmount) <= individualCap);
    }
    else if (currentStage == StageType.FirstComeFirstGet) {
      require(_weiAmount <= perTimeCap);
      require(now >= nextBuyTimes[_beneficiary]);
    }
    else {
      assert(false);
    }
  }

  function _updatePurchasingState(
    address _beneficiary,
    uint256 _weiAmount
  )
    internal
  {
    super._updatePurchasingState(_beneficiary, _weiAmount);
    contributions[_beneficiary] = contributions[_beneficiary].add(_weiAmount);
    if (getCurrentStage() == StageType.FirstComeFirstGet) {
      nextBuyTimes[_beneficiary] = now + cooldownInterval;
    }
  }
}
