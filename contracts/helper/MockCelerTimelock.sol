pragma solidity ^0.4.23;

import "../CelerTimelock.sol";
import "../lib/external/openzeppelin-solidity/contracts/math/SafeMath.sol";


contract MockCelerTimelock is CelerTimelock {
  using SafeMath for uint;

  constructor(
    ERC20Basic _token,
    address _beneficiary
  )
    CelerTimelock(_token, _beneficiary)
    public
  {
  }

  function timeTravel(uint secs) external {
    startTime = startTime.sub(secs);
  }
}
