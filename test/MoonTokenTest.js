const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:8545'));

const MoonToken = artifacts.require('MoonToken');

contract('MoonToken', async accounts => {
  let moonToken;
  let moonTokenTwo;

  before(async () => {
    moonToken = await MoonToken.new();
    moonTokenTwo = await MoonToken.new();
  });

  it('should be constructed correctly', async () => {
    const name = await moonToken.name();
    const symbol = await moonToken.symbol();
    const decimals = await moonToken.decimals();
    const totalSupply = await moonToken.totalSupply();
    const ownerBalance = await moonToken.balanceOf(accounts[0]);
    const transferOpened = await moonToken.transferOpened();
    const expectedTotalSupply = 1e28; // 10 billion tokens with 18 decimals
    
    assert.equal(name, 'MoonToken');
    assert.equal(symbol, 'MT');
    assert.equal(decimals.toString(), '18');
    assert.equal(totalSupply.toString(), expectedTotalSupply.toString());
    assert.equal(ownerBalance.toString(), totalSupply.toString());
    assert.equal(transferOpened.toString(), 'false');
  });

  it('should transfer correctly in mathematics', async () => {
    await moonToken.openTransfer();
    const transferOpened = await moonToken.transferOpened();
    assert.equal(transferOpened.toString(), 'true');

    const amount = 1e26;

    const previousBalance = await moonToken.balanceOf(accounts[1]);
    assert.equal(previousBalance.toString(), '0');

    const result = await moonToken.transfer.call(accounts[1], amount);
    assert.equal(result.toString(), 'true');

    const receipt = await moonToken.transfer(accounts[1], amount);
    const currentBalance = await moonToken.balanceOf(accounts[1]);
    const ownerBalance = await moonToken.balanceOf(accounts[0]);
    const { event, args } = receipt.logs[0];
    const expectedOwnerBalance = 9.9e27 // 1e28 - amount;

    assert.equal(event, 'Transfer');
    assert.equal(args.from, accounts[0]);
    assert.equal(args.to, accounts[1]);
    assert.equal(args.value.toString(), amount.toString());
    assert.equal(currentBalance.toString(), amount.toString());
    assert.equal(ownerBalance.toString(), expectedOwnerBalance.toString());
  });

  it('should transferFrom correctly in mathematics', async () => {
    let receipt;
    let event;
    let args;
    let ownerBalance;
    const amount = 2e26;
    const originalOwnerBalance = await moonToken.balanceOf(accounts[0]);

    const previousAllowance = await moonToken.allowance(accounts[0], accounts[2]);
    const previousBalance = await moonToken.balanceOf(accounts[3]);
    assert.equal(previousAllowance.toString(), '0');
    assert.equal(previousBalance.toString(), '0');

    receipt = await moonToken.approve(accounts[2], amount);
    event = receipt.logs[0].event;
    args = receipt.logs[0].args;
    const allowanceAfterApprove = await moonToken.allowance(accounts[0], accounts[2]);
    const balanceOfSpender = await moonToken.balanceOf(accounts[2]);
    ownerBalance = await moonToken.balanceOf(accounts[0]);
    assert.equal(event, 'Approval');
    assert.equal(args.owner, accounts[0]);
    assert.equal(args.spender, accounts[2]);
    assert.equal(args.value.toString(), amount.toString());
    assert.equal(allowanceAfterApprove.toString(), amount.toString());
    assert.equal(balanceOfSpender.toString(), '0');
    assert.equal(ownerBalance.toString(), originalOwnerBalance.toString());

    receipt = await moonToken.transferFrom(
      accounts[0],
      accounts[3],
      amount,
      {
        from: accounts[2]
      }
    );
    event = receipt.logs[0].event;
    args = receipt.logs[0].args;
    ownerBalance = await moonToken.balanceOf(accounts[0]);
    const expectedOwnerBalance = 9.7e27;
    const currentAllowance = await moonToken.allowance(accounts[0], accounts[2]);
    const currentBalance = await moonToken.balanceOf(accounts[3]);

    assert.equal(event, 'Transfer');
    assert.equal(args.from, accounts[0]);
    assert.equal(args.to, accounts[3]);
    assert.equal(args.value.toString(), amount.toString());
    assert.equal(ownerBalance.toString(), expectedOwnerBalance.toString());
    assert.equal(currentAllowance.toString(), '0');
    assert.equal(currentBalance.toString(), amount.toString());
  });

  it('should fail to transferFrom without allowed amount', async () => {
    amount = 1e26;
    await moonToken.approve(accounts[4], amount);
    let err = null;
    try {
      await moonToken.transferFrom(
        accounts[0],
        accounts[5],
        {
          from: accounts[6]
        }
      );
    } catch (error) {
      err = error;
    }
    assert.isOk(err instanceof Error);
  });

  it('should approve, increaseApproval, decreaseApproval correctly', async () => {
    let allowance;
    let receipt;
    let event;
    let args;

    await moonToken.approve(accounts[4], 2e26);
    allowance = await moonToken.allowance(accounts[0], accounts[4]);
    assert.equal(allowance.toString(), (2e26).toString());

    receipt = await moonToken.increaseApproval(accounts[4], 1e26);
    event = receipt.logs[0].event;
    args = receipt.logs[0].args;
    allowance = await moonToken.allowance(accounts[0], accounts[4]);
    assert.equal(event, 'Approval');
    assert.equal(args.owner, accounts[0]);
    assert.equal(args.spender, accounts[4]);
    assert.equal(args.value.toString(), (3e26).toString());
    assert.equal(allowance.toString(), (3e26).toString());

    receipt = await moonToken.decreaseApproval(accounts[4], 2e26);
    event = receipt.logs[0].event;
    args = receipt.logs[0].args;
    allowance = await moonToken.allowance(accounts[0], accounts[4]);
    assert.equal(event, 'Approval');
    assert.equal(args.owner, accounts[0]);
    assert.equal(args.spender, accounts[4]);
    assert.equal(args.value.toString(), (1e26).toString());
    assert.equal(allowance.toString(), (1e26).toString());
  });

  it('should fail to do operations requiring ownership without ownership', async () => {
    let err = null;

    // should fail to pause
    try {
      await moonToken.pause(
        {
          from: accounts[1]
        }
      );
    } catch (error) {
      err = error;
    }
    assert.isOk(err instanceof Error);

    // unpause()
    await moonToken.pause();
    try {
      await moonToken.unpause(
        {
          from: accounts[2]
        }
      );
    } catch (error) {
      err = error;
    }
    assert.isOk(err instanceof Error);
    await moonToken.unpause();
    const paused = await moonToken.paused();
    assert.equal(paused.toString(), 'false');

    // addAddressToWhitelist()
    try {
      await moonToken.addAddressToWhitelist(
        accounts[6],
        {
          from: accounts[3]
        }
      );
    } catch (error) {
      err = error;
    }
    assert.isOk(err instanceof Error);

    // addAddressesToWhitelist()
    try {
      await moonToken.addAddressesToWhitelist(
        [accounts[6], accounts[7]],
        {
          from: accounts[4]
        }
      );
    } catch (error) {
      err = error;
    }
    assert.isOk(err instanceof Error);

    // removeAddressFromWhitelist()
    try {
      await moonToken.removeAddressFromWhitelist(
        accounts[1],
        {
          from: accounts[5]
        }
      );
    } catch (error) {
      err = error;
    }
    assert.isOk(err instanceof Error);

    // removeAddressesFromWhitelist()
    try {
      await moonToken.removeAddressesFromWhitelist(
        [accounts[1], accounts[2]],
        {
          from: accounts[6]
        }
      );
    } catch (error) {
      err = error;
    }
    assert.isOk(err instanceof Error);

    // should fail to renounceOwnership
    try {
      await moonToken.renounceOwnership(
        {
          from: accounts[2]
        }
      );
    } catch (error) {
      err = error;
    }
    assert.isOk(err instanceof Error);

    // should fail to transferOwnership
    try {
      await moonToken.transferOwnership(
        accounts[4],
        {
          from: accounts[3]
        }
      );
    } catch (error) {
      err = error;
    }
    assert.isOk(err instanceof Error);
  });

  it('should do operations requiring ownership correctly with ownership', async () => {
    let receipt;
    let event;
    let args;
    
    // should transfer ownership from accounts[0] to accounts[1] correctly
    receipt = await moonToken.transferOwnership(
      accounts[1],
      {
        from: accounts[0]
      }
    );
    event = receipt.logs[0].event;
    args = receipt.logs[0].args;
    assert.equal(event, 'OwnershipTransferred');
    assert.equal(args.previousOwner, accounts[0]);
    assert.equal(args.newOwner, accounts[1]);

    // should fail to transfer ownership from accounts[1] to accounts[0]
    let err = null;
    try {
      await moonToken.transferOwnership(
        accounts[2],
        {
          from: accounts[0]
        }
      );
    } catch (error) {
      err = error;
    }
    assert.isOk(err instanceof Error);

    // should transfer ownership from accounts[1] to accounts[0] correctly
    receipt = await moonToken.transferOwnership(
      accounts[0],
      {
        from: accounts[1]
      }
    );
    event = receipt.logs[0].event;
    args = receipt.logs[0].args;
    assert.equal(event, 'OwnershipTransferred');
    assert.equal(args.previousOwner, accounts[1]);
    assert.equal(args.newOwner, accounts[0]);
  });

  it('should fail to do operations requiring unpaused when paused', async () => {
    let receipt;
    let event;
    let args;
    let err = null;

    const balance = await moonToken.balanceOf(accounts[1]);
    assert.equal(balance.toString(), (1e26).toString());
    
    receipt = await moonToken.approve(
      accounts[2],
      200,
      {
        from: accounts[1]
      }
    );
    event = receipt.logs[0].event;
    args = receipt.logs[0].args;
    assert.equal(event, 'Approval');
    assert.equal(args.owner, accounts[1]);
    assert.equal(args.spender, accounts[2]);
    assert.equal(args.value.toString(), '200');

    receipt = await moonToken.pause(
      {
        from: accounts[0]
      }
    );
    event = receipt.logs[0].event;
    assert.equal(event, 'Pause');

    // should fail to transfer
    try {
      await moonToken.transfer(
        accounts[2],
        100,
        {
          from: accounts[1]
        }
      );
    } catch (error) {
      err = error;
    }
    assert.isOk(err instanceof Error);

    // should fail to transferFrom
    try {
      await moonToken.transferFrom(
        accounts[1],
        accounts[3],
        100,
        {
          from: accounts[2]
        }
      );
    } catch (error) {
      err = error;
    }
    assert.isOk(err instanceof Error);

    // should fail to approve
    try {
      await moonToken.approve(
        accounts[2],
        100,
        {
          from: accounts[1]
        }
      );
    } catch (error) {
      err = error;
    }
    assert.isOk(err instanceof Error);

    // should fail to increaseApproval
    try {
      await moonToken.increaseApproval(
        accounts[2],
        100,
        {
          from: accounts[1]
        }
      );
    } catch (error) {
      err = error;
    }
    assert.isOk(err instanceof Error);

    // should fail to decreaseApproval
    try {
      await moonToken.decreaseApproval(
        accounts[2],
        100,
        {
          from: accounts[1]
        }
      );
    } catch (error) {
      err = error;
    }
    assert.isOk(err instanceof Error);
  });

  it('should operate correctly after unpause', async () => {
    let err = null;
    try {
      await moonToken.unpause(
        {
          from: accounts[1]
        }
      );
    } catch (error) {
      err = error;
    }
    assert.isOk(err instanceof Error);

    const receipt = await moonToken.unpause(
      {
        from: accounts[0]
      }
    );
    const { event } = receipt.logs[0];
    assert.equal(event, 'Unpause');

    let result;
    result = await moonToken.transfer.call(
      accounts[2],
      100,
      {
        from: accounts[1]
      }
    );
    assert.equal(result.toString(), 'true');
    result = await moonToken.transferFrom.call(
      accounts[1],
      accounts[3],
      100,
      {
        from: accounts[2]
      }
    );
    assert.equal(result.toString(), 'true');
    result = await moonToken.approve.call(
      accounts[2],
      300,
      {
        from: accounts[1]
      }
    );
    assert.equal(result.toString(), 'true');
    result = await moonToken.increaseApproval.call(
      accounts[2],
      300,
      {
        from: accounts[1]
      }
    );
    assert.equal(result.toString(), 'true');
    result = await moonToken.decreaseApproval.call(
      accounts[2],
      50,
      {
        from: accounts[1]
      }
    );
    assert.equal(result.toString(), 'true');
  });

  /**
   * Approximate records for moonTokenTwo:
   * owner: accounts[0]
   * whitelist: accounts[1], accounts[2], accounts[3]
   
   * Token amount: 
   * accounts[0]: 1e28 - 1e26 - 3e25 - 3e25
   * accounts[1]: 1e26 - 5e25 - 2e25
   * accounts[2]: 5e25 - 1e25
   * accounts[3]: 2e25
   * accounts[4]: 1e25
   * accounts[5]: 3e25
   * accounts[6]: 3e25
   * accounts[7]: 3e25
   */
  it('should transfer correctly for owner when transfer not opened', async () => {
    // pause first moonToken to prevent any further use of this instance by mistake
    await moonToken.pause();

    const amount = 1e26;

    const previousBalance = await moonTokenTwo.balanceOf(accounts[1]);
    assert.equal(previousBalance.toString(), '0');

    const result = await moonTokenTwo.transfer.call(accounts[1], amount);
    assert.equal(result.toString(), 'true');

    const receipt = await moonTokenTwo.transfer(accounts[1], amount);
    const currentBalance = await moonTokenTwo.balanceOf(accounts[1]);
    const ownerBalance = await moonTokenTwo.balanceOf(accounts[0]);
    const { event, args } = receipt.logs[0];
    const expectedOwnerBalance = 9.9e27 // 1e28 - amount;

    assert.equal(event, 'Transfer');
    assert.equal(args.from, accounts[0]);
    assert.equal(args.to, accounts[1]);
    assert.equal(args.value.toString(), amount.toString());
    assert.equal(currentBalance.toString(), amount.toString());
    assert.equal(ownerBalance.toString(), expectedOwnerBalance.toString());
  });

  it('should transferFrom correctly for owner when transfer not opened', async () => {
    let receipt;
    let event;
    let args;
    let ownerBalance;
    const amount = 5e25;
    const originalOwnerBalance = await moonTokenTwo.balanceOf(accounts[1]);

    const previousAllowance = await moonTokenTwo.allowance(accounts[1], accounts[0]);
    const previousBalance = await moonTokenTwo.balanceOf(accounts[2]);
    assert.equal(previousAllowance.toString(), '0');
    assert.equal(previousBalance.toString(), '0');

    receipt = await moonTokenTwo.approve(
      accounts[0], 
      amount,
      {
        from: accounts[1]
      }
    );
    event = receipt.logs[0].event;
    args = receipt.logs[0].args;
    const allowanceAfterApprove = await moonTokenTwo.allowance(accounts[1], accounts[0]);
    ownerBalance = await moonTokenTwo.balanceOf(accounts[1]);
    assert.equal(event, 'Approval');
    assert.equal(args.owner, accounts[1]);
    assert.equal(args.spender, accounts[0]);
    assert.equal(args.value.toString(), amount.toString());
    assert.equal(allowanceAfterApprove.toString(), amount.toString());
    assert.equal(ownerBalance.toString(), originalOwnerBalance.toString());

    receipt = await moonTokenTwo.transferFrom(
      accounts[1],
      accounts[2],
      amount,
      {
        from: accounts[0]
      }
    );
    event = receipt.logs[0].event;
    args = receipt.logs[0].args;
    ownerBalance = await moonTokenTwo.balanceOf(accounts[1]);
    const currentAllowance = await moonTokenTwo.allowance(accounts[1], accounts[0]);
    const currentBalance = await moonTokenTwo.balanceOf(accounts[2]);

    assert.equal(event, 'Transfer');
    assert.equal(args.from, accounts[1]);
    assert.equal(args.to, accounts[2]);
    assert.equal(args.value.toString(), amount.toString());
    assert.equal(ownerBalance.toString(), (originalOwnerBalance - amount).toString());
    assert.equal(currentAllowance.toString(), '0');
    assert.equal(currentBalance.toString(), amount.toString());
  });

  it('should fail to transfer for non-owner when transfer not opened', async () => {
    let err;
    try {
      await moonTokenTwo.transfer(
        accounts[0],
        100,
        {
          from: accounts[1]
        }
      );
    } catch (error) {
      err = error;
    }
    assert.isOk(err instanceof Error);
  });

  it('should fail to transferFrom for non-owner when transfer not opened', async () => {
    let err;
    const receipt = await moonTokenTwo.approve(
      accounts[3],
      100,
      {
        from: accounts[0]
      }
    );
    const { event, args } = receipt.logs[0];
    assert.equal(event, 'Approval');
    assert.equal(args.owner, accounts[0]);
    assert.equal(args.spender, accounts[3]);
    assert.equal(args.value.toString(), '100');
    try {
      await moonTokenTwo.transferFrom(
        accounts[0],
        accounts[1],
        100,
        {
          from: accounts[3]
        }
      );
    } catch (error) {
      err = error;
    }
    assert.isOk(err instanceof Error);
  });

  it('should transfer correctly for whitelisted users when transfer not opened', async () => {
    let receipt;
    let event;
    let args;
    
    // address
    receipt = await moonTokenTwo.addAddressToWhitelist(accounts[1]);
    event = receipt.logs[0].event;
    args = receipt.logs[0].args;
    assert.equal(event, 'WhitelistAdded');
    assert.equal(args.operator, accounts[1]);

    receipt = await moonTokenTwo.transfer(
      accounts[3],
      2e25,
      {
        from: accounts[1]
      }
    );
    event = receipt.logs[0].event;
    args = receipt.logs[0].args;
    assert.equal(event, 'Transfer');
    assert.equal(args.from, accounts[1]);
    assert.equal(args.to, accounts[3]);
    assert.equal(args.value.toString(), (2e25).toString());

    // addresses
    const addresses = [accounts[2], accounts[3]];
    receipt = await moonTokenTwo.addAddressesToWhitelist(addresses);
    for (i = 0; i < addresses.length; ++i) {
      event = receipt.logs[i].event;
      args = receipt.logs[i].args;
      assert.equal(event, 'WhitelistAdded');
      assert.equal(args.operator, accounts[i+2]);
    }

    receipt = await moonTokenTwo.transfer(
      accounts[4],
      1e25,
      {
        from: accounts[2]
      }
    );
    event = receipt.logs[0].event;
    args = receipt.logs[0].args;
    assert.equal(event, 'Transfer');
    assert.equal(args.from, accounts[2]);
    assert.equal(args.to, accounts[4]);
    assert.equal(args.value.toString(), (1e25).toString());
  });

  it('should transferFrom correctly for whitelisted users when transfer not opened', async () => {
    let receipt;
    let event;
    let args;
    let allowance;
    let balance;

    // address
    receipt = await moonTokenTwo.approve(accounts[1], 3e25);
    event = receipt.logs[0].event;
    args = receipt.logs[0].args;
    allowance = await moonTokenTwo.allowance(accounts[0], accounts[1]);
    assert.equal(event, 'Approval');
    assert.equal(args.owner, accounts[0]);
    assert.equal(args.spender, accounts[1]);
    assert.equal(args.value.toString(), (3e25).toString());
    assert.equal(allowance.toString(), (3e25).toString());

    receipt = await moonTokenTwo.transferFrom(
      accounts[0],
      accounts[5],
      3e25,
      {
        from: accounts[1]
      }
    );
    event = receipt.logs[0].event;
    args = receipt.logs[0].args;
    balance = await moonTokenTwo.balanceOf(accounts[5]);
    assert.equal(event, 'Transfer');
    assert.equal(args.from, accounts[0]);
    assert.equal(args.to, accounts[5]);
    assert.equal(args.value.toString(), (3e25).toString());
    assert.equal(balance.toString(), (3e25).toString());

    // addresses
    receipt = await moonTokenTwo.approve(accounts[3], 3e25);
    event = receipt.logs[0].event;
    args = receipt.logs[0].args;
    allowance = await moonTokenTwo.allowance(accounts[0], accounts[3]);
    assert.equal(event, 'Approval');
    assert.equal(args.owner, accounts[0]);
    assert.equal(args.spender, accounts[3]);
    assert.equal(args.value.toString(), (3e25).toString());
    assert.equal(allowance.toString(), (3e25).toString());

    receipt = await moonTokenTwo.transferFrom(
      accounts[0],
      accounts[6],
      3e25,
      {
        from: accounts[3]
      }
    );
    event = receipt.logs[0].event;
    args = receipt.logs[0].args;
    balance = await moonTokenTwo.balanceOf(accounts[6]);
    assert.equal(event, 'Transfer');
    assert.equal(args.from, accounts[0]);
    assert.equal(args.to, accounts[6]);
    assert.equal(args.value.toString(), (3e25).toString());
    assert.equal(balance.toString(), (3e25).toString());
  });

  it('should fail to transfer for non-whitelisted and non-owner users when transfer not opened', async () => {
    let err;
    try {
      await moonTokenTwo.transfer(
        accounts[0],
        100,
        {
          from: accounts[4]
        }
      );
    } catch (error) {
      err = error;
    }
    assert.isOk(err instanceof Error);
  });

  it('should fail to transferFrom for non-whitelisted and non-owner users when transfer not opened', async () => {
    let err;
    const receipt = await moonTokenTwo.approve(
      accounts[5],
      100,
      {
        from: accounts[0]
      }
    );
    const { event, args } = receipt.logs[0];
    assert.equal(event, 'Approval');
    assert.equal(args.owner, accounts[0]);
    assert.equal(args.spender, accounts[5]);
    assert.equal(args.value.toString(), '100');
    try {
      await moonTokenTwo.transferFrom(
        accounts[0],
        accounts[1],
        100,
        {
          from: accounts[5]
        }
      );
    } catch (error) {
      err = error;
    }
    assert.isOk(err instanceof Error);
  });

  it('should fail to transfer for removed whitelisted users when transfer not opened', async () => {
    let receipt;
    let event;
    let args;
    let err;

    // address
    receipt = await moonTokenTwo.removeAddressFromWhitelist(accounts[1]);
    event = receipt.logs[0].event;
    args = receipt.logs[0].args;
    assert.equal(event, 'WhitelistRemoved');
    assert.equal(args.operator, accounts[1]);

    try {
      await moonTokenTwo.transfer(
        accounts[0],
        100,
        {
          from: accounts[1]
        }
      );
    } catch (error) {
      err = error;
    }
    assert.isOk(err instanceof Error);

    // addresses
    const addresses = [accounts[2], accounts[3]];
    receipt = await moonTokenTwo.removeAddressesFromWhitelist(addresses);
    for (i = 0; i < addresses.length; ++i) {
      event = receipt.logs[i].event;
      args = receipt.logs[i].args;
      assert.equal(event, 'WhitelistRemoved');
      assert.equal(args.operator, accounts[i+2]);
    }
    
    try {
      await moonTokenTwo.transfer(
        accounts[0],
        100,
        {
          from: accounts[3]
        }
      );
    } catch (error) {
      err = error;
    }
    assert.isOk(err instanceof Error);
  });

  it('should fail to transferFrom for removed whitelisted users when transfer not opened', async () => {
    let receipt;
    let event;
    let args;
    
    // address
    let err;
    receipt = await moonTokenTwo.approve(
      accounts[1],
      100,
      {
        from: accounts[0]
      }
    );
    event = receipt.logs[0].event;
    args = receipt.logs[0].args;
    assert.equal(event, 'Approval');
    assert.equal(args.owner, accounts[0]);
    assert.equal(args.spender, accounts[1]);
    assert.equal(args.value.toString(), '100');
    try {
      await moonTokenTwo.transferFrom(
        accounts[0],
        accounts[2],
        100,
        {
          from: accounts[1]
        }
      );
    } catch (error) {
      err = error;
    }
    assert.isOk(err instanceof Error);

    // addresses
    receipt = await moonTokenTwo.approve(
      accounts[3],
      100,
      {
        from: accounts[0]
      }
    );
    event = receipt.logs[0].event;
    args = receipt.logs[0].args;
    assert.equal(event, 'Approval');
    assert.equal(args.owner, accounts[0]);
    assert.equal(args.spender, accounts[3]);
    assert.equal(args.value.toString(), '100');
    try {
      await moonTokenTwo.transferFrom(
        accounts[0],
        accounts[1],
        100,
        {
          from: accounts[3]
        }
      );
    } catch (error) {
      err = error;
    }
    assert.isOk(err instanceof Error);
  });

  it('should transfer correctly for any user when transfer opened', async () => {
    await moonTokenTwo.openTransfer();
    const transferOpened = await moonTokenTwo.transferOpened();
    assert.equal(transferOpened.toString(), 'true');

    receipt = await moonTokenTwo.transfer(
      accounts[0],
      100,
      {
        from: accounts[4]
      }
    );
    event = receipt.logs[0].event;
    args = receipt.logs[0].args;
    assert.equal(event, 'Transfer');
    assert.equal(args.from, accounts[4]);
    assert.equal(args.to, accounts[0]);
    assert.equal(args.value.toString(), (100).toString());
  });

  it('should transferFrom correctly for any user when transfer opened', async () => {
    let receipt;
    let event;
    let args;

    receipt = await moonTokenTwo.approve(accounts[9], 3e25);
    event = receipt.logs[0].event;
    args = receipt.logs[0].args;
    const allowance = await moonTokenTwo.allowance(accounts[0], accounts[9]);
    assert.equal(event, 'Approval');
    assert.equal(args.owner, accounts[0]);
    assert.equal(args.spender, accounts[9]);
    assert.equal(args.value.toString(), (3e25).toString());
    assert.equal(allowance.toString(), (3e25).toString());

    receipt = await moonTokenTwo.transferFrom(
      accounts[0],
      accounts[7],
      3e25,
      {
        from: accounts[9]
      }
    );
    event = receipt.logs[0].event;
    args = receipt.logs[0].args;
    const balance = await moonTokenTwo.balanceOf(accounts[7]);
    assert.equal(event, 'Transfer');
    assert.equal(args.from, accounts[0]);
    assert.equal(args.to, accounts[7]);
    assert.equal(args.value.toString(), (3e25).toString());
    assert.equal(balance.toString(), (3e25).toString());
  });

  it('should fail to transfer tokens to Moon Token contract', async () => {
    let err;
    try {
      await moonTokenTwo.transfer(
        moonTokenTwo.address,
        100,
        {
          from: accounts[0]
        }
      );
    } catch (error) {
      err = error;
    }
    assert.isOk(err instanceof Error);
  });

  it('should fail to transferFrom tokens to Moon Token contract', async () => {
    let err;
    const receipt = await moonTokenTwo.approve(
      accounts[1],
      100,
      {
        from: accounts[7]
      }
    );
    const { event, args } = receipt.logs[0];
    assert.equal(event, 'Approval');
    assert.equal(args.owner, accounts[7]);
    assert.equal(args.spender, accounts[1]);
    assert.equal(args.value.toString(), '100');
    try {
      await moonTokenTwo.transferFrom(
        accounts[7],
        moonTokenTwo.address,
        100,
        {
          from: accounts[1]
        }
      );
    } catch (error) {
      err = error;
    }
    assert.isOk(err instanceof Error);
  });
});
