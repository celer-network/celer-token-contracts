pragma solidity ^0.4.23;

import "./lib/external/openzeppelin-solidity/contracts/token/ERC20/SafeERC20.sol";
import "./lib/external/openzeppelin-solidity/contracts/math/SafeMath.sol";
import "./lib/external/openzeppelin-solidity/contracts/ownership/Ownable.sol";


contract AbstractTimelock is Ownable {
  using SafeERC20 for ERC20Basic;
  using SafeMath for uint;

  event NewRelease(
    address beneficiary,
    uint amount
  );

  event ZeroReleasableAmount();

  event Activate(
      uint startTime
  );

  event ResetBeneficiary(
      address beneficiary
  );

  struct Lockup {
      uint lockupTime;
      bool isReleased;
      uint totalDivisor;
  }

  ERC20Basic public token;
  address public beneficiary;
  Lockup[] public lockups;
  bool public isActivated;
  uint public startTime;
  uint public releasedAmount;

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
    internal
  {
    token = _token;
    beneficiary = _beneficiary;
  }

  function activateNow() onlyOwner whenNotActivated returns (bool) {
    isActivated = true;
    startTime = block.timestamp;
    emit Activate(startTime);
    return true;
  }

  function activateWithTime(uint _startTime) onlyOwner whenNotActivated returns (bool) {
    require(_startTime > block.timestamp);

    isActivated = true;
    startTime = _startTime;
    emit Activate(startTime);
    return true;
  }

  function resetBeneficiary(address _newBeneficiary) onlyOwner returns (bool) {
    require(_newBeneficiary != beneficiary);

    beneficiary = _newBeneficiary;
    emit ResetBeneficiary(beneficiary);
    return true;
  }

  function release() public whenActivated {
    uint releasableAmount = 0;
    uint unreleasedAmount = token.balanceOf(this);
    uint totalAmount = unreleasedAmount.add(releasedAmount);

    uint releaseTime;
    uint finalIndex = lockups.length.sub(1);
    // check lockup periods except the final one
    for (uint i = 0; i < finalIndex; i++) {
      releaseTime = startTime.add(lockups[i].lockupTime);
      if (block.timestamp >= releaseTime && !lockups[i].isReleased) {
        uint amount = totalAmount.div(lockups[i].totalDivisor);
        releasableAmount = releasableAmount.add(amount);
        lockups[i].isReleased = true;
      }
    }
    // check the final lockup period
    releaseTime = startTime.add(lockup[finalIndex].lockupTime);
    if (block.timestamp >= releaseTime && !lockups[finalIndex].isReleased) {
      releasableAmount = unreleasedAmount;
      lockups[finalIndex].isReleased = true;
    }

    if (releasableAmount > 0) {
      emit NewRelease(beneficiary, releasableAmount);
      releasedAmount = releasedAmount.add(releasableAmount);
      token.safeTransfer(beneficiary, releasableAmount);
      return;
    } else if (releasableAmount == 0) {
      emit ZeroReleasableAmount();
      return;
    } else {
      assert(false);
    }
  }
}
