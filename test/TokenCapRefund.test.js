import ether from "./helpers/ether";
import { advanceBlock } from "./helpers/advanceToBlock";
import { increaseTimeTo, duration } from "./helpers/increaseTime";
import latestTime from "./helpers/latestTime";
import log from "./helpers/logger";
import EVMRevert from "./helpers/VMExceptionRevert";

const BigNumber = web3.BigNumber;

require("chai")
  .use(require("chai-as-promised"))
  .use(require("chai-bignumber")(BigNumber))
  .should();

const TokenCapRefund = artifacts.require("TokenCapRefundImpl");
const Token = artifacts.require("Token");
const Whitelisting = artifacts.require("Whitelisting");
const RefundVault = artifacts.require("RefundVault");

contract("TokenCapRefund", function([_, owner, wallet, investor]) {
  const value = ether(1);
  const cap = ether(30);
  const overCap = ether(31);
  const individualCap = ether(30);
  const overIndividualCap = ether(31);

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
    this.newRefundClosingTime = this.refundClosingTime + duration.seconds(10);
    this.refundClosingTokenCap = ether(10);
    this.newRefundClosingTokenCap = ether(11);

    this.token = await Token.new(owner,owner, new BigNumber(1000));
    this.whitelisting = await Whitelisting.new();
    this.crowdsale = await TokenCapRefund.new(
      this.startTime,
      this.endTime,
      wallet,
      cap,
      individualCap,
      this.refundClosingTime,
      this.refundClosingTokenCap,
      this.token.address,
      this.whitelisting.address,
      { from: owner }
    );
    const tx = await this.token.transferOwnership(this.crowdsale.address);
    log(`transferOwnership gasUsed: ${tx.receipt.gasUsed}`);
  });

  describe("creating a valid crowdsale", function() {
    it("should fail if refund closing time is before end time", async function() {
      await TokenCapRefund.new(
        this.startTime,
        this.endTime,
        wallet,
        cap,
        individualCap,
        this.beforeEndTime,
        this.refundClosingTokenCap,        
        this.token.address,
        this.whitelisting.address,
        { from: owner }
      ).should.be.rejectedWith(EVMRevert);
    });

    it("should be created with proper parameters", async function() {
      (await this.crowdsale.refundClosingTime()).should.be.bignumber.equal(
        this.refundClosingTime
      );
    });
  });

  describe("closeRefunds", function() {
    beforeEach(async function() {
      increaseTimeTo(this.startTime);

      const tx = await this.crowdsale.sendTransaction({
        value,
        from: investor
      });
      log(`sendTransaction gasUsed: ${tx.receipt.gasUsed}`);
    });

    it("should fail if called before refund closing time", async function() {
      increaseTimeTo(this.refundClosingTime - duration.seconds(1));
      await this.crowdsale
        .closeRefunds({ from: owner })
        .should.be.rejectedWith(EVMRevert);
    });

    it("should fail if not called by owner", async function() {
      increaseTimeTo(this.refundClosingTime + duration.seconds(1));
      await this.crowdsale
        .closeRefunds({ from: wallet })
        .should.be.rejectedWith(EVMRevert);
    });

    it("should fail if fund didn't raised up to minimum cap", async function() {
      increaseTimeTo(this.refundClosingTime + duration.seconds(1));
      await this.crowdsale
        .closeRefunds({ from: owner })
        .should.be.rejectedWith(EVMRevert);
    });

    it("should pass if fund raised up to minimum cap", async function() {
      const tx1 = await this.crowdsale.sendTransaction({
        value: this.refundClosingTokenCap,
        from: investor
      });
      log(`sendTransaction gasUsed: ${tx1.receipt.gasUsed}`);

      const tx2 = await this.whitelisting.approveInvestor(investor, {
        from: _
      });
      log(`approveInvestor gasUsed: ${tx2.receipt.gasUsed}`);

      const tx3 = await this.crowdsale.allocateTokens(0, this.refundClosingTokenCap, { from: owner })
        .should.be.fulfilled;
      log(`allocateTokens gasUsed: ${tx3.receipt.gasUsed}`);
      
      (await this.token.balanceOf(investor)).should.be.bignumber.equal(this.refundClosingTokenCap);
      
      const pre = web3.eth.getBalance(wallet);
      
      increaseTimeTo(this.refundClosingTime + duration.seconds(1));
      await this.crowdsale
        .closeRefunds({ from: owner })
        .should.be.fulfilled;
      const post = web3.eth.getBalance(wallet);
      post.minus(pre).should.be.bignumber.equal(this.refundClosingTokenCap.add(value));
    });

    it("should fail forward funds to wallet when token raised is less than refund token cap", async function() {
      const pre = web3.eth.getBalance(wallet);

      increaseTimeTo(this.refundClosingTime + duration.seconds(1));
      const tx = await this.crowdsale.closeRefunds({
        from: owner
      }).should.be.rejectedWith(EVMRevert);

    });

    it("should forward funds to wallet", async function() {
      await this.crowdsale.allocateTokens(0, this.refundClosingTokenCap).should.be.fulfilled;
      const pre = web3.eth.getBalance(wallet);

      increaseTimeTo(this.refundClosingTime + duration.seconds(1));
      const tx = await this.crowdsale.closeRefunds({
        from: owner
      }).should.be.fulfilled;
      log(`closeRefunds gasUsed: ${tx.receipt.gasUsed}`);

      const post = web3.eth.getBalance(wallet);
      post.minus(pre).should.be.bignumber.equal(value);
    });
  });

  describe("enableRefunds", function() {
    beforeEach(async function() {
      increaseTimeTo(this.startTime);

      const tx = await this.crowdsale.sendTransaction({
        value,
        from: investor
      });
      log(`sendTransaction gasUsed: ${tx.receipt.gasUsed}`);
    });

    it("should fail if not called by owner", async function() {
      increaseTimeTo(this.endTime);
      await this.crowdsale
        .enableRefunds({ from: wallet })
        .should.be.rejectedWith(EVMRevert);
    });

    it("should fail if called before crowdsale endTime", async function() {
      increaseTimeTo(this.endTime - duration.seconds(1));
      await this.crowdsale
        .enableRefunds({ from: owner })
        .should.be.rejectedWith(EVMRevert);
    });

    it("should be fulfilled if everything is fine", async function() {
      increaseTimeTo(this.endTime + duration.seconds(1));
      const tx = await this.crowdsale.enableRefunds({ from: owner }).should.be
        .fulfilled;

      log(`enableRefunds gasUsed: ${tx.receipt.gasUsed}`);
    });
  });

  describe("refundContribution", function() {
    it("should fail if not called by owner", async function() {
      increaseTimeTo(this.startTime);
      const tx1 = await this.crowdsale.sendTransaction({
        value,
        from: investor
      });
      log(`sendTransaction gasUsed: ${tx1.receipt.gasUsed}`);

      increaseTimeTo(this.endTime + duration.seconds(1));
      const tx2 = await this.crowdsale.enableRefunds({
        from: owner
      }).should.be.fulfilled;
      log(`enableRefunds gasUsed: ${tx2.receipt.gasUsed}`);

      await this.crowdsale
        .refundContribution(0, {
          from: wallet
        })
        .should.be.rejectedWith(EVMRevert);
    });

    it("should fail if tokens already allocated", async function() {
      increaseTimeTo(this.startTime);
      const tx1 = await this.crowdsale.sendTransaction({
        value,
        from: investor
      });
      log(`sendTransaction gasUsed: ${tx1.receipt.gasUsed}`);

      increaseTimeTo(this.endTime + duration.seconds(1));
      const tx2 = await this.crowdsale.enableRefunds({
        from: owner
      }).should.be.fulfilled;
      log(`enableRefunds gasUsed: ${tx2.receipt.gasUsed}`);

      this.crowdsale.allocateTokens(0, value).should.be.fulfilled;
      await this.crowdsale
        .refundContribution(0, {
          from: owner
        })
        .should.be.rejectedWith(EVMRevert);
    });

    it("should refund contribution money", async function() {
      increaseTimeTo(this.startTime);
      const tx1 = await this.crowdsale.sendTransaction({
        value,
        from: investor
      });
      log(`sendTransaction gasUsed: ${tx1.receipt.gasUsed}`);

      increaseTimeTo(this.endTime + duration.seconds(1));
      const tx2 = await this.crowdsale.enableRefunds({
        from: owner
      }).should.be.fulfilled;
      log(`enableRefunds gasUsed: ${tx2.receipt.gasUsed}`);

      const pre = web3.eth.getBalance(investor);

      const tx3 = await this.crowdsale.refundContribution(0, {
        from: owner
      }).should.be.fulfilled;
      log(`refundContribution gasUsed: ${tx3.receipt.gasUsed}`);

      const post = web3.eth.getBalance(investor);
      post.minus(pre).should.be.bignumber.equal(value);
    });
  });

  describe("setRefundClosingTime", function() {
    it("should update refund closing time", async function() {
      const tx = await this.crowdsale.setRefundClosingTime(
        this.newRefundClosingTime,
        { from: owner }
      ).should.be.fulfilled;
      log(`setRefundClosingTime gasUsed: ${tx.receipt.gasUsed}`);
    });

    it("should throw when not called by owner", async function() {
      await this.crowdsale
        .setRefundClosingTime(this.newRefundClosingTime, { from: _ })
        .should.be.rejectedWith(EVMRevert);
    });

    it("should throw if new refund closing time has already passed", async function() {
      await this.crowdsale
        .setRefundClosingTime(latestTime() - duration.seconds(1), {
          from: owner
        })
        .should.be.rejectedWith(EVMRevert);
    });

    it("should throw if new refund closing time is smaller than end time", async function() {
      await this.crowdsale
        .setRefundClosingTime(this.beforeEndTime, { from: owner })
        .should.be.rejectedWith(EVMRevert);
    });
  });

  describe("setRefundClosingTokenCap", function() {
    it("should reject if refund closing Token Cap is greater than CAP", async function() {
      const tx = await this.crowdsale.setRefundClosingTokenCap(
        overCap,
        { from: owner }
      ).should.be.rejectedWith(EVMRevert);
    });


    it("should update refund closing Token Cap", async function() {
      const tx = await this.crowdsale.setRefundClosingTokenCap(
        this.newRefundClosingTokenCap,
        { from: owner }
      ).should.be.fulfilled;
      (await this.crowdsale.refundClosingTokenCap()).should.be.bignumber.equal(
        this.newRefundClosingTokenCap
      );

      log(`setRefundClosingTokenCap gasUsed: ${tx.receipt.gasUsed}`);
    });

    it("should throw when not called by owner", async function() {
      await this.crowdsale
        .setRefundClosingTokenCap(this.newRefundClosingTokenCap, { from: _ })
        .should.be.rejectedWith(EVMRevert);
    });
  });
});
