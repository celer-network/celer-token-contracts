pragma solidity ^0.4.24;

import "./lib/external/openzeppelin-solidity/contracts/token/ERC20/SafeERC20.sol";
import "./lib/external/openzeppelin-solidity/contracts/math/SafeMath.sol";
import "./lib/external/openzeppelin-solidity/contracts/ownership/Ownable.sol";


/**
 * @title MoonTimelock
 * @dev Token Timelock contract specialized for Moon's angel and private sale rounds.
 */
contract MoonTimelock is Ownable {
  using SafeERC20 for ERC20Basic;
  using SafeMath for uint256;

  event NewRelease(
    address beneficiary,
    uint256 amount
  );

  event ZeroReleasableAmount();

  event Activate(
    uint256 startTime
  );

  event ResetBeneficiary(
    address beneficiary
  );

  ERC20Basic public token;
  address public beneficiary;
  bool public isActivated;
  uint256 public startTime;
  uint256 public releasedAmount;
  /** 
  * 1st stage: at the end of 3rd month, unlock 1/3
  * 2nd stage: at the end of 6th month, unlock additional 1/3
  * 3rd stage: at the end of 9th month, unlock additional 1/3
  */
  uint256[3] public lockupTimes = [90 days, 180 days, 270 days];
  uint256 public constant eachReleaseDivisor = 3;

  modifier whenActivated() {
    require(isActivated);
    _;
  }

  modifier whenNotActivated() {
    require(!isActivated);
    _;
  }

  constructor(
    ERC20Basic _token,
    address _beneficiary
  )
    public
  {
    require(_token != address(0));
    require(_beneficiary != address(0));

    token = _token;
    beneficiary = _beneficiary;
  }

  function activateNow() onlyOwner whenNotActivated public returns (bool) {
    isActivated = true;
    startTime = now;
    emit Activate(startTime);
    return true;
  }

  function activateWithTime(uint256 _startTime) onlyOwner whenNotActivated public returns (bool) {
    require(_startTime > 0);

    isActivated = true;
    startTime = _startTime;
    emit Activate(startTime);
    return true;
  }

  function resetBeneficiary(address _newBeneficiary) onlyOwner public returns (bool) {
    require(_newBeneficiary != address(0));
    require(_newBeneficiary != beneficiary);

    beneficiary = _newBeneficiary;
    emit ResetBeneficiary(beneficiary);
    return true;
  }

  function getUnlockedStagesNumber() public view returns (uint256) {
    if (!isActivated) {
      return 0;
    }

    if (now < (startTime + lockupTimes[0])) {
      return 0;
    } else if ((startTime + lockupTimes[0]) <= now && now < (startTime + lockupTimes[1])) {
      return 1;
    } else if ((startTime + lockupTimes[1]) <= now && now < (startTime + lockupTimes[2])) {
      return 2;
    } else if ((startTime + lockupTimes[2]) <= now) {
      return 3;
    } else {
      assert(false);
    }
  }

  function getReleasableAmount() public view returns (uint256) {    
    uint256 unreleasedAmount = token.balanceOf(address(this));
    uint256 totalAmount = unreleasedAmount.add(releasedAmount);
    
    // unlocked means it (a stage or amount) has been unlocked and it can be released or has been released.
    // Thus, unlockedAmount = releasedAmount + releasableAmount
    uint256 unlockedStagesNumber = getUnlockedStagesNumber();
    uint256 unlockedAmount = totalAmount.mul(unlockedStagesNumber).div(eachReleaseDivisor);

    uint256 releasableAmount = unlockedAmount.sub(releasedAmount);
    return releasableAmount;
  }

  function _releaseTokens(uint256 _releasableAmount) internal {
    if (_releasableAmount > 0) {
      emit NewRelease(beneficiary, _releasableAmount);
      releasedAmount = releasedAmount.add(_releasableAmount);
      token.safeTransfer(beneficiary, _releasableAmount);
      return;
    } else if (_releasableAmount == 0) {
      emit ZeroReleasableAmount();
      return;
    } else {
      assert(false);
    }
  }

  function release() whenActivated public {
    uint256 releasableAmount = getReleasableAmount();
    _releaseTokens(releasableAmount);
  }
}
