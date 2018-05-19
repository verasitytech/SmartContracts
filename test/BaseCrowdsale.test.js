import ether from "./helpers/ether";
import { advanceBlock } from "./helpers/advanceToBlock";
import { increaseTimeTo, duration } from "./helpers/increaseTime";
import latestTime from "./helpers/latestTime";
import log from "./helpers/logger";
import EVMRevert from "./helpers/VMExceptionRevert";
import InvalidAddress from './helpers/VMInvalidAddress.js';

const BigNumber = web3.BigNumber;

const should = require("chai")
  .use(require("chai-as-promised"))
  .use(require("chai-bignumber")(BigNumber))
  .should();

const BaseCrowdsale = artifacts.require("BaseCrowdsale");
const Token = artifacts.require("Token");
const Whitelisting = artifacts.require("Whitelisting");

contract("BaseCrowdsale", function([owner, investor, wallet, purchaser]) {
  const value = ether(2);

  before(async function() {
    // Advance to the next block to correctly read time in the solidity "now" function interpreted by testrpc
    await advanceBlock();
  });

  beforeEach(async function() {
    this.startTime = latestTime() + duration.weeks(1);
    this.endTime = this.startTime + duration.weeks(1);
    this.afterEndTime = this.endTime + duration.seconds(1);
    this.beforeStartTime = this.startTime - duration.seconds(1);
    this.afterStartTime = this.startTime + duration.seconds(1);
    this.beforeEndTime = this.endTime - duration.seconds(1);

    this.token = await Token.new(owner, owner, new BigNumber(1000));
    this.whitelisting = await Whitelisting.new();
    this.baseCrowdsale = await BaseCrowdsale.new(
      this.startTime,
      this.endTime,
      wallet,
      this.token.address,
      this.whitelisting.address
    );
    const tx = await this.token.transferOwnership(this.baseCrowdsale.address);
    log(`transferOwnership gasUsed: ${tx.receipt.gasUsed}`);
  });

  it("should be token owner", async function() {
    const owner = await this.token.owner();
    owner.should.equal(this.baseCrowdsale.address);
  });

  it("should be created properly", async function() {
    (await this.baseCrowdsale.whitelisting()).should.equal(
      this.whitelisting.address
    );
    (await this.baseCrowdsale.token()).should.equal(this.token.address);
    (await this.baseCrowdsale.contributionIndex()).should.be.bignumber.equal(
      new BigNumber(0)
    );
    (await this.baseCrowdsale.startTime()).should.be.bignumber.equal(
      this.startTime
    );
    (await this.baseCrowdsale.endTime()).should.be.bignumber.equal(
      this.endTime
    );
    (await this.baseCrowdsale.wallet()).should.equal(wallet);
    (await this.baseCrowdsale.weiRaised()).should.be.bignumber.equal(
      new BigNumber(0)
    );
  });

  it("should be ended only after end", async function() {
    let ended = await this.baseCrowdsale.hasEnded();
    ended.should.equal(false);
    await increaseTimeTo(this.afterEndTime);
    ended = await this.baseCrowdsale.hasEnded();
    ended.should.equal(true);
  });

  describe("accepting payments", function() {
    it("should reject payments before start", async function() {
      await this.baseCrowdsale.send(value).should.be.rejectedWith(EVMRevert);
      await this.baseCrowdsale
        .sendTransaction({
          value: value,
          from: investor
        })
        .should.be.rejectedWith(EVMRevert);
    });

    it("should accept payments after start", async function() {
      await increaseTimeTo(this.startTime);
      const tx1 = await this.baseCrowdsale.send(value).should.be.fulfilled;
      log(`send gasUsed: ${tx1.receipt.gasUsed}`);
     
      const tx2 = await this.baseCrowdsale.sendTransaction({
        value: value,
        from: investor
      });
      log(`buyTokens gasUsed: ${tx2.receipt.gasUsed}`);
    });

    it("should reject payments after end", async function() {
      await increaseTimeTo(this.afterEndTime);
      await this.baseCrowdsale.send(value).should.be.rejectedWith(EVMRevert);
      await this.baseCrowdsale
        .sendTransaction({
          value: value,
          from: investor
        })
        .should.be.rejectedWith(EVMRevert);
    });

    it("should reject payments with zero value", async function() {
      await increaseTimeTo(this.startTime);
      await this.baseCrowdsale.send(ether(0)).should.be.rejectedWith(EVMRevert);
      await this.baseCrowdsale
        .sendTransaction({
          value: ether(0),
          from: investor
        })
        .should.be.rejectedWith(EVMRevert);
    });

    it("should reject payments when paused", async function() {
      await increaseTimeTo(this.startTime);
      await this.baseCrowdsale.pause();
      await this.baseCrowdsale.send(value).should.be.rejectedWith(EVMRevert);
      await this.baseCrowdsale
        .sendTransaction({
          value: value,
          from: investor
        })
        .should.be.rejectedWith(EVMRevert);
    });

    it("should resume payments when unpaused", async function() {
      await increaseTimeTo(this.startTime);
      await this.baseCrowdsale.pause();
      await this.baseCrowdsale.send(value).should.be.rejectedWith(EVMRevert);
      await this.baseCrowdsale
        .sendTransaction({
          value: value,
          from: investor
        })
        .should.be.rejectedWith(EVMRevert);

      await this.baseCrowdsale.unpause();
      const tx1 = await this.baseCrowdsale.send(value).should.be.fulfilled;
      log(`send gasUsed: ${tx1.receipt.gasUsed}`);
      const tx2 = await this.baseCrowdsale
      .sendTransaction({
        value: value,
        from: investor
      })
      .should.be.fulfilled;
      log(`buyTokens gasUsed: ${tx2.receipt.gasUsed}`);
    });

    it("should reject payments with zero address", async function() {
      await increaseTimeTo(this.startTime);
      await this.baseCrowdsale
        .sendTransaction({
          value: value,
          from: "0x0"
        })
        .should.be.rejectedWith(InvalidAddress);
    });
  });

  describe("high-level purchase", function() {
    beforeEach(async function() {
      await increaseTimeTo(this.startTime);
    });

    it("should log RecordedContribution", async function() {
      const tx = await this.baseCrowdsale.sendTransaction({
        value: value,
        from: investor
      });
      log(`sendTransaction gasUsed: ${tx.receipt.gasUsed}`);

      const event = tx.logs.find(e => e.event === "RecordedContribution");
      should.exist(event);
      event.args.index.should.be.bignumber.equal(new BigNumber(0));
      event.args.contributor.should.equal(investor);
      event.args.weiAmount.should.be.bignumber.equal(value);
      event.args.time.should.be.bignumber;
    });

    it("should increment contributionIndex", async function() {
      const tx = await this.baseCrowdsale.sendTransaction({
        value: value,
        from: investor
      });
      log(`sendTransaction gasUsed: ${tx.receipt.gasUsed}`);

      (await this.baseCrowdsale.contributionIndex()).should.be.bignumber.equal(
        new BigNumber(1)
      );
    });

    it("should increase weiRaised", async function() {
      const tx = await this.baseCrowdsale.sendTransaction({
        value: value,
        from: investor
      });
      log(`sendTransaction gasUsed: ${tx.receipt.gasUsed}`);

      (await this.baseCrowdsale.weiRaised()).should.be.bignumber.equal(value);
    });

    it("should record contribution", async function() {
      const tx = await this.baseCrowdsale.sendTransaction({
        value: value,
        from: investor
      });
      log(`sendTransaction gasUsed: ${tx.receipt.gasUsed}`);

      const contribution = await this.baseCrowdsale.contributions(0);

      contribution[0].should.equal(investor);
      contribution[1].should.be.bignumber.equal(value);
      contribution[2].should.be.bignumber;
      contribution[3].should.equal(false);
    });

    it("should forward funds to wallet", async function() {
      const pre = web3.eth.getBalance(wallet);
      const tx = await this.baseCrowdsale.sendTransaction({
        value,
        from: investor
      });
      log(`sendTransaction gasUsed: ${tx.receipt.gasUsed}`);
      const post = web3.eth.getBalance(wallet);
      post.minus(pre).should.be.bignumber.equal(value);
    });
  });

  describe("transferTokenOwnership", function() {
    it("should transfer token ownership", async function() {
      const tx = await this.baseCrowdsale.transferTokenOwnership(investor)
        .should.be.fulfilled;
      log(`transferTokenOwnership gasUsed: ${tx.receipt.gasUsed}`);

      (await this.token.owner()).should.equal(investor);
    });

    it("should revert if new owner is address(0)", async function() {
      await this.baseCrowdsale
        .transferTokenOwnership("0x0")
        .should.be.rejectedWith(EVMRevert);
    });

    it("should throw if not called by owner", async function() {
      await this.baseCrowdsale
        .transferTokenOwnership(investor, { from: investor })
        .should.be.rejectedWith(EVMRevert);
    });

    it("should log events", async function() {
      const tx = await this.baseCrowdsale.transferTokenOwnership(investor)
        .should.be.fulfilled;
      log(`transferTokenOwnership gasUsed: ${tx.receipt.gasUsed}`);

      const event = tx.logs.find(e => e.event === "TokenOwnershipTransferred");

      should.exist(event);
      event.args.previousOwner.should.equal(owner);
      event.args.newOwner.should.equal(investor);
    });
  });

  describe("setStartTime", function() {
    it("should be callable by owner", async function() {
      const tx = await this.baseCrowdsale.setStartTime(this.beforeStartTime, {
        from: owner
      }).should.be.fulfilled;
      log(`setStartTime gasUsed: ${tx.receipt.gasUsed}`);
    });

    it("should not be callable by non owners", async function() {
      await this.baseCrowdsale
        .setStartTime(this.beforeStartTime, { from: purchaser })
        .should.be.rejectedWith(EVMRevert);
    });

    it("should only be callable before startTime", async function() {
      const tx = await this.baseCrowdsale.setStartTime(this.beforeStartTime, {
        from: owner
      }).should.be.fulfilled;
      log(`setStartTime gasUsed: ${tx.receipt.gasUsed}`);

      await increaseTimeTo(this.beforeStartTime);
      await this.baseCrowdsale
        .setStartTime(this.startTime, { from: owner })
        .should.be.rejectedWith(EVMRevert);
    });

    it("should throw if new startTime is smaller than current time", async function() {
      const beforeCurrentTime = latestTime() - duration.seconds(1);
      await this.baseCrowdsale
        .setStartTime(beforeCurrentTime, { from: owner })
        .should.be.rejectedWith(EVMRevert);
    });

    it("should throw if new startTime is greater than or equal to endTime", async function() {
      await this.baseCrowdsale
        .setStartTime(this.afterEndTime, { from: owner })
        .should.be.rejectedWith(EVMRevert);
    });

    it("should update startTime", async function() {
      const tx = await this.baseCrowdsale.setStartTime(this.afterStartTime)
        .should.be.fulfilled;
      log(`setStartTime gasUsed: ${tx.receipt.gasUsed}`);

      const newStartTime = await this.baseCrowdsale.startTime();
      newStartTime.should.be.bignumber.equal(this.afterStartTime);
    });
  });

  describe("setEndTime", function() {
    it("should be callable by owner", async function() {
      const tx = await this.baseCrowdsale.setEndTime(this.beforeEndTime, {
        from: owner
      }).should.be.fulfilled;
      log(`setEndTime gasUsed: ${tx.receipt.gasUsed}`);
    });

    it("should not be callable by non owners", async function() {
      await this.baseCrowdsale
        .setEndTime(this.beforeEndTime, { from: purchaser })
        .should.be.rejectedWith(EVMRevert);
    });

    it("should only be callable before endTime", async function() {
      const tx = await this.baseCrowdsale.setEndTime(this.beforeEndTime, {
        from: owner
      }).should.be.fulfilled;
      log(`setEndTime gasUsed: ${tx.receipt.gasUsed}`);

      await increaseTimeTo(this.beforeEndTime);
      await this.baseCrowdsale
        .setEndTime(this.endTime, { from: owner })
        .should.be.rejectedWith(EVMRevert);
    });

    it("should throw if new endTime is smaller than current time", async function() {
      const beforeCurrentTime = latestTime() - duration.seconds(1);
      await this.baseCrowdsale
        .setEndTime(beforeCurrentTime, { from: owner })
        .should.be.rejectedWith(EVMRevert);
    });

    it("should throw if new endTime is smaller than or equal to startTime", async function() {
      await this.baseCrowdsale
        .setEndTime(this.beforeStartTime, { from: owner })
        .should.be.rejectedWith(EVMRevert);
    });

    it("should update endTime", async function() {
      const tx = await this.baseCrowdsale.setEndTime(this.afterEndTime, {
        from: owner
      }).should.be.fulfilled;
      log(`setEndTime gasUsed: ${tx.receipt.gasUsed}`);

      const newEndTime = await this.baseCrowdsale.endTime();
      newEndTime.should.be.bignumber.equal(this.afterEndTime);
    });
  });
});
