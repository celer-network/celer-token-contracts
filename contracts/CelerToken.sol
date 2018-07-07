pragma solidity ^0.4.23;

import "./lib/external/openzeppelin-solidity/contracts/token/ERC20/PausableToken.sol";


contract CelerToken is PausableToken {
  string public name = "CelerToken";
  string public symbol = "CELR";
  uint public decimals = 18;
  uint public INITIAL_SUPPLY = (10 ** 10) * (10 ** decimals);

  constructor() public {
    totalSupply_ = INITIAL_SUPPLY;
    balances[msg.sender] = INITIAL_SUPPLY;
  }
}
