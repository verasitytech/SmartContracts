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

const TokenCapCrowdsale = artifacts.require("TokenCapCrowdsaleImpl");
const Token = artifacts.require("Token");
const TokenMock = artifacts.require("MintableTokenMock");
const Whitelisting = artifacts.require("Whitelisting");

contract("TokenCapCrowdsale", function([_, wallet]) {
  const cap = ether(300);
  const individualCap = ether(100);

  before(async function() {
    // Advance to the next block to correctly read time in the solidity "now" function interpreted by testrpc
    await advanceBlock();
  });

  beforeEach(async function() {
    this.startTime = latestTime() + duration.weeks(1);
    this.endTime = this.startTime + duration.weeks(1);

    this.token = await Token.new(_, _, new BigNumber(1000));
    this.whitelisting = await Whitelisting.new();
    this.crowdsale = await TokenCapCrowdsale.new(
      this.startTime,
      this.endTime,
      wallet,
      cap,
      individualCap,
      this.token.address,
      this.whitelisting.address
    );
    const tx = await this.token.transferOwnership(this.crowdsale.address);
    log(`transferOwnership gasused: ${tx.receipt.gasUsed}`);
  });

  describe("creating a valid crowdsale", function() {
    it("should fail with zero overall token cap", async function() {
      await TokenCapCrowdsale.new(
        this.startTime,
        this.endTime,
        wallet,
        0,
        individualCap,
        this.token.address,
        this.whitelisting.address
      ).should.be.rejectedWith(EVMRevert);
    });

    it("should fail with zero individual token cap", async function() {
      await TokenCapCrowdsale.new(
        this.startTime,
        this.endTime,
        wallet,
        cap,
        0,
        this.token.address,
        this.whitelisting.address
      ).should.be.rejectedWith(EVMRevert);
    });

    it("should fail if distributedSupply greater than token cap", async function() {
      const tokenMock = await TokenMock.new(_, cap);

      await TokenCapCrowdsale.new(
        this.startTime,
        this.endTime,
        wallet,
        cap,
        individualCap,
        tokenMock.address,
        this.whitelisting.address
      ).should.be.rejectedWith(EVMRevert);
    });

    it("should be created with proper parameters", async function() {
      (await this.crowdsale.tokenCap()).should.be.bignumber.equal(cap);
      (await this.crowdsale.individualCap()).should.be.bignumber.equal(
        individualCap
      );
      (await this.crowdsale.distributedSupply()).should.be.bignumber.equal(
        new BigNumber(0)
      );
    });
  });

  describe("hasEnded", function() {
    beforeEach(async function() {
      await increaseTimeTo(this.startTime);
    });

    it("should return false if token cap not reached", async function() {
      (await this.crowdsale.hasEnded()).should.equal(false);
    });

    it("should return true if token cap reached", async function() {
      const tx = await this.crowdsale.addTokensAndIncreaseSupply(_, cap);
      log(`gasUsed during mock: ${tx.receipt.gasUsed}`);

      (await this.crowdsale.hasEnded()).should.equal(true);
    });
  });

  describe("setIndividualCap", function() {
    it("should reset individualCap", async function() {
      const tx = await this.crowdsale.setIndividualCap(ether(10), { from: _ })
        .should.be.fulfilled;
      log(`setIndividualCap gasUsed: ${tx.receipt.gasUsed}`);

      let _individualCap = await this.crowdsale.individualCap();
      assert(_individualCap, ether(10));
    });

    it("should throw when not called by owner", async function() {
      await this.crowdsale
        .setIndividualCap(ether(10), { from: wallet })
        .should.be.rejectedWith(EVMRevert);
    });
  });

  describe("setTokenCap", function() {
    it("should reset tokenCap", async function() {
      const tx = await this.crowdsale.setTokenCap(ether(10), {
        from: _
      }).should.be.fulfilled;
      log(`setTokenCap gasUsed: ${tx.receipt.gasUsed}`);

      let _tokenCap = await this.crowdsale.tokenCap();
      assert(_tokenCap, ether(10));
    });

    it("should throw when not called by owner", async function() {
      await this.crowdsale
        .setTokenCap(ether(10), { from: wallet })
        .should.be.rejectedWith(EVMRevert);
    });
  });
});
