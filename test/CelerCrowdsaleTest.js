const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:8545'));
const getBalance = web3.eth.getBalance;
const toWei = web3.utils.toWei;

const CelerToken = artifacts.require('CelerToken');
const MockCelerCrowdsale = artifacts.require('MockCelerCrowdsale');

const SECONDS_IN_A_DAY = 60 * 60 * 24;

contract('CelerCrowdsale', async accounts => {
  let celerToken;
  let celerCrowdsale;
  const TOKEN_WALLET = accounts[0];
  const WALLET = accounts[9]; // the wallet receiving raised ETH
  const RATE = 100; // 1 ETH = 100 CELR
  const INITIAL_MAX_CAP = toWei('0.5', 'ether');
  const TOKEN_SALE_AMOUNT = 2e8 * 1e18; // 2e8 CELR tokens for crowdsale

  before(async () => {
    celerToken = await CelerToken.deployed();
    const timestamp = new Date().getTime() / 1000;
    const uintTimestamp = Math.round(timestamp);
    celerCrowdsale = await MockCelerCrowdsale.new(
      50, // 1 ETH = 50 CELR, will be modified in a early test case
      WALLET,
      celerToken.address,
      uintTimestamp + SECONDS_IN_A_DAY,
      uintTimestamp + SECONDS_IN_A_DAY * 3,
      toWei('0.1', 'ether'), // will be modified in a early test case
      TOKEN_WALLET
    );

    await celerToken.addAddressToWhitelist(celerCrowdsale.address);
    const result = await celerToken.whitelist(celerCrowdsale.address);
    assert.equal(result.toString(), 'true');
  });

  // -----------------------------------------
  // now < openingTime
  // -----------------------------------------
  it('should add address/addresses to whitelist correctly before openingTime', async () => {
    let receipt;
    let event;
    let args;
    let result;

    // all addresses should not be whitelisted
    for (i = 0; i < 10; i++) {
      result = await celerCrowdsale.whitelist(accounts[i]);
      assert(result.toString(), 'false');
    }
    
    // addAddressToWhitelist()
    receipt = await celerCrowdsale.addAddressToWhitelist(accounts[1]);
    result = await celerCrowdsale.whitelist(accounts[1]);
    event = receipt.logs[0].event;
    args = receipt.logs[0].args;
    assert.equal(event, 'WhitelistAdded');
    assert.equal(args.operator, accounts[1]);
    assert.equal(result.toString(), 'true');

    // addAddressesToWhitelist()
    const addresses = [
      accounts[1], // should be fine even if accounts[1] has already been added
      accounts[2], 
      accounts[3], 
      accounts[4], 
      accounts[5], 
      accounts[6], 
      accounts[7], 
      accounts[8]
    ];
    receipt = await celerCrowdsale.addAddressesToWhitelist(addresses);
    for (i = 0; i < addresses.length; i++) {
      result = await celerCrowdsale.whitelist(accounts[i + 1]);
      assert.equal(result.toString(), 'true');

      event = receipt.logs[i].event;
      args = receipt.logs[i].args;
      assert.equal(event, 'WhitelistAdded');
      assert.equal(args.operator, accounts[i + 1]);
    }
  });

  it('should remove address/addresses from whitelist correctly before openingTime', async () => {
    let receipt;
    let event;
    let args;
    let result;

    // removeAddressFromWhitelist
    receipt = await celerCrowdsale.removeAddressFromWhitelist(accounts[8]);
    result = await celerCrowdsale.whitelist(accounts[8]);
    event = receipt.logs[0].event;
    args = receipt.logs[0].args;
    assert.equal(event, 'WhitelistRemoved')
    assert.equal(args.operator, accounts[8]);
    assert.equal(result.toString(), 'false');

    // removeAddressesFromWhitelist
    const addresses = [
      accounts[6],
      accounts[7],
      accounts[8] // should be fine even if accounts[8] has already been removed
    ];
    receipt = await celerCrowdsale.removeAddressesFromWhitelist(addresses);
    for (i = 0; i < 3; i++) {
      result = await celerCrowdsale.whitelist(accounts[i + 6]);
      assert.equal(result.toString(), 'false');

      event = receipt.logs[i].event;
      args = receipt.logs[i].args;
      assert.equal(event, 'WhitelistRemoved');
      assert.equal(args.operator, accounts[i + 6]);
    }
  });

  it('should fail to reset parameters if not owner', async () => {
    let err = null;
    
    // setRate()
    try {
      await celerCrowdsale.setRate(
        RATE,
        {
          from: accounts[1]
        }
      );
    } catch (error) {
      err = error;
    }
    assert.isOk(err instanceof Error);

    // setInitialMaxCap()
    try {
      await celerCrowdsale.setInitialMaxCap(
        INITIAL_MAX_CAP,
        {
          from: accounts[2]
        }
      );
    } catch (error) {
      err = error;
    }
    assert.isOk(err instanceof Error);
  });

  it('should reset parameters correctly before openingTime', async () => {
    await celerCrowdsale.setRate(RATE);
    await celerCrowdsale.setInitialMaxCap(INITIAL_MAX_CAP);
    const newRate = await celerCrowdsale.rate();
    const newInitialMaxCap = await celerCrowdsale.initialMaxCap();

    assert.equal(newRate.toString(), RATE.toString());
    assert.equal(newInitialMaxCap.toString(), INITIAL_MAX_CAP.toString());
  });

  it('should approve an allowance correctly', async () => {
    const receipt = await celerToken.approve(celerCrowdsale.address, TOKEN_SALE_AMOUNT);
    event = receipt.logs[0].event;
    args = receipt.logs[0].args;
    
    assert.equal(event, 'Approval');
    assert.equal(args.owner, accounts[0]);
    assert.equal(args.spender, celerCrowdsale.address);
    assert.equal(args.value.toString(), TOKEN_SALE_AMOUNT.toString());
  });

  it('should fail to buy tokens before openingTime', async () => {
    let err = null;

    // direct transfer
    try {
      await celerCrowdsale.sendTransaction({
        value: toWei('0.2', 'ether'),
        from: accounts[1],
        gasPrice: toWei('40', 'gwei')
      });
    } catch (error) {
      err = error;
    }
    assert.isOk(err instanceof Error);

    // buyTokens()
    try {
      await celerCrowdsale.buyTokens(
        accounts[1],
        {
          value: toWei('0.2', 'ether'),
          from: accounts[1],
          gasPrice: toWei('40', 'gwei')
        }
      );
    } catch (error) {
      err = error;
    }
    assert.isOk(err instanceof Error);
  });

  // -----------------------------------------
  // openingTime <= now <= closingTime
  // -----------------------------------------
  it('should add address/addresses to whitelist correctly during crowdsale', async () => {
    await celerCrowdsale.timeTravel(1.1 * SECONDS_IN_A_DAY);

    let receipt;
    let event;
    let args;
    let result;
    
    // addAddressToWhitelist()
    receipt = await celerCrowdsale.addAddressToWhitelist(accounts[6]);
    result = await celerCrowdsale.whitelist(accounts[6]);
    event = receipt.logs[0].event;
    args = receipt.logs[0].args;
    assert.equal(event, 'WhitelistAdded');
    assert.equal(args.operator, accounts[6]);
    assert.equal(result.toString(), 'true');

    // addAddressesToWhitelist()
    const addresses = [
      accounts[6], // should be fine even if accounts[6] has already been added
      accounts[7], 
      accounts[8]
    ];
    receipt = await celerCrowdsale.addAddressesToWhitelist(addresses);
    for (i = 0; i < addresses.length; i++) {
      result = await celerCrowdsale.whitelist(accounts[i + 6]);
      assert.equal(result.toString(), 'true');

      event = receipt.logs[i].event;
      args = receipt.logs[i].args;
      assert.equal(event, 'WhitelistAdded');
      assert.equal(args.operator, accounts[i + 6]);
    }
  });

  it('should remove address/addresses from whitelist correctly during crowdsale', async () => {
    let receipt;
    let event;
    let args;
    let result;

    // removeAddressFromWhitelist
    receipt = await celerCrowdsale.removeAddressFromWhitelist(accounts[8]);
    result = await celerCrowdsale.whitelist(accounts[8]);
    event = receipt.logs[0].event;
    args = receipt.logs[0].args;
    assert.equal(event, 'WhitelistRemoved')
    assert.equal(args.operator, accounts[8]);
    assert.equal(result.toString(), 'false');

    // removeAddressesFromWhitelist
    const addresses = [
      accounts[6],
      accounts[7],
      accounts[8] // should be fine even if accounts[8] has already been removed
    ];
    receipt = await celerCrowdsale.removeAddressesFromWhitelist(addresses);
    for (i = 0; i < 3; i++) {
      result = await celerCrowdsale.whitelist(accounts[i + 6]);
      assert.equal(result.toString(), 'false');

      event = receipt.logs[i].event;
      args = receipt.logs[i].args;
      assert.equal(event, 'WhitelistRemoved');
      assert.equal(args.operator, accounts[i + 6]);
    }
  });

  it('should fail to reset parameters during crowdsale', async () => {
    let err = null;
    
    // setRate()
    try {
      await celerCrowdsale.setRate(RATE);
    } catch (error) {
      err = error;
    }
    assert.isOk(err instanceof Error);

    // setInitialMaxCap()
    try {
      await celerCrowdsale.setInitialMaxCap(INITIAL_MAX_CAP);
    } catch (error) {
      err = error;
    }
    assert.isOk(err instanceof Error);
  });

  ////////// Start of normal crowdsale process //////////
  /**
   * mock purchase timeline of each whitelisted account in 4 stages
   * accounts[1]: 0.5 + 0.5 + 0 + 3
   * accounts[2]: 0.5 + 0 + 0 + 1
   * accounts[3]: 0 + 1 + 0 + 0
   * accounts[4]: 0 + 0 + 0 + 4
   * accounts[5]: 0 + 0 + 0 + 1
   */

  // stage 1
  it('should call get functions correctly in stage 1', async () => {
    const stageIndex = await celerCrowdsale.getCurrentStageIndex();
    const maxCap = await celerCrowdsale.getCurrentMaxCap();

    assert.equal(stageIndex.toString(), '1');
    assert.equal(maxCap.toString(), toWei('0.5', 'ether').toString());

    let contribution;
    for (i = 0; i < 10; i++) {
      contribution = await celerCrowdsale.getUserContribution(accounts[i]);
      assert.equal(contribution.toString(), '0');
    }
  });

  it('should fail to buy tokens when exceeding max cap in stage 1', async () => {
    let err = null;

    // direct transfer
    try {
      await celerCrowdsale.sendTransaction({
        value: toWei('0.6', 'ether'),
        from: accounts[1],
        gasPrice: toWei('40', 'gwei')
      });
    } catch (error) {
      err = error;
    }
    assert.isOk(err instanceof Error);

    // buyTokens()
    try {
      await celerCrowdsale.buyTokens(
        accounts[1],
        {
          value: toWei('0.6', 'ether'),
          from: accounts[1],
          gasPrice: toWei('40', 'gwei')
        }
      );
    } catch (error) {
      err = error;
    }
    assert.isOk(err instanceof Error);
  });

  it('should buy tokens correctly with either direct transfer or buyTokens()', async () => {
    let receipt;
    let event;
    let args;
    let balanceReceived;
    let tokenReceived;
    let contribution;
    let currentWalletBalance;
    let currentTokenAmount;
    const originalWalletBalance = await getBalance(WALLET);
    const originalTokenAmount = await celerToken.balanceOf(accounts[1]);
    
    // direct transfer
    receipt = await celerCrowdsale.sendTransaction({
      value: toWei('0.2', 'ether'),
      from: accounts[1],
      gasPrice: toWei('50', 'gwei')
    });
    event = receipt.logs[0].event;
    args = receipt.logs[0].args;
    currentWalletBalance = await getBalance(WALLET);
    balanceReceived = currentWalletBalance - originalWalletBalance;
    currentTokenAmount = await celerToken.balanceOf(accounts[1]);
    tokenReceived = currentTokenAmount - originalTokenAmount;
    contribution = await celerCrowdsale.getUserContribution(accounts[1]);
    assert.equal(event, 'TokenPurchase');
    assert.equal(args.purchaser, accounts[1]);
    assert.equal(args.beneficiary, accounts[1]);
    assert.equal(args.value.toString(), toWei('0.2', 'ether').toString());
    assert.equal(args.amount.toString(), (toWei('0.2', 'ether') * RATE).toString());
    assert.equal(balanceReceived.toString(), toWei('0.2', 'ether').toString());
    assert.equal(tokenReceived.toString(), (toWei('0.2', 'ether') * RATE).toString());
    assert.equal(contribution.toString(), toWei('0.2', 'ether').toString());

    // buyTokens() for self
    receipt = await celerCrowdsale.buyTokens(
      accounts[1],
      {
        value: toWei('0.2', 'ether'),
        from: accounts[1],
        gasPrice: toWei('50', 'gwei')
      }
    );
    event = receipt.logs[0].event;
    args = receipt.logs[0].args;
    currentWalletBalance = await getBalance(WALLET);
    balanceReceived = currentWalletBalance - originalWalletBalance;
    currentTokenAmount = await celerToken.balanceOf(accounts[1]);
    tokenReceived = currentTokenAmount - originalTokenAmount;
    contribution = await celerCrowdsale.getUserContribution(accounts[1]);
    assert.equal(event, 'TokenPurchase');
    assert.equal(args.purchaser, accounts[1]);
    assert.equal(args.beneficiary, accounts[1]);
    assert.equal(args.value.toString(), toWei('0.2', 'ether').toString());
    assert.equal(args.amount.toString(), (toWei('0.2', 'ether') * RATE).toString());
    assert.equal(balanceReceived.toString(), toWei('0.4', 'ether').toString());
    assert.equal(tokenReceived.toString(), (toWei('0.4', 'ether') * RATE).toString());
    assert.equal(contribution.toString(), toWei('0.4', 'ether').toString());


    // buyTokens() for others
    receipt = await celerCrowdsale.buyTokens(
      accounts[1],
      {
        value: toWei('0.1', 'ether'),
        from: accounts[8],
        gasPrice: toWei('50', 'gwei')
      }
    );
    event = receipt.logs[0].event;
    args = receipt.logs[0].args;
    currentWalletBalance = await getBalance(WALLET);
    balanceReceived = currentWalletBalance - originalWalletBalance;
    currentTokenAmount = await celerToken.balanceOf(accounts[1]);
    tokenReceived = currentTokenAmount - originalTokenAmount;
    contribution = await celerCrowdsale.getUserContribution(accounts[1]);
    assert.equal(event, 'TokenPurchase');
    assert.equal(args.purchaser, accounts[8]);
    assert.equal(args.beneficiary, accounts[1]);
    assert.equal(args.value.toString(), toWei('0.1', 'ether').toString());
    assert.equal(args.amount.toString(), (toWei('0.1', 'ether') * RATE).toString());
    assert.equal(balanceReceived.toString(), toWei('0.5', 'ether').toString());
    assert.equal(tokenReceived.toString(), (toWei('0.5', 'ether') * RATE).toString());
    assert.equal(contribution.toString(), toWei('0.5', 'ether').toString());
  });

  it('should buy tokens at one time of the max cap correctly in the initial stage', async () => {
    const originalWalletBalance = await getBalance(WALLET);
    const originalTokenAmount = await celerToken.balanceOf(accounts[2]);
    
    const receipt = await celerCrowdsale.sendTransaction({
      value: toWei('0.5', 'ether'),
      from: accounts[2],
      gasPrice: toWei('50', 'gwei')
    });
    const { event, args } = receipt.logs[0];
    const currentWalletBalance = await getBalance(WALLET);
    const balanceReceived = currentWalletBalance - originalWalletBalance;
    const currentTokenAmount = await celerToken.balanceOf(accounts[2]);
    const tokenReceived = currentTokenAmount - originalTokenAmount;
    const contribution = await celerCrowdsale.getUserContribution(accounts[2]);
    assert.equal(event, 'TokenPurchase');
    assert.equal(args.purchaser, accounts[2]);
    assert.equal(args.beneficiary, accounts[2]);
    assert.equal(args.value.toString(), toWei('0.5', 'ether').toString());
    assert.equal(args.amount.toString(), (toWei('0.5', 'ether') * RATE).toString());
    assert.equal(balanceReceived.toString(), toWei('0.5', 'ether').toString());
    assert.equal(tokenReceived.toString(), (toWei('0.5', 'ether') * RATE).toString());
    assert.equal(contribution.toString(), toWei('0.5', 'ether').toString());
  });

  // stage 2
  it('should call get functions correctly in stage 2', async () => {
    await celerCrowdsale.timeTravel(SECONDS_IN_A_DAY * 0.5);

    const stageIndex = await celerCrowdsale.getCurrentStageIndex();
    const maxCap = await celerCrowdsale.getCurrentMaxCap();

    assert.equal(stageIndex.toString(), '2');
    assert.equal(maxCap.toString(), toWei('1', 'ether').toString());
  });

  it('should fail to buy tokens when exceeding max cap in stage 2', async () => {
    let err = null;

    // direct transfer
    try {
      await celerCrowdsale.sendTransaction({
        value: toWei('0.6', 'ether'),
        from: accounts[1],
        gasPrice: toWei('40', 'gwei')
      });
    } catch (error) {
      err = error;
    }
    assert.isOk(err instanceof Error);

    // buyTokens()
    try {
      await celerCrowdsale.buyTokens(
        accounts[3],
        {
          value: toWei('1.1', 'ether'),
          from: accounts[3],
          gasPrice: toWei('40', 'gwei')
        }
      );
    } catch (error) {
      err = error;
    }
    assert.isOk(err instanceof Error);
  });

  it('should buy tokens with correct cap if bought in the first stage', async () => {
    const originalWalletBalance = await getBalance(WALLET);
    const originalTokenAmount = await celerToken.balanceOf(accounts[1]);
    
    const receipt = await celerCrowdsale.sendTransaction({
      value: toWei('0.5', 'ether'),
      from: accounts[1],
      gasPrice: toWei('50', 'gwei')
    });
    const { event, args } = receipt.logs[0];
    const currentWalletBalance = await getBalance(WALLET);
    const balanceReceived = currentWalletBalance - originalWalletBalance;
    const currentTokenAmount = await celerToken.balanceOf(accounts[1]);
    const tokenReceived = currentTokenAmount - originalTokenAmount;
    const contribution = await celerCrowdsale.getUserContribution(accounts[1]);
    assert.equal(event, 'TokenPurchase');
    assert.equal(args.purchaser, accounts[1]);
    assert.equal(args.beneficiary, accounts[1]);
    assert.equal(args.value.toString(), toWei('0.5', 'ether').toString());
    assert.equal(args.amount.toString(), (toWei('0.5', 'ether') * RATE).toString());
    assert.equal(balanceReceived.toString(), toWei('0.5', 'ether').toString());
    assert.equal(tokenReceived.toString(), (toWei('0.5', 'ether') * RATE).toString());
    assert.equal(contribution.toString(), toWei('1', 'ether').toString());
  });

  it('should buy tokens with correct cap if didn\'t buy in the first stage', async () => {
    const originalWalletBalance = await getBalance(WALLET);
    const originalTokenAmount = await celerToken.balanceOf(accounts[3]);
    
    const receipt = await celerCrowdsale.sendTransaction({
      value: toWei('1', 'ether'),
      from: accounts[3],
      gasPrice: toWei('50', 'gwei')
    });
    const { event, args } = receipt.logs[0];
    const currentWalletBalance = await getBalance(WALLET);
    const balanceReceived = currentWalletBalance - originalWalletBalance;
    const currentTokenAmount = await celerToken.balanceOf(accounts[3]);
    const tokenReceived = currentTokenAmount - originalTokenAmount;
    const contribution = await celerCrowdsale.getUserContribution(accounts[3]);
    assert.equal(event, 'TokenPurchase');
    assert.equal(args.purchaser, accounts[3]);
    assert.equal(args.beneficiary, accounts[3]);
    assert.equal(args.value.toString(), toWei('1', 'ether').toString());
    assert.equal(args.amount.toString(), (toWei('1', 'ether') * RATE).toString());
    assert.equal(balanceReceived.toString(), toWei('1', 'ether').toString());
    assert.equal(tokenReceived.toString(), (toWei('1', 'ether') * RATE).toString());
    assert.equal(contribution.toString(), toWei('1', 'ether').toString());
  });

  // stage 3 and stage 4
  it('should call get functions correctly in stage 3 and stage 4', async () => {
    let stageIndex;
    let maxCap;
    
    // stage 3
    await celerCrowdsale.timeTravel(SECONDS_IN_A_DAY * 0.5);

    stageIndex = await celerCrowdsale.getCurrentStageIndex();
    maxCap = await celerCrowdsale.getCurrentMaxCap();

    assert.equal(stageIndex.toString(), '3');
    assert.equal(maxCap.toString(), toWei('2', 'ether').toString());

    // stage 4
    await celerCrowdsale.timeTravel(SECONDS_IN_A_DAY * 0.5);

    stageIndex = await celerCrowdsale.getCurrentStageIndex();
    maxCap = await celerCrowdsale.getCurrentMaxCap();

    assert.equal(stageIndex.toString(), '4');
    assert.equal(maxCap.toString(), toWei('4', 'ether').toString());
  });

  it('should fail to buy tokens when exceeding max cap in the last stage', async () => {
    let err = null;

    // direct transfer
    try {
      await celerCrowdsale.sendTransaction({
        value: toWei('4.1', 'ether'),
        from: accounts[4],
        gasPrice: toWei('40', 'gwei')
      });
    } catch (error) {
      err = error;
    }
    assert.isOk(err instanceof Error);

    // buyTokens()
    try {
      await celerCrowdsale.buyTokens(
        accounts[2],
        {
          value: toWei('3.6', 'ether'),
          from: accounts[1],
          gasPrice: toWei('40', 'gwei')
        }
      );
    } catch (error) {
      err = error;
    }
    assert.isOk(err instanceof Error);
  });

  it('should buy tokens with correct cap if bought in previous stages', async () => {
    const originalWalletBalance = await getBalance(WALLET);
    const originalTokenAmount = await celerToken.balanceOf(accounts[1]);
    
    const receipt = await celerCrowdsale.sendTransaction({
      value: toWei('3', 'ether'),
      from: accounts[1],
      gasPrice: toWei('50', 'gwei')
    });
    const { event, args } = receipt.logs[0];
    const currentWalletBalance = await getBalance(WALLET);
    const balanceReceived = currentWalletBalance - originalWalletBalance;
    const currentTokenAmount = await celerToken.balanceOf(accounts[1]);
    const tokenReceived = currentTokenAmount - originalTokenAmount;
    const contribution = await celerCrowdsale.getUserContribution(accounts[1]);
    assert.equal(event, 'TokenPurchase');
    assert.equal(args.purchaser, accounts[1]);
    assert.equal(args.beneficiary, accounts[1]);
    assert.equal(args.value.toString(), toWei('3', 'ether').toString());
    assert.equal(args.amount.toString(), (toWei('3', 'ether') * RATE).toString());
    assert.equal(balanceReceived.toString(), toWei('3', 'ether').toString());
    assert.equal(tokenReceived.toString(), (toWei('3', 'ether') * RATE).toString());
    assert.equal(contribution.toString(), toWei('4', 'ether').toString());
  });

  it('should buy tokens with correct cap if didn\'t buy in previous stages', async () => {
    const originalWalletBalance = await getBalance(WALLET);
    const originalTokenAmount = await celerToken.balanceOf(accounts[4]);
    
    const receipt = await celerCrowdsale.sendTransaction({
      value: toWei('4', 'ether'),
      from: accounts[4],
      gasPrice: toWei('50', 'gwei')
    });
    const { event, args } = receipt.logs[0];
    const currentWalletBalance = await getBalance(WALLET);
    const balanceReceived = currentWalletBalance - originalWalletBalance;
    const currentTokenAmount = await celerToken.balanceOf(accounts[4]);
    const tokenReceived = currentTokenAmount - originalTokenAmount;
    const contribution = await celerCrowdsale.getUserContribution(accounts[4]);
    assert.equal(event, 'TokenPurchase');
    assert.equal(args.purchaser, accounts[4]);
    assert.equal(args.beneficiary, accounts[4]);
    assert.equal(args.value.toString(), toWei('4', 'ether').toString());
    assert.equal(args.amount.toString(), (toWei('4', 'ether') * RATE).toString());
    assert.equal(balanceReceived.toString(), toWei('4', 'ether').toString());
    assert.equal(tokenReceived.toString(), (toWei('4', 'ether') * RATE).toString());
    assert.equal(contribution.toString(), toWei('4', 'ether').toString());
  });
  ////////// End of normal crowdsale process //////////

  it('should fail to operate when paused during crowdsale', async () => {
    const receipt = await celerCrowdsale.pause(
      {
        from: accounts[0]
      }
    );
    const { event } = receipt.logs[0];
    assert.equal(event, 'Pause');

    let err;
    // direct transfer
    try {
      await celerCrowdsale.sendTransaction({
        value: toWei('1', 'ether'),
        from: accounts[5],
        gasPrice: toWei('50', 'gwei')
      });
    } catch (error) {
      err = error;
    }
    assert.isOk(err instanceof Error);

    // buyTokens()
    try {
      await celerCrowdsale.buyTokens(
        accounts[5],
        {
          value: toWei('1', 'ether'),
          from: accounts[5],
          gasPrice: toWei('50', 'gwei')
        }
      );
    } catch (error) {
      err = error;
    }
    assert.isOk(err instanceof Error);
  });

  it('should be able to operate when unpaused during crowdsale', async () => {
    let receipt;
    receipt = await celerCrowdsale.unpause(
      {
        from: accounts[0]
      }
    );
    assert.equal(receipt.logs[0].event, 'Unpause');

    const originalWalletBalance = await getBalance(WALLET);
    const originalTokenAmount = await celerToken.balanceOf(accounts[2]);
    
    receipt = await celerCrowdsale.sendTransaction({
      value: toWei('1', 'ether'),
      from: accounts[2],
      gasPrice: toWei('50', 'gwei')
    });
    const { event, args } = receipt.logs[0];
    const currentWalletBalance = await getBalance(WALLET);
    const balanceReceived = currentWalletBalance - originalWalletBalance;
    const currentTokenAmount = await celerToken.balanceOf(accounts[2]);
    const tokenReceived = currentTokenAmount - originalTokenAmount;
    const contribution = await celerCrowdsale.getUserContribution(accounts[2]);
    assert.equal(event, 'TokenPurchase');
    assert.equal(args.purchaser, accounts[2]);
    assert.equal(args.beneficiary, accounts[2]);
    assert.equal(args.value.toString(), toWei('1', 'ether').toString());
    assert.equal(args.amount.toString(), (toWei('1', 'ether') * RATE).toString());
    assert.equal(balanceReceived.toString(), toWei('1', 'ether').toString());
    assert.equal(tokenReceived.toString(), (toWei('1', 'ether') * RATE).toString());
    assert.equal(contribution.toString(), toWei('1.5', 'ether').toString());
  });

  it('should fail to buy tokens when below min cap', async () => {
    let err = null;

    // direct transfer
    try {
      await celerCrowdsale.sendTransaction({
        value: toWei('0.0009', 'ether'),
        from: accounts[5],
        gasPrice: toWei('50', 'gwei')
      });
    } catch (error) {
      err = error;
    }
    assert.isOk(err instanceof Error);

    // buyTokens()
    try {
      await celerCrowdsale.buyTokens(
        accounts[5],
        {
          value: toWei('0.0009', 'ether'),
          from: accounts[5],
          gasPrice: toWei('50', 'gwei')
        }
      );
    } catch (error) {
      err = error;
    }
    assert.isOk(err instanceof Error);
  });

  it('should fail to buy tokens when exceeding max gas price', async () => {
    let err = null;

    // direct transfer
    try {
      await celerCrowdsale.sendTransaction({
        value: toWei('1', 'ether'),
        from: accounts[2],
        gasPrice: toWei('51', 'gwei')
      });
    } catch (error) {
      err = error;
    }
    assert.isOk(err instanceof Error);

    // buyTokens()
    try {
      await celerCrowdsale.buyTokens(
        accounts[2],
        {
          value: toWei('1', 'ether'),
          from: accounts[2],
          gasPrice: toWei('51', 'gwei')
        }
      );
    } catch (error) {
      err = error;
    }
    assert.isOk(err instanceof Error);
  });

  it('should fail to buy tokens when not whitelisted', async () => {
    let err = null;

    // directly buy not whitelisted
    try {
      await celerCrowdsale.sendTransaction({
        value: toWei('1', 'ether'),
        from: accounts[6],
        gasPrice: toWei('50', 'gwei')
      });
    } catch (error) {
      err = error;
    }
    assert.isOk(err instanceof Error);

    // buyTokens for self not whitelisted
    try {
      await celerCrowdsale.buyTokens(
        accounts[6],
        {
          value: toWei('1', 'ether'),
          from: accounts[6],
          gasPrice: toWei('50', 'gwei')
        }
      );
    } catch (error) {
      err = error;
    }
    assert.isOk(err instanceof Error);

    // buyTokens for others who is not whitelisted
    try {
      await celerCrowdsale.buyTokens(
        accounts[6],
        {
          value: toWei('1', 'ether'),
          from: accounts[2],
          gasPrice: toWei('50', 'gwei')
        }
      );
    } catch (error) {
      err = error;
    }
    assert.isOk(err instanceof Error);
  });

  it('should fail to buy tokens when withdrawed allowance', async () => {
    const receipt = await celerToken.approve(celerCrowdsale.address, 0);
    event = receipt.logs[0].event;
    args = receipt.logs[0].args;
    assert.equal(event, 'Approval');
    assert.equal(args.owner, accounts[0]);
    assert.equal(args.spender, celerCrowdsale.address);
    assert.equal(args.value.toString(), 0);

    let err = null;
    try {
      await celerCrowdsale.sendTransaction({
        value: toWei('1', 'ether'),
        from: accounts[2],
        gasPrice: toWei('50', 'gwei')
      });
    } catch (error) {
      err = error;
    }
    assert.isOk(err instanceof Error);
  });

  it('should buy tokens correctly when re-approve some allowance', async () => {
    let receipt;
    let event;
    let args;
    
    // re-approve
    receipt = await celerToken.approve(celerCrowdsale.address, TOKEN_SALE_AMOUNT);
    event = receipt.logs[0].event;
    args = receipt.logs[0].args;
    
    assert.equal(event, 'Approval');
    assert.equal(args.owner, accounts[0]);
    assert.equal(args.spender, celerCrowdsale.address);
    assert.equal(args.value.toString(), TOKEN_SALE_AMOUNT.toString());

    const originalWalletBalance = await getBalance(WALLET);
    const originalTokenAmount = await celerToken.balanceOf(accounts[5]);
    
    receipt = await celerCrowdsale.sendTransaction({
      value: toWei('1', 'ether'),
      from: accounts[5],
      gasPrice: toWei('50', 'gwei')
    });
    event = receipt.logs[0].event;
    args = receipt.logs[0].args;
    const currentWalletBalance = await getBalance(WALLET);
    const balanceReceived = currentWalletBalance - originalWalletBalance;
    const currentTokenAmount = await celerToken.balanceOf(accounts[5]);
    const tokenReceived = currentTokenAmount - originalTokenAmount;
    const contribution = await celerCrowdsale.getUserContribution(accounts[5]);
    assert.equal(event, 'TokenPurchase');
    assert.equal(args.purchaser, accounts[5]);
    assert.equal(args.beneficiary, accounts[5]);
    assert.equal(args.value.toString(), toWei('1', 'ether').toString());
    assert.equal(args.amount.toString(), (toWei('1', 'ether') * RATE).toString());
    assert.equal(balanceReceived.toString(), toWei('1', 'ether').toString());
    assert.equal(tokenReceived.toString(), (toWei('1', 'ether') * RATE).toString());
    assert.equal(contribution.toString(), toWei('1', 'ether').toString());
  });

  it('should fail to do operations requiring ownership if not owner', async () => {
    // test all operations requiring ownership here,
    // except those not during the crowdsale: setRate and setInitialMaxCap
    let err;
    
    // pause()
    try {
      await celerCrowdsale.pause(
        {
          from: accounts[1],
          gasPrice: toWei('50', 'gwei')
        }
      );
    } catch (error) {
      err = error;
    }
    assert.isOk(err instanceof Error);

    // unpause()
    await celerCrowdsale.pause();
    try {
      await celerCrowdsale.unpause(
        {
          from: accounts[2],
          gasPrice: toWei('50', 'gwei')
        }
      );
    } catch (error) {
      err = error;
    }
    assert.isOk(err instanceof Error);
    await celerCrowdsale.unpause();
    const paused = await celerCrowdsale.paused();
    assert.equal(paused.toString(), 'false');

    // addAddressToWhitelist()
    try {
      await celerCrowdsale.addAddressToWhitelist(
        accounts[6],
        {
          from: accounts[3],
          gasPrice: toWei('50', 'gwei')
        }
      );
    } catch (error) {
      err = error;
    }
    assert.isOk(err instanceof Error);

    // addAddressesToWhitelist()
    try {
      await celerCrowdsale.addAddressesToWhitelist(
        [accounts[6], accounts[7]],
        {
          from: accounts[4],
          gasPrice: toWei('50', 'gwei')
        }
      );
    } catch (error) {
      err = error;
    }
    assert.isOk(err instanceof Error);

    // removeAddressFromWhitelist()
    try {
      await celerCrowdsale.removeAddressFromWhitelist(
        accounts[1],
        {
          from: accounts[5],
          gasPrice: toWei('50', 'gwei')
        }
      );
    } catch (error) {
      err = error;
    }
    assert.isOk(err instanceof Error);

    // removeAddressesFromWhitelist()
    try {
      await celerCrowdsale.removeAddressesFromWhitelist(
        [accounts[1], accounts[2]],
        {
          from: accounts[6],
          gasPrice: toWei('50', 'gwei')
        }
      );
    } catch (error) {
      err = error;
    }
    assert.isOk(err instanceof Error);

    // renounceOwnership()
    try {
      await celerCrowdsale.renounceOwnership(
        {
          from: accounts[7],
          gasPrice: toWei('50', 'gwei')
        }
      );
    } catch (error) {
      err = error;
    }
    assert.isOk(err instanceof Error);

    // transferOwnership()
    try {
      await celerCrowdsale.transferOwnership(
        accounts[1],
        {
          from: accounts[8],
          gasPrice: toWei('50', 'gwei')
        }
      );
    } catch (error) {
      err = error;
    }
    assert.isOk(err instanceof Error);
  });

  it('should transferOwnership correctly', async () => {
    const receipt = await celerCrowdsale.transferOwnership(
      accounts[1],
      {
        from: accounts[0]
      }
    );
    const { event, args } = receipt.logs[0];
    const currentOwner = await celerCrowdsale.owner();
    assert.equal(event, 'OwnershipTransferred');
    assert.equal(args.previousOwner, accounts[0]);
    assert.equal(args.newOwner, accounts[1]);
    assert.equal(currentOwner, accounts[1]);
  });

  // -----------------------------------------
  // closingTime < now
  // -----------------------------------------
  it('should fail to buy tokens after closingTime', async () => {
    await celerCrowdsale.timeTravel(SECONDS_IN_A_DAY * 0.5);

    let err;
    try {
      await celerCrowdsale.sendTransaction({
        value: toWei('1', 'ether'),
        from: accounts[5],
        gasPrice: toWei('50', 'gwei')
      });
    } catch (error) {
      err = error;
    }
    assert.isOk(err instanceof Error);
  });

  it('should fail to transfer for non-owner and non-whitelisted users when transfer not opened', async () => {
    let err;
    try {
      const receipt = await celerToken.transfer(
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

  it('should fail to transferFrom for non-owner and non-whitelisted users when transfer not opened', async () => {
    let err;
    const receipt = await celerToken.approve(
      accounts[2],
      100,
      {
        from: accounts[0]
      }
    );
    const { event, args } = receipt.logs[0];
    assert.equal(event, 'Approval');
    assert.equal(args.owner, accounts[0]);
    assert.equal(args.spender, accounts[2]);
    assert.equal(args.value.toString(), '100');
    try {
      await celerToken.transferFrom(
        accounts[0],
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
  });
});
