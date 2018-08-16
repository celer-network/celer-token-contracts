pragma solidity ^0.4.23;

import "../MoonTimelock.sol";
import "../lib/external/openzeppelin-solidity/contracts/math/SafeMath.sol";


contract MockMoonTimelock is MoonTimelock {
  using SafeMath for uint256;

  constructor(
    ERC20Basic _token,
    address _beneficiary
  )
    MoonTimelock(_token, _beneficiary)
    public
  {
  }

  function timeTravel(uint256 secs) external {
    startTime = startTime.sub(secs);
  }
}
