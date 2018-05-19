import ether from "./helpers/ether";
import { advanceBlock } from "./helpers/advanceToBlock";
import { increaseTimeTo, duration } from "./helpers/increaseTime";
import latestTime from "./helpers/latestTime";
import log from "./helpers/logger";
import EVMRevert from "./helpers/VMExceptionRevert";

const BigNumber = web3.BigNumber;

const should = require("chai")
  .use(require("chai-as-promised"))
  .use(require("chai-bignumber")(BigNumber))
  .should();

const PublicSale = artifacts.require("PublicSale");
const Token = artifacts.require("Token");
const Whitelisting = artifacts.require("Whitelisting");

contract("PublicSale", function([_, owner, nonOwner, wallet, investor]) {
  const tokenSupply = ether(1000);
  const value = ether(1);
  const cap = ether(30);
  const overCap = ether(31);
  const individualCap = ether(30);
  const overIndividualCap = ether(31);
  const refundTokenCap = ether(20);

  before(async function() {
    // Advance to the next block to correctly read time in the solidity "now" function interpreted by testrpc
    await advanceBlock();
  });

  beforeEach(async function() {
    this.startTime = latestTime() + duration.weeks(1);
    this.endTime = this.startTime + duration.weeks(1);
    this.beforeEndTime = this.endTime - duration.seconds(1);
    this.afterEndTime = this.endTime + duration.seconds(1);
    this.refundClosingTime = this.endTime + duration.weeks(1);

    this.token = await Token.new(owner, owner, tokenSupply);
    this.whitelisting = await Whitelisting.new();
    this.crowdsale = await PublicSale.new(
      this.startTime,
      this.endTime,
      wallet,
      this.whitelisting.address,
      this.token.address,
      this.refundClosingTime,
      refundTokenCap,
      cap,
      individualCap,
      { from: owner }
    );
    const tx = await this.token.transferOwnership(this.crowdsale.address);
    log(`transferOwnership gasUsed: ${tx.receipt.gasUsed}`);
  });

  describe("allocateTokens", function() {
    it("should fail if tokens already allocated", async function() {
      increaseTimeTo(this.startTime);

      const tx1 = await this.crowdsale.sendTransaction({
        value,
        from: investor
      });
      log(`sendTransaction gasUsed: ${tx1.receipt.gasUsed}`);

      const tx2 = await this.whitelisting.approveInvestor(investor, {
        from: _
      });
      log(`approveInvestor gasUsed: ${tx2.receipt.gasUsed}`);

      increaseTimeTo(this.endTime + duration.seconds(1));
      
      const tx3 = await this.crowdsale.allocateTokens(0, value, { from: owner })
        .should.be.fulfilled;
      log(`allocateTokens gasUsed: ${tx3.receipt.gasUsed}`);

      await this.crowdsale
        .allocateTokens(0, value, { from: owner })
        .should.be.rejectedWith(EVMRevert);
    });

    it("should fail if over individual tokenCap", async function() {
      increaseTimeTo(this.startTime);

      const tx = await this.crowdsale.sendTransaction({
        value: overIndividualCap,
        from: investor
      });
      log(`sendTransaction gasUsed: ${tx.receipt.gasUsed}`);
      
      increaseTimeTo(this.endTime + duration.seconds(1));
      
      await this.crowdsale
        .allocateTokens(0, overIndividualCap, { from: owner, gasPrice: 0 })
        .should.be.rejectedWith(EVMRevert);
    });

    it("should fail if over individual tokenCap in second contribution", async function() {
      increaseTimeTo(this.startTime);
      const tx1 = await this.crowdsale.sendTransaction({
        value,
        from: investor
      });
      log(`sendTransaction gasUsed: ${tx1.receipt.gasUsed}`);

      const tx2 = await this.whitelisting.approveInvestor(investor, {
        from: _
      });
      log(`approveInvestor gasUsed: ${tx2.receipt.gasUsed}`);

      
      const tx = await this.crowdsale.sendTransaction({
        value: individualCap,
        from: investor
      });
      log(`sendTransaction gasUsed: ${tx.receipt.gasUsed}`);
      
      increaseTimeTo(this.endTime + duration.seconds(1));
      
      const tx3 = await this.crowdsale.allocateTokens(0, value, { from: owner })
        .should.be.fulfilled;
      log(`allocateTokens gasUsed: ${tx3.receipt.gasUsed}`);
     
      await this.crowdsale
        .allocateTokens(0, individualCap, { from: owner, gasPrice: 0 })
        .should.be.rejectedWith(EVMRevert);
    });

    it("should fail if not called by owner", async function() {
      increaseTimeTo(this.startTime);

      const tx1 = await this.crowdsale.sendTransaction({
        value,
        from: investor
      });
      log(`sendTransaction gasUsed: ${tx1.receipt.gasUsed}`);

      const tx2 = await this.whitelisting.approveInvestor(investor, {
        from: _
      });
      log(`approveInvestor gasUsed: ${tx2.receipt.gasUsed}`);

      increaseTimeTo(this.endTime + duration.seconds(1));
      
      await this.crowdsale
        .allocateTokens(0, value, { from: nonOwner })
        .should.be.rejectedWith(EVMRevert);
    });

    it("should fail if beneficiary is not whitelisted", async function() {
      increaseTimeTo(this.startTime);

      const tx = await this.crowdsale.sendTransaction({
        value,
        from: investor
      });
      log(`sendTransaction gasUsed: ${tx.receipt.gasUsed}`);

      increaseTimeTo(this.endTime + duration.seconds(1));
      
      await this.crowdsale
        .allocateTokens(0, value, { from: owner })
        .should.be.rejectedWith(EVMRevert);
    });

    it("should fail if over tokenCap", async function() {
      increaseTimeTo(this.startTime);

      const tx1 = await this.crowdsale.sendTransaction({
        value,
        from: investor
      });
      log(`sendTransaction gasUsed: ${tx1.receipt.gasUsed}`);

      const tx2 = await this.whitelisting.approveInvestor(investor, {
        from: _
      });
      log(`approveInvestor gasUsed: ${tx2.receipt.gasUsed}`);

      increaseTimeTo(this.endTime + duration.seconds(1));
      
      await this.crowdsale
        .allocateTokens(0, overCap, { from: owner })
        .should.be.rejectedWith(EVMRevert);
    });

    it("should set tokensAllocated to true", async function() {
      increaseTimeTo(this.startTime);

      const tx1 = await this.crowdsale.sendTransaction({
        value,
        from: investor
      });
      log(`sendTransaction gasUsed: ${tx1.receipt.gasUsed}`);

      const tx2 = await this.whitelisting.approveInvestor(investor, {
        from: _
      });
      log(`approveInvestor gasUsed: ${tx2.receipt.gasUsed}`);

      increaseTimeTo(this.endTime + duration.seconds(1));
      
      const tx3 = await this.crowdsale.allocateTokens(0, value, { from: owner })
        .should.be.fulfilled;
      log(`allocateTokens gasUsed: ${tx3.receipt.gasUsed}`);

      (await this.crowdsale.contributions(0))[3].should.equal(true);
    });

    it("should mint tokens to beneficiary", async function() {
      increaseTimeTo(this.startTime);

      const tx1 = await this.crowdsale.sendTransaction({
        value,
        from: investor
      });
      log(`sendTransaction gasUsed: ${tx1.receipt.gasUsed}`);

      const tx2 = await this.whitelisting.approveInvestor(investor, {
        from: _
      });
      log(`approveInvestor gasUsed: ${tx2.receipt.gasUsed}`);

      increaseTimeTo(this.endTime + duration.seconds(1));
      
      const tx3 = await this.crowdsale.allocateTokens(0, value, { from: owner })
        .should.be.fulfilled;
      log(`allocateTokens gasUsed: ${tx3.receipt.gasUsed}`);

      (await this.token.balanceOf(investor)).should.be.bignumber.equal(value);
    });

    it("should log events", async function() {
      increaseTimeTo(this.startTime);

      const tx1 = await this.crowdsale.sendTransaction({
        value,
        from: investor
      });
      log(`sendTransaction gasUsed: ${tx1.receipt.gasUsed}`);

      const tx2 = await this.whitelisting.approveInvestor(investor, {
        from: _
      });
      log(`approveInvestor gasUsed: ${tx2.receipt.gasUsed}`);

      increaseTimeTo(this.endTime + duration.seconds(1));
      
      const tx3 = await this.crowdsale.allocateTokens(0, value, { from: owner })
        .should.be.fulfilled;
      log(`allocateTokens gasUsed: ${tx3.receipt.gasUsed}`);

      const event = tx3.logs.find(e => e.event === "TokenPurchase");

      should.exist(event);
      event.args.purchaser.should.equal(owner);
      event.args.beneficiary.should.equal(investor);
      event.args.value.should.be.bignumber.equal(value);
      event.args.amount.should.be.bignumber.equal(value);
    });
  });

  describe("ownerAssignedTokens", function() {
    beforeEach(async function() {
      const tx2 = await this.whitelisting.approveInvestor(investor, {
        from: _
      });
      log(`approveInvestor gasUsed: ${tx2.receipt.gasUsed}`);
    });

    it("should fail if not called by owner", async function() {

      increaseTimeTo(this.endTime + duration.seconds(1));

      await this.crowdsale
        .ownerAssignedTokens(investor, value, { from: nonOwner })
        .should.be.rejectedWith(EVMRevert);
    });

    it("should fail if over individual tokenCap", async function() {
      increaseTimeTo(this.endTime + duration.seconds(1));

      await this.crowdsale
        .ownerAssignedTokens(investor, overIndividualCap, { from: owner })
        .should.be.rejectedWith(EVMRevert);
    });

    it("should fail if beneficiary is not whitelisted", async function() {
      const tx = await this.whitelisting.disapproveInvestor(investor, {
        from: _
      });
      log(`disapproveInvestor gasUsed: ${tx.receipt.gasUsed}`);

      increaseTimeTo(this.endTime + duration.seconds(1));
      
      await this.crowdsale
        .ownerAssignedTokens(investor, value, { from: owner })
        .should.be.rejectedWith(EVMRevert);
    });

    it("should fail if over tokenCap", async function() {
      increaseTimeTo(this.endTime + duration.seconds(1));

      await this.crowdsale
        .ownerAssignedTokens(investor, overCap, { from: owner })
        .should.be.rejectedWith(EVMRevert);
    });

    it("should mint tokens to beneficiary", async function() {

      increaseTimeTo(this.endTime + duration.seconds(1));
      
      const tx = await this.crowdsale.ownerAssignedTokens(investor, value, {
        from: owner
      }).should.be.fulfilled;
      log(`ownerAssignedTokens investorasUsed: ${tx.receipt.gasUsed}`);

      (await this.token.balanceOf(investor)).should.be.bignumber.equal(value);
    });

    it("should log events", async function() {

      increaseTimeTo(this.endTime + duration.seconds(1));
      
      const tx = await this.crowdsale.ownerAssignedTokens(investor, value, {
        from: owner
      }).should.be.fulfilled;
      log(`ownerAssignedTokens investorasUsed: ${tx.receipt.gasUsed}`);

      const event = tx.logs.find(e => e.event === "TokenPurchase");

      should.exist(event);
      event.args.purchaser.should.equal(owner);
      event.args.beneficiary.should.equal(investor);
      event.args.value.should.be.bignumber.equal(new BigNumber(0));
      event.args.amount.should.be.bignumber.equal(value);
    });
  });

  describe("closeRefunds", function() {
    it("should fail if refund Closing Time is not reached", async function() {
      increaseTimeTo(this.refundClosingTime - duration.seconds(1));
      await this.crowdsale
        .closeRefunds({ from: owner })
        .should.be.rejectedWith(EVMRevert);
    });

    it("should fail if fund didn't raised up to minimum cap", async function() {
      increaseTimeTo(this.refundClosingTime + duration.seconds(1));
      await this.crowdsale
        .closeRefunds({ from: owner })
        .should.be.rejectedWith(EVMRevert);
    });

    it("should pass if fund raised up to minimum cap", async function() {
      increaseTimeTo(this.startTime);
      const tx1 = await this.crowdsale.sendTransaction({
        value: refundTokenCap,
        from: investor
      });
      log(`sendTransaction gasUsed: ${tx1.receipt.gasUsed}`);

      const tx2 = await this.whitelisting.approveInvestor(investor, {
        from: _
      });
      log(`approveInvestor gasUsed: ${tx2.receipt.gasUsed}`);

      increaseTimeTo(this.endTime + duration.seconds(1));
      
      const tx3 = await this.crowdsale.allocateTokens(0, refundTokenCap, { from: owner })
        .should.be.fulfilled;
      log(`allocateTokens gasUsed: ${tx3.receipt.gasUsed}`);
      
      (await this.token.balanceOf(investor)).should.be.bignumber.equal(refundTokenCap);
      
      const pre = web3.eth.getBalance(wallet);
      
      increaseTimeTo(this.refundClosingTime + duration.seconds(1));
      await this.crowdsale
        .closeRefunds({ from: owner })
        .should.be.fulfilled;
      const post = web3.eth.getBalance(wallet);
      post.minus(pre).should.be.bignumber.equal(refundTokenCap);
    });
  });
});
