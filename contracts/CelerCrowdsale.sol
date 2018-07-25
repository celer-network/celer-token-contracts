pragma solidity ^0.4.24;

import "./lib/TwoStageCappedCrowdsale.sol";
import "./lib/external/openzeppelin-solidity/contracts/crowdsale/validation/WhitelistedCrowdsale.sol";
import "./lib/external/openzeppelin-solidity/contracts/crowdsale/emission/AllowanceCrowdsale.sol";
import "./lib/external/openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";

contract CelerCrowdsale is TwoStageCappedCrowdsale, WhitelistedCrowdsale, AllowanceCrowdsale {
  constructor (
    uint256 _rate,
    address _wallet,
    ERC20 _token,
    uint256 _individualCap, 
    uint256 _perTimeCap, 
    uint256 _stageChangingTime, 
    uint256 _cooldownInterval,
    address _tokenWallet
  )
    public
    Crowdsale(_rate, _wallet, _token)
    TwoStageCappedCrowdsale(_individualCap, _perTimeCap, _stageChangingTime, _cooldownInterval)
    AllowanceCrowdsale(_tokenWallet)
  {
  }
}
