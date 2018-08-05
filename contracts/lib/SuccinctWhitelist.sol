pragma solidity ^0.4.24;

import "./external/openzeppelin-solidity/contracts/ownership/Ownable.sol";


/**
 * @title SuccinctWhitelist
 * @dev The SuccinctWhitelist contract has a whitelist of addresses, and provides basic authorization control functions.
 * Note: this is a succinct, straightforward and easy to understand implementation of openzeppelin-solidity's Whitelisted,
 * but with full functionalities and APIs of openzeppelin-solidity's Whitelisted without inheriting RBAC.
 */
contract SuccinctWhitelist is Ownable {
  mapping(address => bool) public whitelisted;

  event WhitelistAdded(address indexed operator);
  event WhitelistRemoved(address indexed operator);

  /**
   * @dev Throws if operator is not whitelisted.
   * @param _operator address
   */
  modifier onlyIfWhitelisted(address _operator) {
    require(whitelisted[_operator]);
    _;
  }

  /**
   * @dev add an address to the whitelist
   * @param _operator address
   * @return true if the address was added to the whitelist,
   * or was already in the whitelist
   */
  function addAddressToWhitelist(address _operator)
    onlyOwner
    public
    returns (bool)
  {
    whitelisted[_operator] = true;
    emit WhitelistAdded(_operator);
    return true;
  }

  /**
   * @dev getter to determine if address is in whitelist
   */
  function whitelist(address _operator)
    public
    view
    returns (bool)
  {
    bool result = whitelisted[_operator];
    return result;
  }

  /**
   * @dev add addresses to the whitelist
   * @param _operators addresses
   * @return true if all addresses was added to the whitelist,
   * or were already in the whitelist
   */
  function addAddressesToWhitelist(address[] _operators)
    onlyOwner
    public
    returns (bool)
  {
    for (uint256 i = 0; i < _operators.length; i++) {
      require(addAddressToWhitelist(_operators[i]));
    }
    return true;
  }

  /**
   * @dev remove an address from the whitelist
   * @param _operator address
   * @return true if the address was removed from the whitelist,
   * or the address wasn't in the whitelist in the first place
   */
  function removeAddressFromWhitelist(address _operator)
    onlyOwner
    public
    returns (bool)
  {
    whitelisted[_operator] = false;
    emit WhitelistRemoved(_operator);
    return true;
  }

  /**
   * @dev remove addresses from the whitelist
   * @param _operators addresses
   * @return true if all addresses were removed from the whitelist,
   * or weren't in the whitelist in the first place
   */
  function removeAddressesFromWhitelist(address[] _operators)
    onlyOwner
    public
    returns (bool)
  {
    for (uint256 i = 0; i < _operators.length; i++) {
      require(removeAddressFromWhitelist(_operators[i]));
    }
    return true;
  }

}
