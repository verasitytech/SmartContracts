import { advanceBlock } from "./helpers/advanceToBlock";
import chai from "chai";
import VMExceptionRevert from "./helpers/VMExceptionRevert";
import { increaseTimeTo, duration } from "./helpers/increaseTime";
import latestTime from "./helpers/latestTime";
import log from "./helpers/logger";

const UpgradeableToken = artifacts.require("UpgradeableTokenMock");
const TokenUpgrader = artifacts.require("TokenUpgraderMock");

const BigNumber = web3.BigNumber;
const expect = chai.expect;
const should = chai
.use(require("chai-as-promised"))
.use(require("chai-bignumber")(BigNumber))
.should();

contract("UpgradeableToken", function([owner, tokenHolder, upgradeMaster]) {
  const initialBalance = new BigNumber(1000);
  const tokensUpgraded = new BigNumber(400);

  before(async function() {
    //Advance to the next block to correctly read time in the solidity "now" function interpreted by testrpc
    await advanceBlock();
  });

  beforeEach(async function() {
    this.token = await UpgradeableToken.new(
      upgradeMaster,
      tokenHolder,
      initialBalance
    );
    this.tokenUpgrader = await TokenUpgrader.new(this.token.address);
  });

  it("should be created with proper parameters", async function() {
    (await this.token.upgradeMaster()).should.equal(upgradeMaster);
    (await this.token.tokenUpgrader()).should.equal(
      "0x0000000000000000000000000000000000000000"
    );
    (await this.token.totalUpgraded()).should.be.bignumber.equal(
      new BigNumber(0)
    );
  });

  describe("TokenUpgrader", function() {
    it("should tell that it is a token upgrader", async function() {
      (await this.tokenUpgrader.isTokenUpgrader()).should.equal(true);
    });

    it("should have a function upgradeFrom", async function() {
      should.exist(await this.tokenUpgrader.upgradeFrom);
    });
  });

  describe("allowUpgrades", function() {
    it("should be callable by upgrade master", async function() {
      const transaction = await this.token.allowUpgrades({
        from: upgradeMaster
      }).should.be.fulfilled;
      log(`allowUpgrades gasUsed: ${transaction.receipt.gasUsed}`);

      (await this.token.canUpgrade()).should.equal(true);
    });

    it("should throw whem not called by upgrade master", async function() {
      await this.token
        .allowUpgrades({ from: owner })
        .should.be.rejectedWith(VMExceptionRevert);
    });
  });

  describe("rejectUpgrades", function() {
    it("should be callable by upgrade master", async function() {
      const transaction = await this.token.allowUpgrades({
        from: upgradeMaster
      }).should.be.fulfilled;
      log(`allowUpgrades gasUsed: ${transaction.receipt.gasUsed}`);

      (await this.token.canUpgrade()).should.equal(true);
    });

    it("should be call rejectUpgrade if callable by upgrade master", async function() {
      const transaction = await this.token.rejectUpgrades({
        from: upgradeMaster
      }).should.be.fulfilled;
      log(`allowUpgrades gasUsed: ${transaction.receipt.gasUsed}`);

      (await this.token.canUpgrade()).should.equal(false);
    });

    it("should throw whem not called by upgrade master", async function() {
      await this.token
        .allowUpgrades({ from: owner })
        .should.be.rejectedWith(VMExceptionRevert);
    });

    it("should not allow when totalSupply is greater than 0", async function() {
      const initialSupply = await this.token.totalSupply();
      
      const transaction = await this.token.allowUpgrades({
        from: upgradeMaster
      });
      log(`allowUpgrades gasused: ${transaction.receipt.gasUsed}`);

      const transaction1 = await this.token.setTokenUpgrader(
        this.tokenUpgrader.address,
        { from: upgradeMaster }
      ).should.be.fulfilled;
      log(`setTokenUpgrader gasUsed: ${transaction1.receipt.gasUsed}`);

      const transaction2 = await this.token.upgrade(tokensUpgraded, {
        from: tokenHolder
      }).should.be.fulfilled;
      log(`upgrade gasUsed: ${transaction2.receipt.gasUsed}`);

      await this.token
        .allowUpgrades({ from: owner })
        .should.be.rejectedWith(VMExceptionRevert);
    });
  });

  describe("canUpgrade", function() {
    it("should return false initially", async function() {
      (await this.token.canUpgrade()).should.equal(false);
    });

    it("should return true if upgrades are allowed", async function() {
      const transaction = await this.token.allowUpgrades({
        from: upgradeMaster
      });
      log(`allowUpgrades gasused: ${transaction.receipt.gasUsed}`);

      (await this.token.canUpgrade()).should.equal(true);
    });
  });

  describe("setTokenUpgrader", function() {
    it("should be callable by upgradeMaster", async function() {
      const transaction1 = await this.token.allowUpgrades({
        from: upgradeMaster
      });
      log(`allowUpgrades gasused: ${transaction1.receipt.gasUsed}`);

      const transaction2 = await this.token.setTokenUpgrader(
        this.tokenUpgrader.address,
        { from: upgradeMaster }
      ).should.be.fulfilled;
      log(`setTokenUpgrader gasUsed: ${transaction2.receipt.gasUsed}`);
    });

    it("should set tokenUpgrader", async function() {
      const transaction1 = await this.token.allowUpgrades({
        from: upgradeMaster
      });
      log(`allowUpgrades gasused: ${transaction1.receipt.gasUsed}`);

      const transaction2 = await this.token.setTokenUpgrader(
        this.tokenUpgrader.address,
        { from: upgradeMaster }
      ).should.be.fulfilled;
      log(`setTokenUpgrader gasUsed: ${transaction2.receipt.gasUsed}`);

      (await this.token.tokenUpgrader()).should.be.equal(
        this.tokenUpgrader.address
      );
    });

    it("should log event TokenUpgraderIsSet", async function() {
      const transaction1 = await this.token.allowUpgrades({
        from: upgradeMaster
      });
      log(`allowUpgrades gasused: ${transaction1.receipt.gasUsed}`);

      const transaction2 = await this.token.setTokenUpgrader(
        this.tokenUpgrader.address,
        { from: upgradeMaster }
      ).should.be.fulfilled;
      log(`setTokenUpgrader gasUsed: ${transaction2.receipt.gasUsed}`);

      const event = transaction2.logs.find(
        e => e.event === "TokenUpgraderIsSet"
      );
      should.exist(event);
      event.args._newToken.should.equal(this.tokenUpgrader.address);
    });

    it("should not be callable by non-upgradeMaster", async function() {
      const transaction = await this.token.allowUpgrades({
        from: upgradeMaster
      });
      log(`allowUpgrades gasused: ${transaction.receipt.gasUsed}`);

      await this.token
        .setTokenUpgrader(this.tokenUpgrader.address, { from: tokenHolder })
        .should.be.rejectedWith(VMExceptionRevert);
    });

    it("should throw if input address is blank", async function() {
      const transaction = await this.token.allowUpgrades({
        from: upgradeMaster
      });
      log(`allowUpgrades gasused: ${transaction.receipt.gasUsed}`);

      await this.token
        .setTokenUpgrader("0x0", { from: upgradeMaster })
        .should.be.rejectedWith(VMExceptionRevert);
    });

    it("should throw if in upgrading state", async function() {
      const transaction1 = await this.token.allowUpgrades({
        from: upgradeMaster
      });
      log(`allowUpgrades gasused: ${transaction1.receipt.gasUsed}`);

      const transaction2 = await this.token.setTokenUpgrader(
        this.tokenUpgrader.address,
        { from: upgradeMaster }
      ).should.be.fulfilled;
      log(`setTokenUpgrader gasUsed: ${transaction2.receipt.gasUsed}`);

      const transaction3 = await this.token.upgrade(tokensUpgraded, {
        from: tokenHolder
      }).should.be.fulfilled;
      log(`upgrade gasUsed: ${transaction3.receipt.gasUsed}`);

      await this.token
        .setTokenUpgrader(this.tokenUpgrader.address, { from: upgradeMaster })
        .should.be.rejectedWith(VMExceptionRevert);
    });

    it("should be fed with a proper tokenUpgrader address", async function() {
      await this.token
        .setTokenUpgrader(tokenHolder, { from: upgradeMaster })
        .should.be.rejectedWith(VMExceptionRevert);
    });

    it("should throw if upgrades not allowed", async function() {
      await this.token
        .setTokenUpgrader(this.tokenUpgrader.address, { from: upgradeMaster })
        .should.be.rejectedWith(VMExceptionRevert);
    });
  });

  describe("upgrade", function() {
    it("should throw if token upgrader is not set", async function() {
      const transaction = await this.token.allowUpgrades({
        from: upgradeMaster
      });
      log(`allowUpgrades gasused: ${transaction.receipt.gasUsed}`);

      await this.token
        .upgrade(tokensUpgraded, { from: tokenHolder })
        .should.be.rejectedWith(VMExceptionRevert);
    });

    it("should throw if input token value is zero", async function() {
      const transaction = await this.token.allowUpgrades({
        from: upgradeMaster
      });
      log(`allowUpgrades gasused: ${transaction.receipt.gasUsed}`);

      await this.token
        .upgrade(new BigNumber(0), { from: tokenHolder })
        .should.be.rejectedWith(VMExceptionRevert);
    });

    it("should reduce previous version token balance of tokenHolder", async function() {
      const initialBalance = await this.token.balanceOf(tokenHolder);

      const transaction = await this.token.allowUpgrades({
        from: upgradeMaster
      });
      log(`allowUpgrades gasused: ${transaction.receipt.gasUsed}`);

      const transaction1 = await this.token.setTokenUpgrader(
        this.tokenUpgrader.address,
        { from: upgradeMaster }
      ).should.be.fulfilled;
      log(`setTokenUpgrader gasUsed: ${transaction1.receipt.gasUsed}`);

      const transaction2 = await this.token.upgrade(tokensUpgraded, {
        from: tokenHolder
      }).should.be.fulfilled;
      log(`upgrade gasUsed: ${transaction2.receipt.gasUsed}`);
      const finalBalance = await this.token.balanceOf(tokenHolder);
      finalBalance.should.be.bignumber.equal(
        initialBalance.sub(tokensUpgraded)
      );
    });

    it("should reduce totalSupply of previous version token", async function() {
      const initialSupply = await this.token.totalSupply();

      const transaction = await this.token.allowUpgrades({
        from: upgradeMaster
      });
      log(`allowUpgrades gasused: ${transaction.receipt.gasUsed}`);

      const transaction1 = await this.token.setTokenUpgrader(
        this.tokenUpgrader.address,
        { from: upgradeMaster }
      ).should.be.fulfilled;
      log(`setTokenUpgrader gasUsed: ${transaction1.receipt.gasUsed}`);

      const transaction2 = await this.token.upgrade(tokensUpgraded, {
        from: tokenHolder
      }).should.be.fulfilled;
      log(`upgrade gasUsed: ${transaction2.receipt.gasUsed}`);
      const finalSupply = await this.token.totalSupply();
      finalSupply.should.be.bignumber.equal(initialSupply.sub(tokensUpgraded));
    });

    it("should increase totalUpgraded", async function() {
      const initialSupply = await this.token.totalUpgraded();

      const transaction = await this.token.allowUpgrades({
        from: upgradeMaster
      });
      log(`allowUpgrades gasused: ${transaction.receipt.gasUsed}`);

      const transaction1 = await this.token.setTokenUpgrader(
        this.tokenUpgrader.address,
        { from: upgradeMaster }
      ).should.be.fulfilled;
      log(`setTokenUpgrader gasUsed: ${transaction1.receipt.gasUsed}`);

      const transaction2 = await this.token.upgrade(tokensUpgraded, {
        from: tokenHolder
      }).should.be.fulfilled;
      log(`upgrade gasUsed: ${transaction2.receipt.gasUsed}`);
      const finalSupply = await this.token.totalUpgraded();
      finalSupply.should.be.bignumber.equal(initialSupply.add(tokensUpgraded));
    });

    it("should log event Upgrade", async function() {
      const transaction = await this.token.allowUpgrades({
        from: upgradeMaster
      });
      log(`allowUpgrades gasused: ${transaction.receipt.gasUsed}`);

      const transaction1 = await this.token.setTokenUpgrader(
        this.tokenUpgrader.address,
        { from: upgradeMaster }
      ).should.be.fulfilled;
      log(`setTokenUpgrader gasUsed: ${transaction1.receipt.gasUsed}`);

      const transaction2 = await this.token.upgrade(tokensUpgraded, {
        from: tokenHolder
      }).should.be.fulfilled;
      log(`upgrade gasUsed: ${transaction2.receipt.gasUsed}`);

      const event = transaction2.logs.find(e => e.event === "Upgrade");
      should.exist(event);
      event.args._from.should.equal(tokenHolder);
      event.args._to.should.equal(this.tokenUpgrader.address);
      event.args._value.should.be.bignumber.equal(tokensUpgraded);
    });
  });

  describe("getUpgradeState", function() {
    it("should return NotAllowed state", async function() {
      (await this.token.getUpgradeState()).should.be.bignumber.equal(
        new BigNumber(0)
      );
    });

    it("should return Waiting state", async function() {
      const transaction = await this.token.allowUpgrades({
        from: upgradeMaster
      });
      log(`allowUpgrades gasused: ${transaction.receipt.gasUsed}`);

      (await this.token.getUpgradeState()).should.be.bignumber.equal(
        new BigNumber(1)
      );
    });

    it("should return ReadyToUpgrade state", async function() {
      const transaction1 = await this.token.allowUpgrades({
        from: upgradeMaster
      });
      log(`allowUpgrades gasused: ${transaction1.receipt.gasUsed}`);

      const transaction2 = await this.token.setTokenUpgrader(
        this.tokenUpgrader.address,
        { from: upgradeMaster }
      ).should.be.fulfilled;
      log(`setTokenUpgrader gasUsed: ${transaction2.receipt.gasUsed}`);

      (await this.token.getUpgradeState()).should.be.bignumber.equal(
        new BigNumber(2)
      );
    });

    it("should return Upgrading state", async function() {
      const transaction1 = await this.token.allowUpgrades({
        from: upgradeMaster
      });
      log(`allowUpgrades gasused: ${transaction1.receipt.gasUsed}`);

      const transaction2 = await this.token.setTokenUpgrader(
        this.tokenUpgrader.address,
        { from: upgradeMaster }
      ).should.be.fulfilled;
      log(`setTokenUpgrader gasUsed: ${transaction2.receipt.gasUsed}`);

      const transaction3 = await this.token.upgrade(tokensUpgraded, {
        from: tokenHolder
      }).should.be.fulfilled;
      log(`upgrade gasUsed: ${transaction3.receipt.gasUsed}`);

      (await this.token.getUpgradeState()).should.be.bignumber.equal(
        new BigNumber(3)
      );
    });
  });

  describe("setUpgradeMaster", function() {
    it("should be callable by upgrade master", async function() {
      const transaction = await this.token.setUpgradeMaster(tokenHolder, {
        from: upgradeMaster
      }).should.be.fulfilled;
      log(`setUpgradeMaster gasUsed: ${transaction.receipt.gasUsed}`);

      (await this.token.upgradeMaster()).should.equal(tokenHolder);
    });

    it("should throw whem not called by upgrade master", async function() {
      await this.token
        .setUpgradeMaster(tokenHolder, { from: owner })
        .should.be.rejectedWith(VMExceptionRevert);
    });
  });
});
