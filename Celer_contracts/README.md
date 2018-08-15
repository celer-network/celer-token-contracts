# Celer Network - Token Related Contracts

## Code structure

###1. Main contracts

* **CelerToken.sol:** Celer Network's token contract.
* **CelerTimelock.sol:** Token Timelock contract specialized for Celer's angel and private sale rounds.
* **CelerCrowdsale.sol:** crowdsale contract for Celer Network.

###2. Libraries

**Libraries written by Celer:**

* ContributionsCrowdsale.sol
* MaxGasPriceCrowdsale.sol
* MinCapCrowdsale.sol
* PausableCrowdsale.sol
* StagedMaxCapCrowdsale.sol
* SuccinctWhitelist.sol
* SuccinctWhitelistedCrowdsale.sol

**External Library:**

* openzeppelin-solidity

## Note for audit

In `./CelerCrowdsale.sol` and `./CelerTimelock.sol`, there are some hardcoded numbers which haven't been decided yet or are not ready for release. These numbers are replaced with some mock characters like `X`, `Y` and `Z`, and have descriptive comments before them beginning with `note for audit only:`. You may replace them with reasonable numbers for audit purpose.

## LICENSE
You can view our license in `./LICENSE`.