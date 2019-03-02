const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:8545'));

const CelerToken = artifacts.require('CelerToken');

contract('CelerToken', async accounts => {
  let celerToken;
  let celerTokenTwo;

  before(async () => {
    celerToken = await CelerToken.new();
    celerTokenTwo = await CelerToken.new();
  });

  it('should be constructed correctly', async () => {
    const name = await celerToken.name();
    const symbol = await celerToken.symbol();
    const decimals = await celerToken.decimals();
    const totalSupply = await celerToken.totalSupply();
    const ownerBalance = await celerToken.balanceOf(accounts[0]);
    const transferOpened = await celerToken.transferOpened();
    const expectedTotalSupply = 1e28; // 10 billion tokens with 18 decimals
    
    assert.equal(name, 'CelerToken');
    assert.equal(symbol, 'CELR');
    assert.equal(decimals.toString(), '18');
    assert.equal(totalSupply.toString(), expectedTotalSupply.toString());
    assert.equal(ownerBalance.toString(), totalSupply.toString());
    assert.equal(transferOpened.toString(), 'false');
  });

  it('should transfer correctly in mathematics', async () => {
    await celerToken.openTransfer();
    const transferOpened = await celerToken.transferOpened();
    assert.equal(transferOpened.toString(), 'true');

    const amount = 1e26;

    const previousBalance = await celerToken.balanceOf(accounts[1]);
    assert.equal(previousBalance.toString(), '0');

    const result = await celerToken.transfer.call(accounts[1], amount);
    assert.equal(result.toString(), 'true');

    const receipt = await celerToken.transfer(accounts[1], amount);
    const currentBalance = await celerToken.balanceOf(accounts[1]);
    const ownerBalance = await celerToken.balanceOf(accounts[0]);
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
    const originalOwnerBalance = await celerToken.balanceOf(accounts[0]);

    const previousAllowance = await celerToken.allowance(accounts[0], accounts[2]);
    const previousBalance = await celerToken.balanceOf(accounts[3]);
    assert.equal(previousAllowance.toString(), '0');
    assert.equal(previousBalance.toString(), '0');

    receipt = await celerToken.approve(accounts[2], amount);
    event = receipt.logs[0].event;
    args = receipt.logs[0].args;
    const allowanceAfterApprove = await celerToken.allowance(accounts[0], accounts[2]);
    const balanceOfSpender = await celerToken.balanceOf(accounts[2]);
    ownerBalance = await celerToken.balanceOf(accounts[0]);
    assert.equal(event, 'Approval');
    assert.equal(args.owner, accounts[0]);
    assert.equal(args.spender, accounts[2]);
    assert.equal(args.value.toString(), amount.toString());
    assert.equal(allowanceAfterApprove.toString(), amount.toString());
    assert.equal(balanceOfSpender.toString(), '0');
    assert.equal(ownerBalance.toString(), originalOwnerBalance.toString());

    receipt = await celerToken.transferFrom(
      accounts[0],
      accounts[3],
      amount,
      {
        from: accounts[2]
      }
    );
    event = receipt.logs[0].event;
    args = receipt.logs[0].args;
    ownerBalance = await celerToken.balanceOf(accounts[0]);
    const expectedOwnerBalance = 9.7e27;
    const currentAllowance = await celerToken.allowance(accounts[0], accounts[2]);
    const currentBalance = await celerToken.balanceOf(accounts[3]);

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
    await celerToken.approve(accounts[4], amount);
    let err = null;
    try {
      await celerToken.transferFrom(
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

    await celerToken.approve(accounts[4], 2e26);
    allowance = await celerToken.allowance(accounts[0], accounts[4]);
    assert.equal(allowance.toString(), (2e26).toString());

    receipt = await celerToken.increaseApproval(accounts[4], 1e26);
    event = receipt.logs[0].event;
    args = receipt.logs[0].args;
    allowance = await celerToken.allowance(accounts[0], accounts[4]);
    assert.equal(event, 'Approval');
    assert.equal(args.owner, accounts[0]);
    assert.equal(args.spender, accounts[4]);
    assert.equal(args.value.toString(), (3e26).toString());
    assert.equal(allowance.toString(), (3e26).toString());

    receipt = await celerToken.decreaseApproval(accounts[4], 2e26);
    event = receipt.logs[0].event;
    args = receipt.logs[0].args;
    allowance = await celerToken.allowance(accounts[0], accounts[4]);
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
      await celerToken.pause(
        {
          from: accounts[1]
        }
      );
    } catch (error) {
      err = error;
    }
    assert.isOk(err instanceof Error);

    // unpause()
    await celerToken.pause();
    try {
      await celerToken.unpause(
        {
          from: accounts[2]
        }
      );
    } catch (error) {
      err = error;
    }
    assert.isOk(err instanceof Error);
    await celerToken.unpause();
    const paused = await celerToken.paused();
    assert.equal(paused.toString(), 'false');

    // addAddressToWhitelist()
    try {
      await celerToken.addAddressToWhitelist(
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
      await celerToken.addAddressesToWhitelist(
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
      await celerToken.removeAddressFromWhitelist(
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
      await celerToken.removeAddressesFromWhitelist(
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
      await celerToken.renounceOwnership(
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
      await celerToken.transferOwnership(
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
    receipt = await celerToken.transferOwnership(
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
      await celerToken.transferOwnership(
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
    receipt = await celerToken.transferOwnership(
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

    const balance = await celerToken.balanceOf(accounts[1]);
    assert.equal(balance.toString(), (1e26).toString());
    
    receipt = await celerToken.approve(
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

    receipt = await celerToken.pause(
      {
        from: accounts[0]
      }
    );
    event = receipt.logs[0].event;
    assert.equal(event, 'Pause');

    // should fail to transfer
    try {
      await celerToken.transfer(
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
      await celerToken.transferFrom(
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
      await celerToken.approve(
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
      await celerToken.increaseApproval(
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
      await celerToken.decreaseApproval(
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
      await celerToken.unpause(
        {
          from: accounts[1]
        }
      );
    } catch (error) {
      err = error;
    }
    assert.isOk(err instanceof Error);

    const receipt = await celerToken.unpause(
      {
        from: accounts[0]
      }
    );
    const { event } = receipt.logs[0];
    assert.equal(event, 'Unpause');

    let result;
    result = await celerToken.transfer.call(
      accounts[2],
      100,
      {
        from: accounts[1]
      }
    );
    assert.equal(result.toString(), 'true');
    result = await celerToken.transferFrom.call(
      accounts[1],
      accounts[3],
      100,
      {
        from: accounts[2]
      }
    );
    assert.equal(result.toString(), 'true');
    result = await celerToken.approve.call(
      accounts[2],
      300,
      {
        from: accounts[1]
      }
    );
    assert.equal(result.toString(), 'true');
    result = await celerToken.increaseApproval.call(
      accounts[2],
      300,
      {
        from: accounts[1]
      }
    );
    assert.equal(result.toString(), 'true');
    result = await celerToken.decreaseApproval.call(
      accounts[2],
      50,
      {
        from: accounts[1]
      }
    );
    assert.equal(result.toString(), 'true');
  });

  /**
   * Approximate records for celerTokenTwo:
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
    // pause first celerToken to prevent any further use of this instance by mistake
    await celerToken.pause();

    const amount = 1e26;

    const previousBalance = await celerTokenTwo.balanceOf(accounts[1]);
    assert.equal(previousBalance.toString(), '0');

    const result = await celerTokenTwo.transfer.call(accounts[1], amount);
    assert.equal(result.toString(), 'true');

    const receipt = await celerTokenTwo.transfer(accounts[1], amount);
    const currentBalance = await celerTokenTwo.balanceOf(accounts[1]);
    const ownerBalance = await celerTokenTwo.balanceOf(accounts[0]);
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
    const originalOwnerBalance = await celerTokenTwo.balanceOf(accounts[1]);

    const previousAllowance = await celerTokenTwo.allowance(accounts[1], accounts[0]);
    const previousBalance = await celerTokenTwo.balanceOf(accounts[2]);
    assert.equal(previousAllowance.toString(), '0');
    assert.equal(previousBalance.toString(), '0');

    receipt = await celerTokenTwo.approve(
      accounts[0], 
      amount,
      {
        from: accounts[1]
      }
    );
    event = receipt.logs[0].event;
    args = receipt.logs[0].args;
    const allowanceAfterApprove = await celerTokenTwo.allowance(accounts[1], accounts[0]);
    ownerBalance = await celerTokenTwo.balanceOf(accounts[1]);
    assert.equal(event, 'Approval');
    assert.equal(args.owner, accounts[1]);
    assert.equal(args.spender, accounts[0]);
    assert.equal(args.value.toString(), amount.toString());
    assert.equal(allowanceAfterApprove.toString(), amount.toString());
    assert.equal(ownerBalance.toString(), originalOwnerBalance.toString());

    receipt = await celerTokenTwo.transferFrom(
      accounts[1],
      accounts[2],
      amount,
      {
        from: accounts[0]
      }
    );
    event = receipt.logs[0].event;
    args = receipt.logs[0].args;
    ownerBalance = await celerTokenTwo.balanceOf(accounts[1]);
    const currentAllowance = await celerTokenTwo.allowance(accounts[1], accounts[0]);
    const currentBalance = await celerTokenTwo.balanceOf(accounts[2]);

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
      await celerTokenTwo.transfer(
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
    const receipt = await celerTokenTwo.approve(
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
      await celerTokenTwo.transferFrom(
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
    receipt = await celerTokenTwo.addAddressToWhitelist(accounts[1]);
    event = receipt.logs[0].event;
    args = receipt.logs[0].args;
    assert.equal(event, 'WhitelistAdded');
    assert.equal(args.operator, accounts[1]);

    receipt = await celerTokenTwo.transfer(
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
    receipt = await celerTokenTwo.addAddressesToWhitelist(addresses);
    for (i = 0; i < addresses.length; ++i) {
      event = receipt.logs[i].event;
      args = receipt.logs[i].args;
      assert.equal(event, 'WhitelistAdded');
      assert.equal(args.operator, accounts[i+2]);
    }

    receipt = await celerTokenTwo.transfer(
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
    receipt = await celerTokenTwo.approve(accounts[1], 3e25);
    event = receipt.logs[0].event;
    args = receipt.logs[0].args;
    allowance = await celerTokenTwo.allowance(accounts[0], accounts[1]);
    assert.equal(event, 'Approval');
    assert.equal(args.owner, accounts[0]);
    assert.equal(args.spender, accounts[1]);
    assert.equal(args.value.toString(), (3e25).toString());
    assert.equal(allowance.toString(), (3e25).toString());

    receipt = await celerTokenTwo.transferFrom(
      accounts[0],
      accounts[5],
      3e25,
      {
        from: accounts[1]
      }
    );
    event = receipt.logs[0].event;
    args = receipt.logs[0].args;
    balance = await celerTokenTwo.balanceOf(accounts[5]);
    assert.equal(event, 'Transfer');
    assert.equal(args.from, accounts[0]);
    assert.equal(args.to, accounts[5]);
    assert.equal(args.value.toString(), (3e25).toString());
    assert.equal(balance.toString(), (3e25).toString());

    // addresses
    receipt = await celerTokenTwo.approve(accounts[3], 3e25);
    event = receipt.logs[0].event;
    args = receipt.logs[0].args;
    allowance = await celerTokenTwo.allowance(accounts[0], accounts[3]);
    assert.equal(event, 'Approval');
    assert.equal(args.owner, accounts[0]);
    assert.equal(args.spender, accounts[3]);
    assert.equal(args.value.toString(), (3e25).toString());
    assert.equal(allowance.toString(), (3e25).toString());

    receipt = await celerTokenTwo.transferFrom(
      accounts[0],
      accounts[6],
      3e25,
      {
        from: accounts[3]
      }
    );
    event = receipt.logs[0].event;
    args = receipt.logs[0].args;
    balance = await celerTokenTwo.balanceOf(accounts[6]);
    assert.equal(event, 'Transfer');
    assert.equal(args.from, accounts[0]);
    assert.equal(args.to, accounts[6]);
    assert.equal(args.value.toString(), (3e25).toString());
    assert.equal(balance.toString(), (3e25).toString());
  });

  it('should fail to transfer for non-whitelisted and non-owner users when transfer not opened', async () => {
    let err;
    try {
      await celerTokenTwo.transfer(
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
    const receipt = await celerTokenTwo.approve(
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
      await celerTokenTwo.transferFrom(
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
    receipt = await celerTokenTwo.removeAddressFromWhitelist(accounts[1]);
    event = receipt.logs[0].event;
    args = receipt.logs[0].args;
    assert.equal(event, 'WhitelistRemoved');
    assert.equal(args.operator, accounts[1]);

    try {
      await celerTokenTwo.transfer(
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
    receipt = await celerTokenTwo.removeAddressesFromWhitelist(addresses);
    for (i = 0; i < addresses.length; ++i) {
      event = receipt.logs[i].event;
      args = receipt.logs[i].args;
      assert.equal(event, 'WhitelistRemoved');
      assert.equal(args.operator, accounts[i+2]);
    }
    
    try {
      await celerTokenTwo.transfer(
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
    receipt = await celerTokenTwo.approve(
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
      await celerTokenTwo.transferFrom(
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
    receipt = await celerTokenTwo.approve(
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
      await celerTokenTwo.transferFrom(
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
    await celerTokenTwo.openTransfer();
    const transferOpened = await celerTokenTwo.transferOpened();
    assert.equal(transferOpened.toString(), 'true');

    receipt = await celerTokenTwo.transfer(
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

    receipt = await celerTokenTwo.approve(accounts[9], 3e25);
    event = receipt.logs[0].event;
    args = receipt.logs[0].args;
    const allowance = await celerTokenTwo.allowance(accounts[0], accounts[9]);
    assert.equal(event, 'Approval');
    assert.equal(args.owner, accounts[0]);
    assert.equal(args.spender, accounts[9]);
    assert.equal(args.value.toString(), (3e25).toString());
    assert.equal(allowance.toString(), (3e25).toString());

    receipt = await celerTokenTwo.transferFrom(
      accounts[0],
      accounts[7],
      3e25,
      {
        from: accounts[9]
      }
    );
    event = receipt.logs[0].event;
    args = receipt.logs[0].args;
    const balance = await celerTokenTwo.balanceOf(accounts[7]);
    assert.equal(event, 'Transfer');
    assert.equal(args.from, accounts[0]);
    assert.equal(args.to, accounts[7]);
    assert.equal(args.value.toString(), (3e25).toString());
    assert.equal(balance.toString(), (3e25).toString());
  });

  it('should fail to transfer tokens to Celer Token contract', async () => {
    let err;
    try {
      await celerTokenTwo.transfer(
        celerTokenTwo.address,
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

  it('should fail to transferFrom tokens to Celer Token contract', async () => {
    let err;
    const receipt = await celerTokenTwo.approve(
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
      await celerTokenTwo.transferFrom(
        accounts[7],
        celerTokenTwo.address,
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

  it('should transfer correctly when value = 0', async () => {
    const balanceBefore = await celerTokenTwo.balanceOf(accounts[0]);
    const receipt = await celerTokenTwo.transfer(
      accounts[0],
      0,
      {
        from: accounts[4]
      }
    );
    const { event, args } = receipt.logs[0];
    const balanceAfter = await celerTokenTwo.balanceOf(accounts[0]);
    assert.equal(event, 'Transfer');
    assert.equal(args.from, accounts[4]);
    assert.equal(args.to, accounts[0]);
    assert.equal(args.value.toString(), 0);
    assert.equal(balanceBefore.toString(), balanceAfter.toString());
  });

  it('should transferFrom correctly when value = 0', async () => {
    const balanceBefore = await celerTokenTwo.balanceOf(accounts[7]);
    const receipt = await celerTokenTwo.transferFrom(
      accounts[0],
      accounts[7],
      0,
      {
        from: accounts[9]
      }
    );
    const { event, args } = receipt.logs[0];
    const balanceAfter = await celerTokenTwo.balanceOf(accounts[7]);
    assert.equal(event, 'Transfer');
    assert.equal(args.from, accounts[0]);
    assert.equal(args.to, accounts[7]);
    assert.equal(args.value.toString(), 0);
    assert.equal(balanceBefore.toString(), balanceAfter.toString());
  });
});
