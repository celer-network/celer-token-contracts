const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:8545'));

const CelerToken = artifacts.require('CelerToken');

contract('CelerToken', async accounts => {
  let celerToken;

  before(async () => {
    celerToken = await CelerToken.new();
  });

  it('should be constructed correctly', async () => {
    const name = await celerToken.name();
    const symbol = await celerToken.symbol();
    const decimals = await celerToken.decimals();
    const totalSupply = await celerToken.totalSupply();
    const ownerBalance = await celerToken.balanceOf(accounts[0]);

    const expectedTotalSupply = 1e28; // 10 billion tokens with 18 decimals
    assert.equal(name, 'CelerToken');
    assert.equal(symbol, 'CELR');
    assert.equal(decimals.toString(), '18');
    assert.equal(totalSupply.toString(), expectedTotalSupply.toString());
    assert.equal(ownerBalance.toString(), totalSupply.toString());
  });

  it('should transfer correctly', async () => {
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

  it('should transferFrom correctly', async () => {
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
});
