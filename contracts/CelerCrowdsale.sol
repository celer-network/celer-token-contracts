pragma solidity ^0.4.24;

import "./lib/PausableCrowdsale.sol";
import "./lib/StagedMaxCapCrowdsale.sol";
import "./lib/MinCapCrowdsale.sol";
import "./lib/MaxGasPriceCrowdsale.sol";
import "./lib/external/openzeppelin-solidity/contracts/crowdsale/validation/WhitelistedCrowdsale.sol";
import "./lib/external/openzeppelin-solidity/contracts/crowdsale/emission/AllowanceCrowdsale.sol";
import "./lib/external/openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";

contract CelerCrowdsale is PausableCrowdsale, StagedMaxCapCrowdsale, MinCapCrowdsale, MaxGasPriceCrowdsale, WhitelistedCrowdsale, AllowanceCrowdsale {
  constructor (
    uint256 _rate, 
    address _wallet, 
    ERC20 _token,
    uint256 _openingTime, 
    uint256 _closingTime,
    uint256 _originalMaxCap, 
    uint256 _stageDuration,
    uint256 _minCap,
    uint256 _maxGasPrice,
    address _tokenWallet
  )
    public
    Crowdsale(_rate, _wallet, _token)
    TimedCrowdsale(_openingTime, _closingTime)
    StagedMaxCapCrowdsale(_originalMaxCap, _stageDuration)
    MinCapCrowdsale(_minCap)
    MaxGasPriceCrowdsale(_maxGasPrice)
    AllowanceCrowdsale(_tokenWallet)
  {
  }
}
