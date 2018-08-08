pragma solidity ^0.4.24;

import "../CelerCrowdsale.sol";
import "../lib/external/openzeppelin-solidity/contracts/math/SafeMath.sol";


contract MockCelerCrowdsale is CelerCrowdsale {
  using SafeMath for uint256;

  constructor(
    uint256 _rate, 
    address _wallet, 
    ERC20 _token,
    uint256 _openingTime, 
    uint256 _closingTime,
    uint256 _initialMaxCap, 
    // uint256 _stageDuration,
    // uint256 _minCap,
    // uint256 _maxGasPrice,
    address _tokenWallet
  )
    public
    CelerCrowdsale(
      _rate, 
      _wallet, 
      _token,
      _openingTime, 
      _closingTime,
      _initialMaxCap, 
      // _stageDuration,
      // _minCap,
      // _maxGasPrice,
      _tokenWallet
    )
  {
  }

  function timeTravel(uint256 secs) external {
    openingTime = openingTime.sub(secs);
    closingTime = closingTime.sub(secs);
  }

}
