pragma solidity ^0.4.24;

import "./lib/PausableCrowdsale.sol";
import "./lib/StagedMaxCapCrowdsale.sol";
import "./lib/MinCapCrowdsale.sol";
import "./lib/MaxGasPriceCrowdsale.sol";
import "./lib/SuccinctWhitelistedCrowdsale.sol";
import "./lib/external/openzeppelin-solidity/contracts/crowdsale/emission/AllowanceCrowdsale.sol";
import "./lib/external/openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";


/**
 * @title CelerCrowdsale
 * @dev CelerCrowdsale is the crowdsale contract for Celer Network.
 */
contract CelerCrowdsale is PausableCrowdsale, StagedMaxCapCrowdsale, MinCapCrowdsale, MaxGasPriceCrowdsale, SuccinctWhitelistedCrowdsale, AllowanceCrowdsale {
  constructor (
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
     * @param _initialMaxCap Max cap of each user in first stage
     * @param _stageDuration Duration of each stage -> hardcoded as X hours
     * @note for audit only: X will be a hardcoded constant integer in final deployment.
     * For audit purpose, you may replace it with a reasonable integer like 5, 10, 15 etc.
     */
    StagedMaxCapCrowdsale(_initialMaxCap, X hours)
    
    /**
     * @dev Constructor, takes minimum amount of wei accepted for each user in the crowdsale.
     * @param _minCap Min amount of wei to be contributed for each user -> hardcoded as Y ether 
     * @note for audit only: Y will be a hardcoded constant number in final deployment.
     * For audit purpose, you may replace it with a reasonable number like 0.01, 0.001, 0.0001 etc.
     */
    MinCapCrowdsale(Y ether)
    
    /**
     * @dev Constructor, takes maximum gas price accepted for each purchase.
     * @param _maxGasPrice Max gas price for each purchase transaction -> hardcoded as Z
     * @note for audit only: Z will be a hardcoded constant integer in final deployment.
     * For audit purpose, you may replace it with a reasonable integer like 20000000000, 50000000000, 100000000000
     */
    MaxGasPriceCrowdsale(Z)
    
    /**
     * @dev Constructor, takes token wallet address.
     * @param _tokenWallet Address holding the tokens, which has approved allowance to the crowdsale
     */
    AllowanceCrowdsale(_tokenWallet)
  {
  }

  /**
   * @dev Sets the number of token units a buyer gets per wei.
   * @param _rate Number of token units a buyer gets per wei
   * Require: onlyOwner; check _rate > 0; can set only before openingTime
   */
  function setRate(uint256 _rate) external onlyOwner {
    require(_rate > 0);
    require(now < openingTime);

    rate = _rate;
  }

  /**
   * @dev Sets the max cap of each user in first stage.
   * @param _initialMaxCap Max cap of each user in first stage
   * Require: onlyOwner; check _initialMaxCap > 0; can set only before openingTime
   */
  function setInitialMaxCap(uint256 _initialMaxCap) external onlyOwner {
    require(_initialMaxCap > 0);
    require(now < openingTime);

    initialMaxCap = _initialMaxCap;
  }

}
