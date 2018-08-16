const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:8545'));

const MoonToken = artifacts.require('MoonToken');
const MockMoonTimelock = artifacts.require('MockMoonTimelock');

contract('MoonTimelock', async accounts => {
  let moonToken;
  let moonTimelock;
  let moonTimelockNew;
  const totalAmount = 1e8 * 1e18;
  const SECONDS_IN_A_DAY = 60 * 60 * 24;

  before(async () => {
    moonToken = await MoonToken.deployed();
    // set beneficiary as accounts[1]
    moonTimelock = await MockMoonTimelock.new(
      moonToken.address,
      accounts[1]
    );
    // set beneficiary as accounts[1]
    moonTimelockNew = await MockMoonTimelock.new(
      moonToken.address,
      accounts[1]
    );

    await moonToken.addAddressesToWhitelist(
      [moonTimelock.address, moonTimelockNew.address]
    );
    let result
    result = await moonToken.whitelist(moonTimelock.address);
    assert.equal(result.toString(), 'true');
    result = await moonToken.whitelist(moonTimelockNew.address);
    assert.equal(result.toString(), 'true');
  });

  it('should be constructed correctly', async () => {
    await moonToken.transfer(moonTimelock.address, totalAmount);

    const tokenAddress = await moonTimelock.token();
    const beneficiary = await moonTimelock.beneficiary();
    const isActivated = await moonTimelock.isActivated();
    const releasedAmount = await moonTimelock.releasedAmount();
    const unreleasedAmount = await moonToken.balanceOf(moonTimelock.address);

    assert.equal(tokenAddress, moonToken.address);
    assert.equal(beneficiary, accounts[1]);
    assert.equal(isActivated.toString(), 'false');
    assert.equal(releasedAmount.toString(), '0');
    assert.equal(unreleasedAmount.toString(), totalAmount.toString());
  });

  it('should fail to activateNow by a non-owner', async () => {
    let err = null;

    try {
      await moonTimelock.activateNow(
        {
          from: accounts[1]
        }
      );
    } catch (error) {
      err = error;
    }
    assert.isOk(err instanceof Error);
  });
  
  it('should activateNow correctly', async () => {
    // call: changes will not be saved
    const result = await moonTimelock.activateNow.call(
      {
        from: accounts[0]
      }
    );
    assert.equal(result.toString(), 'true');

    let isActivated;
    isActivated = await moonTimelock.isActivated();
    assert.equal(isActivated.toString(), 'false');

    const receipt = await moonTimelock.activateNow(
      {
        from: accounts[0]
      }
    );
    const { event, args } = receipt.logs[0];
    const timeDifference = Math.abs(Date.now() / 1000 - args.startTime);
    isActivated = await moonTimelock.isActivated();
    const startTime = await moonTimelock.startTime();

    assert.equal(event, 'Activate');
    assert.isOk(timeDifference < 5);
    assert.equal(isActivated.toString(), 'true');
    assert.equal(startTime.toString(), args.startTime.toString());
  });

  it('should fail to activateNow when activated', async () => {
    let err = null;

    try {
      await moonTimelock.activateNow(
        {
          from: accounts[0]
        }
      );
    } catch (error) {
      err = error;
    }
    assert.isOk(err instanceof Error);
  });

  it('should fail to resetBeneficiary by a non-owner', async () => {
    let err = null;

    try {
      await moonTimelock.resetBeneficiary(
        '0x0',
        {
          from: accounts[1]
        }
      );
    } catch (error) {
      err = error;
    }
    const beneficiary = await moonTimelock.beneficiary();

    assert.isOk(err instanceof Error);
    assert.equal(beneficiary, accounts[1]);
  });

  it('should resetBeneficiary correctly', async () => {
    // call: changes will not be saved
    const result = await moonTimelock.resetBeneficiary.call(
      accounts[2],
      {
        from: accounts[0]
      }
    );
    assert.equal(result.toString(), 'true');

    let beneficiary;
    beneficiary = await moonTimelock.beneficiary();
    assert.equal(beneficiary, accounts[1]);

    const receipt = await moonTimelock.resetBeneficiary(
      accounts[2],
      {
        from: accounts[0]
      }
    );
    beneficiary = await moonTimelock.beneficiary();
    const { event, args } = receipt.logs[0];

    assert.equal(event, 'ResetBeneficiary');
    assert.equal(args.beneficiary, accounts[2]);
    assert.equal(beneficiary, accounts[2]);
  });

  it('should fail to release before the end of the 1st lockup stage even when activated', async () => {
    let beneficiaryBalance;
    const beneficiary = await moonTimelock.beneficiary();
    beneficiaryBalance = await moonToken.balanceOf(beneficiary);
    assert.equal(beneficiaryBalance.toString(), '0');

    const receipt = await moonTimelock.release();
    const { event } = receipt.logs[0];
    beneficiaryBalance = await moonToken.balanceOf(beneficiary);
    
    assert.equal(beneficiaryBalance.toString(), '0');
    assert.equal(event, 'ZeroReleasableAmount');
  });

  it('should release correctly after the end of the 1st lockup stage', async () => {
    await moonTimelock.timeTravel(91 * SECONDS_IN_A_DAY);

    let beneficiaryBalance;
    const beneficiary = await moonTimelock.beneficiary();
    beneficiaryBalance = await moonToken.balanceOf(beneficiary);
    assert.equal(beneficiary, accounts[2]);
    assert.equal(beneficiaryBalance.toString(), '0');

    // anyone can call release
    const receipt = await moonTimelock.release({
      from: accounts[5]
    });
    const { event, args } = receipt.logs[0];
    beneficiaryBalance = await moonToken.balanceOf(beneficiary);
    const expectedBalance = Math.floor(totalAmount / 3);
    const releasedAmount = await moonTimelock.releasedAmount();

    assert.equal(event, 'NewRelease');
    assert.equal(args.beneficiary, accounts[2]);
    // javascript has different computational precision from solidity, we can't compare directly.
    const difference = args.amount - expectedBalance;
    assert.equal(difference.toString(), '0');
    assert.equal(beneficiaryBalance.toString(), args.amount.toString());
    assert.equal(releasedAmount.toString(), args.amount.toString());
  });

  it('should fail to release twice after the end of the 1st lockup stage', async () => {
    const beneficiary = await moonTimelock.beneficiary();
    const beneficiaryBalanceOld = await moonToken.balanceOf(beneficiary);

    const receipt = await moonTimelock.release();
    const { event } = receipt.logs[0];
    const beneficiaryBalanceNew = await moonToken.balanceOf(beneficiary);

    assert.equal(beneficiaryBalanceOld.toString(), beneficiaryBalanceNew.toString());
    assert.equal(event, 'ZeroReleasableAmount');
  });

  it('should release all tokens correctly after the end of all lockup stages', async () => {
    await moonTimelock.timeTravel(180 * SECONDS_IN_A_DAY);

    const beneficiary = await moonTimelock.beneficiary();
    const beneficiaryBalanceOld = await moonToken.balanceOf(beneficiary);

    // anyone can call release
    const receipt = await moonTimelock.release({
      from: accounts[5]
    });
    const { event, args } = receipt.logs[0];
    const beneficiaryBalanceNew = await moonToken.balanceOf(beneficiary);
    const expectedNewRelease = totalAmount - beneficiaryBalanceOld;
    const releasedAmount = await moonTimelock.releasedAmount();
    const unreleasedAmount = await moonToken.balanceOf(moonTimelock.address);

    assert.equal(event, 'NewRelease');
    assert.equal(args.beneficiary, accounts[2]);
    // javascript has different computational precision from solidity, we can't compare directly.
    const difference = args.amount - expectedNewRelease;
    assert.equal(difference.toString(), '0');
    assert.equal(beneficiaryBalanceNew.toString(), totalAmount.toString());
    assert.equal(releasedAmount.toString(), totalAmount.toString());
    assert.equal(unreleasedAmount.toString(), '0');
  });

  it('should fail to release anymore tokens after the total release', async () => {
    const beneficiary = await moonTimelock.beneficiary();
    const beneficiaryBalanceOld = await moonToken.balanceOf(beneficiary);

    const receipt = await moonTimelock.release();
    const { event } = receipt.logs[0];
    const beneficiaryBalanceNew = await moonToken.balanceOf(beneficiary);

    assert.equal(beneficiaryBalanceOld.toString(), beneficiaryBalanceNew.toString());
    assert.equal(event, 'ZeroReleasableAmount');
  });

  // using moonTimelockNew
  it('should fail to activateWithTime by a non-owner', async () => {
    let err = null;
    const inputStartTime = Math.floor(Date.now() / 1000) + 5 * 30 * SECONDS_IN_A_DAY;

    try {
      await moonTimelockNew.activateWithTime(
        inputStartTime,
        {
          from: accounts[1]
        }
      );
    } catch (error) {
      err = error;
    }
    assert.isOk(err instanceof Error);
  });

  it('should fail to release when not activated even after lockup stage(s)', async () => {
    let err = null;
    const startTime = await moonTimelockNew.startTime();
    // current startTime should be 0, and if startTime is 0, now must be after all lockups
    assert(startTime.toString(), '0');

    try {
      await moonTimelockNew.release();
    } catch (error) {
      err = error;
    }
    assert.isOk(err instanceof Error);
  });

  it('should activateWithTime correctly', async () => {
     const inputStartTime = Math.floor(Date.now() / 1000) + 5 * 30 * SECONDS_IN_A_DAY;
     // call: changes will not be saved
    const result = await moonTimelockNew.activateWithTime.call(
      inputStartTime,
      {
        from: accounts[0]
      }
    );
    assert.equal(result.toString(), 'true');

    let isActivated;
    isActivated = await moonTimelockNew.isActivated();
    assert.equal(isActivated.toString(), 'false');

    const receipt = await moonTimelockNew.activateWithTime(
      inputStartTime,
      {
        from: accounts[0]
      }
    );
    const { event, args } = receipt.logs[0];
    isActivated = await moonTimelockNew.isActivated();
    const startTime = await moonTimelockNew.startTime();

    assert.equal(event, 'Activate');
    assert.isOk(inputStartTime.toString(), args.startTime.toString());
    assert.equal(isActivated.toString(), 'true');
    assert.equal(startTime.toString(), inputStartTime.toString());
  });

  it('should fail to activateWithTime when activated', async () => {
    let err = null;
    const inputStartTime = Math.floor(Date.now() / 1000) + 5 * 30 * SECONDS_IN_A_DAY;

    try {
      await moonTimelockNew.activateWithTime(inputStartTime);
    } catch (error) {
      err = error;
    }
    assert.isOk(err instanceof Error);
  });

  it('should release correctly after the end of the 2nd lockup stage', async () => {
    await moonToken.transfer(moonTimelockNew.address, totalAmount);
    const unreleasedAmount = await moonToken.balanceOf(moonTimelockNew.address);
    assert.equal(totalAmount.toString(), unreleasedAmount.toString());

    await moonTimelockNew.timeTravel((11 * 30 + 1) * SECONDS_IN_A_DAY);

    let beneficiaryBalance;
    const beneficiary = await moonTimelockNew.beneficiary();
    beneficiaryBalance = await moonToken.balanceOf(beneficiary);
    assert.equal(beneficiary, accounts[1]);
    assert.equal(beneficiaryBalance.toString(), '0');

    // anyone can call release
    const receipt = await moonTimelockNew.release({
      from: accounts[1]
    });
    const { event, args } = receipt.logs[0];
    beneficiaryBalance = await moonToken.balanceOf(beneficiary);
    const expectedBalance = Math.floor(totalAmount * 2 / 3);
    const releasedAmount = await moonTimelockNew.releasedAmount();

    assert.equal(event, 'NewRelease');
    assert.equal(args.beneficiary, accounts[1]);
    // javascript has different computational precision from solidity, we can't compare directly.
    const difference = args.amount - expectedBalance;
    assert.equal(difference.toString(), '0');
    assert.equal(beneficiaryBalance.toString(), args.amount.toString());
    assert.equal(releasedAmount.toString(), args.amount.toString());
  });

  it('should release correctly after resetBeneficiary in the middle', async () => {
    let beneficiary;
    beneficiary = await moonTimelockNew.beneficiary();
    assert.equal(beneficiary, accounts[1]);

    let receipt;
    receipt = await moonTimelockNew.resetBeneficiary(
      accounts[3],
      {
        from: accounts[0]
      }
    );
    beneficiary = await moonTimelockNew.beneficiary();
    assert.equal(receipt.logs[0].event, 'ResetBeneficiary');
    assert.equal(receipt.logs[0].args.beneficiary, accounts[3]);
    assert.equal(beneficiary, accounts[3]);
    
    await moonTimelockNew.timeTravel(3 * 30 * SECONDS_IN_A_DAY);

    const beneficiaryBalanceOld = await moonToken.balanceOf(beneficiary);
    assert.equal(beneficiaryBalanceOld.toString(), '0');

    // anyone can call release
    receipt = await moonTimelockNew.release({
      from: accounts[6]
    });
    const { event, args } = receipt.logs[0];
    beneficiaryBalanceNew = await moonToken.balanceOf(beneficiary);
    const expectedBalance = Math.floor(totalAmount / 3);
    const releasedAmount = await moonTimelockNew.releasedAmount();

    assert.equal(event, 'NewRelease');
    assert.equal(args.beneficiary, accounts[3]);
    // javascript has different computational precision from solidity, we can't compare directly.
    const difference = args.amount - expectedBalance;
    assert.equal(difference.toString(), '0');
    assert.equal(beneficiaryBalanceNew.toString(), args.amount.toString());
    assert.equal(releasedAmount.toString(), totalAmount.toString());
  });
});
