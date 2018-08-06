pragma solidity ^0.4.23;

import "../CelerTimelock.sol";
import "../lib/external/openzeppelin-solidity/contracts/math/SafeMath.sol";


contract MockCelerTimelock is CelerTimelock {
  using SafeMath for uint256;

  constructor(
    ERC20Basic _token,
    address _beneficiary
  )
    CelerTimelock(_token, _beneficiary)
    public
  {
  }

  function timeTravel(uint256 secs) external {
    startTime = startTime.sub(secs);
  }
}
