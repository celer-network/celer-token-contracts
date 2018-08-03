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
    /**
     * @param _rate Number of token units a buyer gets per wei
     * @param _wallet Address where collected funds will be forwarded to
     * @param _token Address of the token being sold
     */
    Crowdsale(_rate, _wallet, _token)

    /**
     * @dev Constructor, takes crowdsale opening and closing times.
     * @param _openingTime Crowdsale opening time
     * @param _closingTime Crowdsale closing time
     */
    TimedCrowdsale(_openingTime, _closingTime)

    /**
     * @dev Constructor, takes individual max cap of first stage and duration of each stage
     * @param _originalMaxCap Max cap of each user in first stage
     * @param _stageDuration Duration of each stage
     */
    StagedMaxCapCrowdsale(_originalMaxCap, _stageDuration)
    
    /**
     * @dev Constructor, takes minimum amount of wei accepted for each user in the crowdsale.
     * @param _minCap Min amount of wei to be contributed for each user
     */
    MinCapCrowdsale(_minCap)
    
    /**
     * @dev Constructor, takes maximum gas price accepted for each purchase.
     * @param _maxGasPrice Max gas price for each purchase transaction
     */
    MaxGasPriceCrowdsale(_maxGasPrice)
    
    /**
     * @dev Constructor, takes token wallet address.
     * @param _tokenWallet Address holding the tokens, which has approved allowance to the crowdsale
     */
    AllowanceCrowdsale(_tokenWallet)
  {
  }
  
}
