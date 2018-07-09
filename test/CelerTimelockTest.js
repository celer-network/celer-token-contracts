const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:8545'));

const CelerToken = artifacts.require('CelerToken');
const MockCelerTimelock = artifacts.require('MockCelerTimelock');

contract('CelerTimelock', async accounts => {
  let celerToken;
  let celerTimelock;
  let celerTimelockNew;
  const totalAmount = 1e8 * 1e18;
  const SECONDS_IN_A_DAY = 60 * 60 * 24;

  before(async () => {
    celerToken = await CelerToken.deployed();
    // set beneficiary as accounts[1]
    celerTimelock = await MockCelerTimelock.new(
      celerToken.address,
      accounts[1]
    );
    // set beneficiary as accounts[1]
    celerTimelockNew = await MockCelerTimelock.new(
      celerToken.address,
      accounts[1]
    );
  });

  it('should be constructed correctly', async () => {
    await celerToken.transfer(celerTimelock.address, totalAmount);

    const tokenAddress = await celerTimelock.token();
    const beneficiary = await celerTimelock.beneficiary();
    const isActivated = await celerTimelock.isActivated();
    const releasedAmount = await celerTimelock.releasedAmount();
    const unreleasedAmount = await celerToken.balanceOf(celerTimelock.address);

    assert.equal(tokenAddress, celerToken.address);
    assert.equal(beneficiary, accounts[1]);
    assert.equal(isActivated.toString(), 'false');
    assert.equal(releasedAmount.toString(), '0');
    assert.equal(unreleasedAmount.toString(), totalAmount.toString());
  });

  it('should fail to activateNow by a non-owner', async () => {
    let err = null;

    try {
      await celerTimelock.activateNow(
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
    const result = await celerTimelock.activateNow.call(
      {
        from: accounts[0]
      }
    );
    assert.equal(result.toString(), 'true');

    let isActivated;
    isActivated = await celerTimelock.isActivated();
    assert.equal(isActivated.toString(), 'false');

    const receipt = await celerTimelock.activateNow(
      {
        from: accounts[0]
      }
    );
    const { event, args } = receipt.logs[0];
    const timeDifference = Math.abs(Date.now() / 1000 - args.startTime);
    isActivated = await celerTimelock.isActivated();
    const startTime = await celerTimelock.startTime();

    assert.equal(event, 'Activate');
    assert.isOk(timeDifference < 5);
    assert.equal(isActivated.toString(), 'true');
    assert.equal(startTime.toString(), args.startTime.toString());
  });

  it('should fail to activateNow when activated', async () => {
    let err = null;

    try {
      await celerTimelock.activateNow(
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
      await celerTimelock.resetBeneficiary(
        '0x0',
        {
          from: accounts[1]
        }
      );
    } catch (error) {
      err = error;
    }
    const beneficiary = await celerTimelock.beneficiary();

    assert.isOk(err instanceof Error);
    assert.equal(beneficiary, accounts[1]);
  });

  it('should resetBeneficiary correctly', async () => {
    // call: changes will not be saved
    const result = await celerTimelock.resetBeneficiary.call(
      accounts[2],
      {
        from: accounts[0]
      }
    );
    assert.equal(result.toString(), 'true');

    let beneficiary;
    beneficiary = await celerTimelock.beneficiary();
    assert.equal(beneficiary, accounts[1]);

    const receipt = await celerTimelock.resetBeneficiary(
      accounts[2],
      {
        from: accounts[0]
      }
    );
    beneficiary = await celerTimelock.beneficiary();
    const { event, args } = receipt.logs[0];

    assert.equal(event, 'ResetBeneficiary');
    assert.equal(args.beneficiary, accounts[2]);
    assert.equal(beneficiary, accounts[2]);
  });

  it('should fail to release before the end of the 1st lockup even when activated', async () => {
    let beneficiaryBalance;
    const beneficiary = await celerTimelock.beneficiary();
    beneficiaryBalance = await celerToken.balanceOf(beneficiary);
    assert.equal(beneficiaryBalance.toString(), '0');

    const receipt = await celerTimelock.release();
    const { event } = receipt.logs[0];
    beneficiaryBalance = await celerToken.balanceOf(beneficiary);
    
    assert.equal(beneficiaryBalance.toString(), '0');
    assert.equal(event, 'ZeroReleasableAmount');
  });

  it('should release correctly after the end of the 1st lockup', async () => {
    await celerTimelock.timeTravel(91 * SECONDS_IN_A_DAY);

    let beneficiaryBalance;
    const beneficiary = await celerTimelock.beneficiary();
    beneficiaryBalance = await celerToken.balanceOf(beneficiary);
    assert.equal(beneficiary, accounts[2]);
    assert.equal(beneficiaryBalance.toString(), '0');

    // anyone can call release
    const receipt = await celerTimelock.release({
      from: accounts[5]
    });
    const { event, args } = receipt.logs[0];
    beneficiaryBalance = await celerToken.balanceOf(beneficiary);
    const expectedBalance = Math.floor(totalAmount / 3);
    const releasedAmount = await celerTimelock.releasedAmount();

    assert.equal(event, 'NewRelease');
    assert.equal(args.beneficiary, accounts[2]);
    // javascript has different computational precision from solidity, we can't compare directly.
    const difference = args.amount - expectedBalance;
    assert.equal(difference.toString(), '0');
    assert.equal(beneficiaryBalance.toString(), args.amount.toString());
    assert.equal(releasedAmount.toString(), args.amount.toString());
  });

  it('should fail to release twice after the end of the 1st lockup', async () => {
    const beneficiary = await celerTimelock.beneficiary();
    const beneficiaryBalanceOld = await celerToken.balanceOf(beneficiary);

    const receipt = await celerTimelock.release();
    const { event } = receipt.logs[0];
    const beneficiaryBalanceNew = await celerToken.balanceOf(beneficiary);

    assert.equal(beneficiaryBalanceOld.toString(), beneficiaryBalanceNew.toString());
    assert.equal(event, 'ZeroReleasableAmount');
  });

  it('should release all tokens correctly after the end of all lockups', async () => {
    await celerTimelock.timeTravel(180 * SECONDS_IN_A_DAY);

    const beneficiary = await celerTimelock.beneficiary();
    const beneficiaryBalanceOld = await celerToken.balanceOf(beneficiary);

    // anyone can call release
    const receipt = await celerTimelock.release({
      from: accounts[5]
    });
    const { event, args } = receipt.logs[0];
    const beneficiaryBalanceNew = await celerToken.balanceOf(beneficiary);
    const expectedNewRelease = totalAmount - beneficiaryBalanceOld;
    const releasedAmount = await celerTimelock.releasedAmount();
    const unreleasedAmount = await celerToken.balanceOf(celerTimelock.address);

    assert.equal(event, 'NewRelease');
    assert.equal(args.beneficiary, accounts[2]);
    // javascript has different computational precision from solidity, we can't compare directly.
    const difference = args.amount - expectedNewRelease;
    assert.equal(difference.toString(), '0');
    assert.equal(beneficiaryBalanceNew.toString(), totalAmount.toString());
    assert.equal(releasedAmount.toString(), totalAmount.toString());
    assert.equal(unreleasedAmount.toString(), '0');
  });

  it('should fail to release anymore tokens after the final (total) release', async () => {
    const beneficiary = await celerTimelock.beneficiary();
    const beneficiaryBalanceOld = await celerToken.balanceOf(beneficiary);

    const receipt = await celerTimelock.release();
    const { event } = receipt.logs[0];
    const beneficiaryBalanceNew = await celerToken.balanceOf(beneficiary);

    assert.equal(beneficiaryBalanceOld.toString(), beneficiaryBalanceNew.toString());
    assert.equal(event, 'ZeroReleasableAmount');
  });

  // using celerTimelockNew
  it('should fail to activateWithTime by a non-owner', async () => {
    let err = null;
    const inputStartTime = Math.floor(Date.now() / 1000) + 5 * 30 * SECONDS_IN_A_DAY;

    try {
      await celerTimelockNew.activateWithTime(
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

  it('should fail to release when not activated even after lockup(s)', async () => {
    let err = null;
    const startTime = await celerTimelockNew.startTime();
    // current startTime should be 0, and if startTime is 0, now must be after all lockups
    assert(startTime.toString(), '0');

    try {
      await celerTimelockNew.release();
    } catch (error) {
      err = error;
    }
    assert.isOk(err instanceof Error);
  });

  it('should activateWithTime correctly', async () => {
     const inputStartTime = Math.floor(Date.now() / 1000) + 5 * 30 * SECONDS_IN_A_DAY;
     // call: changes will not be saved
    const result = await celerTimelockNew.activateWithTime.call(
      inputStartTime,
      {
        from: accounts[0]
      }
    );
    assert.equal(result.toString(), 'true');

    let isActivated;
    isActivated = await celerTimelockNew.isActivated();
    assert.equal(isActivated.toString(), 'false');

    const receipt = await celerTimelockNew.activateWithTime(
      inputStartTime,
      {
        from: accounts[0]
      }
    );
    const { event, args } = receipt.logs[0];
    isActivated = await celerTimelockNew.isActivated();
    const startTime = await celerTimelockNew.startTime();

    assert.equal(event, 'Activate');
    assert.isOk(inputStartTime.toString(), args.startTime.toString());
    assert.equal(isActivated.toString(), 'true');
    assert.equal(startTime.toString(), inputStartTime.toString());
  });

  it('should fail to activateWithTime when activated', async () => {
    let err = null;
    const inputStartTime = Math.floor(Date.now() / 1000) + 5 * 30 * SECONDS_IN_A_DAY;

    try {
      await celerTimelockNew.activateWithTime(inputStartTime);
    } catch (error) {
      err = error;
    }
    assert.isOk(err instanceof Error);
  });

  it('should release correctly after the end of the 2nd lockup', async () => {
    await celerToken.transfer(celerTimelockNew.address, totalAmount);
    const unreleasedAmount = await celerToken.balanceOf(celerTimelockNew.address);
    assert.equal(totalAmount.toString(), unreleasedAmount.toString());

    await celerTimelockNew.timeTravel((11 * 30 + 1) * SECONDS_IN_A_DAY);

    let beneficiaryBalance;
    const beneficiary = await celerTimelockNew.beneficiary();
    beneficiaryBalance = await celerToken.balanceOf(beneficiary);
    assert.equal(beneficiary, accounts[1]);
    assert.equal(beneficiaryBalance.toString(), '0');

    // anyone can call release
    const receipt = await celerTimelockNew.release({
      from: accounts[1]
    });
    const { event, args } = receipt.logs[0];
    beneficiaryBalance = await celerToken.balanceOf(beneficiary);
    const expectedBalance = Math.floor(totalAmount * 2 / 3);
    const releasedAmount = await celerTimelockNew.releasedAmount();

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
    beneficiary = await celerTimelockNew.beneficiary();
    assert.equal(beneficiary, accounts[1]);

    let receipt;
    receipt = await celerTimelockNew.resetBeneficiary(
      accounts[3],
      {
        from: accounts[0]
      }
    );
    beneficiary = await celerTimelockNew.beneficiary();
    assert.equal(receipt.logs[0].event, 'ResetBeneficiary');
    assert.equal(receipt.logs[0].args.beneficiary, accounts[3]);
    assert.equal(beneficiary, accounts[3]);
    
    await celerTimelockNew.timeTravel(3 * 30 * SECONDS_IN_A_DAY);

    const beneficiaryBalanceOld = await celerToken.balanceOf(beneficiary);
    assert.equal(beneficiaryBalanceOld.toString(), '0');

    // anyone can call release
    receipt = await celerTimelockNew.release({
      from: accounts[6]
    });
    const { event, args } = receipt.logs[0];
    beneficiaryBalanceNew = await celerToken.balanceOf(beneficiary);
    const expectedBalance = Math.floor(totalAmount / 3);
    const releasedAmount = await celerTimelockNew.releasedAmount();

    assert.equal(event, 'NewRelease');
    assert.equal(args.beneficiary, accounts[3]);
    // javascript has different computational precision from solidity, we can't compare directly.
    const difference = args.amount - expectedBalance;
    assert.equal(difference.toString(), '0');
    assert.equal(beneficiaryBalanceNew.toString(), args.amount.toString());
    assert.equal(releasedAmount.toString(), totalAmount.toString());
  });
});
