pragma solidity ^0.4.23;

import "./AbstractTimelock.sol";


contract AngelTimelock is AbstractTimelock {
  event ResetStartTime(
      uint startTime
  );

  constructor(
    ERC20Basic _token,
    address _beneficiary
  )
    AbstractTimelock(_token, _beneficiary)
    public
  {
    // at the end of 3rd month, unlock 1/2
    lockups.push(Lockup({
      lockupTime: 90 days,
      isReleased: false,
      totalDivisor: 2
    }));
    // at the end of 4th month, unlock additional 1/6
    lockups.push(Lockup({
      lockupTime: 120 days,
      isReleased: false,
      totalDivisor: 6
    }));
    // at the end of 5th month, unlock additional 1/6
    lockups.push(Lockup({
      lockupTime: 150 days,
      isReleased: false,
      totalDivisor: 6
    }));
    // at the end of 6th month, unlock additional 1/6
    lockups.push(Lockup({
      lockupTime: 180 days,
      isReleased: false,
      totalDivisor: 6
    }));

    require(lockups.length == 4);
  }

  function resetStartTime(uint _startTime) onlyOwner whenActivated returns (bool) {
    require(_startTime > block.timestamp);

    startTime = _startTime;
    emit ResetStartTime(startTime);
    return true;
  }
}
