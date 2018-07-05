pragma solidity ^0.4.23;

import "./AbstractTimelock.sol";


contract PrivateSaleTimelock is AbstractTimelock {
  constructor(
    ERC20Basic _token,
    address _beneficiary
  )
    AbstractTimelock(_token, _beneficiary)
    public
  {
    // at the end of 3rd month, unlock 1/3
    lockups.push(Lockup({
      lockupTime: 90 days,
      isReleased: false,
      totalDivisor: 3
    }));
    // at the end of 6th month, unlock additional 1/3
    lockups.push(Lockup({
      lockupTime: 180 days,
      isReleased: false,
      totalDivisor: 3
    }));
    // at the end of 9th month, unlock additional 1/3
    lockups.push(Lockup({
      lockupTime: 270 days,
      isReleased: false,
      totalDivisor: 3
    }));

    require(lockups.length == 3);
  }
}
