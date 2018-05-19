import ether from "./helpers/ether";
import EVMRevert from "./helpers/VMExceptionRevert";
import log from "./helpers/logger";

const BigNumber = web3.BigNumber;

require("chai")
  .use(require("chai-as-promised"))
  .use(require("chai-bignumber")(BigNumber))
  .should();

const RefundVault = artifacts.require("RefundVault");

contract("RefundVault", function([_, owner, wallet, investor]) {
  const value = ether(2);

  beforeEach(async function() {
    this.vault = await RefundVault.new(wallet, { from: owner });
  });

  it("should accept contributions", async function() {
    const tx = await this.vault.deposit({
      value,
      from: owner
    }).should.be.fulfilled;
    log(`deposit gasUsed: ${tx.receipt.gasused}`);
  });

  it("should not refund contribution during active state", async function() {
    const tx = await this.vault.deposit({ value, from: owner });
    log(`deposit gasUsed: ${tx.receipt.gasused}`);
    await this.vault.refund(investor, value).should.be.rejectedWith(EVMRevert);
  });

  it("only owner can enter refund mode", async function() {
    await this.vault
      .enableRefunds({ from: _ })
      .should.be.rejectedWith(EVMRevert);
    const tx = await this.vault.enableRefunds({ from: owner }).should.be.fulfilled;
    log(`enableRefunds gasUsed: ${tx.receipt.gasused}`);
  });

  it("should refund contribution after entering refund mode", async function() {
    const tx1 = await this.vault.deposit({ value, from: owner });
    log(`deposit gasUsed: ${tx1.receipt.gasused}`);
    const tx2 = await this.vault.enableRefunds({ from: owner });
    log(`enableRefunds gasUsed: ${tx2.receipt.gasused}`);

    const pre = web3.eth.getBalance(investor);
    const tx3 = await this.vault.refund(investor, value,{ from: owner });
    log(`refund gasUsed: ${tx3.receipt.gasused}`);
    const post = web3.eth.getBalance(investor);

    post.minus(pre).should.be.bignumber.equal(value);
  });

  it("only owner can close", async function() {
    await this.vault.close({ from: _ }).should.be.rejectedWith(EVMRevert);
    const tx = await this.vault.close({ from: owner }).should.be.fulfilled;
    log(`close gasUsed: ${tx.receipt.gasused}`);
  });

  it("should forward funds to wallet after closing", async function() {
    const tx1 = await this.vault.deposit({ value, from: owner });
    log(`deposit gasUsed: ${tx1.receipt.gasused}`);

    const pre = web3.eth.getBalance(wallet);
    const tx2 = await this.vault.close({ from: owner });
    log(`close gasUsed: ${tx2.receipt.gasused}`);
    const post = web3.eth.getBalance(wallet);

    post.minus(pre).should.be.bignumber.equal(value);
  });
});
