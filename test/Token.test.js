import log from "./helpers/logger";
import EVMRevert from "./helpers/VMExceptionRevert";
import expectThrow from "./helpers/expectThrow";

const BigNumber = web3.BigNumber;
const should = require("chai")
  .use(require("chai-as-promised"))
  .use(require("chai-bignumber")(BigNumber))
  .should();

const expect = require('chai').expect;

const Token = artifacts.require("Token");

contract("Token", accounts => {
  let token = null;

  const _name = "VERA";
  const _symbol = "VRA";
  const termsAndCondition = "THE DIGITAL TOKENS REPRESENTED BY THIS BLOCKCHAIN LEDGER RECORD HAVE BEEN ACQUIRED FOR INVESTMENT UNDER CERTAIN SECURITIES EXEMPTIONS AND HAVE NOT BEEN REGISTERED UNDER THE U.S. SECURITIES ACT OF 1933, AS AMENDED (THE 'ACT'). UNTIL THE EXPIRATION OF THIS RESTRICTIVE LEGEND, SUCH TOKENS MAY NOT BE OFFERED, SOLD, ASSIGNED, TRANSFERRED, PLEDGED, ENCUMBERED OR OTHERWISE DISPOSED OF TO ANOTHER U.S. PERSON IN THE ABSENCE OF A REGISTRATION OR AN EXEMPTION THEREFROM UNDER THE ACT AND ANY APPLICABLE U.S. STATE SECURITIES LAWS. THE APPLICABLE RESTRICTED PERIOD (PER RULE 144 PROMULGATED UNDER THE ACT) IS ONE YEAR FROM THE ISSUANCE OF THE TOKENS. ANY PARTIES, INCLUDING EXCHANGES AND THE ORIGINAL ACQUIRERS OF THESE TOKENS, MAY BE HELD LIABLE FOR ANY UNAUTHORIZED TRANSFERS OR SALES OF THESE TOKENS DURING THE RESTRICTIVE PERIOD, AND ANY HOLDER OR ACQUIRER OF THESE TOKENS AGREES, AS A CONDITION OF SUCH HOLDING, THAT THE TOKEN GENERATOR/ISSUER (THE 'COMPANY') SHALL BE FREE OF ANY LIABILITY IN CONNECTION WITH SUCH UNAUTHORIZED TRANSACTIONS. REQUESTS TO TRANSFER THESE TOKENS DURING THE RESTRICTIVE PERIOD WITH LEGAL JUSTIFICATION MAY BE MADE BY WRITTEN REQUEST OF THE HOLDER OF THESE TOKENS TO THE COMPANY, WITH NO GUARANTEE OF APPROVAL.";
  const _decimals = 18;
  const _maxTokenSupply = new BigNumber(12491500000);
  const distributeTokens =  new BigNumber(100);

  beforeEach(async function() {
    token = await Token.new(accounts[0], accounts[1], _maxTokenSupply);
  });

  it("has name VERA", async function() {
    const name = await token.name();
    name.should.be.equal(_name);
  });
  
  it("has symbol VRA", async function() {
    const symbol = await token.symbol();
    symbol.should.be.equal(_symbol);
  });

  it("has Terms And condition", async function() {
    const terms = await token.TERMS_AND_CONDITION();
    terms.should.be.equal(termsAndCondition);
  });

  it("has amount of decimals 18", async function() {
    const decimals = await token.decimals();
    decimals.should.be.bignumber.equal(_decimals);
  });

  it("has MAX_TOKEN_SUPPLY of 5000000 tokens", async function() {
    const MAX_TOKEN_SUPPLY = await token.maxTokenSupply();
    MAX_TOKEN_SUPPLY.should.be.bignumber.equal(_maxTokenSupply.mul(10 ** 18));
  });

  it("has token transfered paused", async function() {
    const tokenPaused = await token.paused();
    tokenPaused.should.be.equal(true);
  });

  describe("setTokenInformation", function() {
    it("should be able to update token name and symbol", async function() {
      const newName = "VERA";
      const newSymbol = "VER";

      const tx = await token.setTokenInformation(newName, newSymbol).should.be
        .fulfilled;
      log(`setTokenInformation gasUsed: ${tx.receipt.gasUsed}`);

      let _newName = await token.name();
      assert(_newName, newName);

      let _newSymbol = await token.symbol();
      assert(_newSymbol, newSymbol);

    });

    it("should throw when not called by owner", async function() {
      const newName = "VERA";
      const newSymbol = "VER";

      await token
        .setTokenInformation(newName, newSymbol, { from: accounts[2] })
        .should.be.rejectedWith(EVMRevert);
    });
  });

  describe("distributeTokens", function() {
    it('owner should be able to distributeTokens tokens', async function () {
      let initialVraWalletBal = await token.balanceOf(accounts[0]);      
      let initialInvesterBal = await token.balanceOf(accounts[5]);      
      const result = await token.distributeTokens(accounts[5], distributeTokens);
      log(`distribute gasUsed: ${result.receipt.gasUsed}`);

      assert.equal(result.logs[0].event, "Distribute");
      assert.equal(result.logs[0].args.to.valueOf(), accounts[5]);
      assert.equal(result.logs[0].args.amount.valueOf(), distributeTokens);
      assert.equal(result.logs[1].event, "Transfer");
      assert.equal(result.logs[1].args.from.valueOf(), 0x0);

      let finalVraWalletBal = await token.balanceOf(accounts[0]);
      let finalInvesterBal = await token.balanceOf(accounts[5]);
      initialVraWalletBal.sub(finalVraWalletBal).should.be.bignumber.equal(distributeTokens);
      finalInvesterBal.sub(initialInvesterBal).should.be.bignumber.equal(distributeTokens);
      let distributedToken = await token.getDistributedToken();
      distributedToken.should.be.bignumber.equal(distributeTokens);
    });

    it('cannot distribute more tokens than max supply', async function () {
      const MAX_TOKEN_SUPPLY = await token.maxTokenSupply();
      const value = MAX_TOKEN_SUPPLY.add(distributeTokens);
      await expectThrow (token.distributeTokens(accounts[5], value, { from: accounts[0] }));
    });

    it('cannot distributed by other than owner', async function () {
      await token.distributeTokens(accounts[5], distributeTokens, { from: accounts[2] })
        .should.be.rejectedWith(EVMRevert);
    });
  });

  describe("BurnToken", function() {
    it('owner should be able to burn tokens', async function () {
      const initialBalance = await token.balanceOf(accounts[0]);
      const maxTokenSupply = await token.maxTokenSupply();

      const { logs } = await token.burn(new BigNumber(1), { from: accounts[0] });

      const finalBalance = await token.balanceOf(accounts[0]);
      const currentSupply = await token.totalSupply();

      initialBalance.should.be.bignumber.greaterThan(finalBalance);

      maxTokenSupply.should.be.bignumber.greaterThan(currentSupply); 
      
      const event = logs.find(e => e.event === 'Burn');
      expect(event).to.exist;
    });
    it('cannot burn more tokens than your balance', async function () {
      await token.burn(2000, { from: accounts[1] })
        .should.be.rejectedWith(EVMRevert);
    });
  });
});
