import latestTime from './helpers/latestTime';
import { increaseTimeTo, duration } from './helpers/increaseTime';
import log from "./helpers/logger";

const BigNumber = web3.BigNumber;

require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

const looper = require('./helpers/looper.js');
const Token = artifacts.require('Token');
const TokenVesting = artifacts.require('TokenVesting');
const Whitelisting = artifacts.require("Whitelisting");

const _maxTokenSupply = new BigNumber(5000000);

contract('TokenVesting',(accounts) => {
  const amount = new BigNumber(1);
  const numReceipients = 8;
  const amountToken = Array(numReceipients).fill(amount);
  const totalTokens = amountToken.reduce((a, b) => a + b, 0);
  let receipients = accounts.slice(2,10);
 
  beforeEach(async function () {
    this.token = await Token.new(accounts[0], accounts[0], _maxTokenSupply);
    this.whitelisting = await Whitelisting.new();
    this.tokenVesting = await TokenVesting.new(this.token.address, this.whitelisting.address);
    this.releaseTime = latestTime() + duration.years(1);
    this.newReleaseTime = latestTime() + duration.years(2);
    await this.token.distributeTokens(this.tokenVesting.address, totalTokens, { from: accounts[0] });
    await this.token.unpause({ from: accounts[0] });
    await this.whitelisting.approveInvestorsInBulk(receipients,{ from: accounts[0]}).should.be.fulfilled;
  });


  it('should throw whem not called by owner', async function () {
    const releaseTimeArr = Array(numReceipients).fill(this.releaseTime);    
    await this.tokenVesting.addVesting( receipients, amountToken, 
      releaseTimeArr,{from : accounts[1]}).should.be.rejected;
  });

  it('cannot be released before time limit', async function () {
    const releaseTimeArr = Array(numReceipients).fill(this.releaseTime);  
    let add = await this.tokenVesting.addVesting(receipients, amountToken, releaseTimeArr);
    log(`Add vesting gasUsed: ${add.receipt.gasUsed}`);
    await this.tokenVesting.claim({from :  receipients[0]}).should.be.rejected;
  });

  it('cannot be released just before time limit', async function () {
    const releaseTimeArr = Array(numReceipients).fill(this.releaseTime);  
    let add = await this.tokenVesting.addVesting(receipients, amountToken, releaseTimeArr);
    log(`Add vesting gasUsed: ${add.receipt.gasUsed}`);
    await increaseTimeTo(this.releaseTime - duration.seconds(3));
    await this.tokenVesting.claim({from :  receipients[0]}).should.be.rejected;
  });

  it('can be released just after limit', async function () {
    const releaseTimeArr = Array(numReceipients).fill(this.releaseTime);  
    let add = await this.tokenVesting.addVesting(receipients, amountToken, releaseTimeArr);
    log(`Add vesting gasUsed: ${add.receipt.gasUsed}`);   
    await increaseTimeTo(this.releaseTime + duration.seconds(1));
    const claim = await this.tokenVesting.claim({from :  receipients[0]}).should.be.fulfilled;
    log(`Claim vesting gasUsed: ${claim.receipt.gasUsed}`);
    const balance = await this.token.balanceOf(receipients[0]);
    balance.should.be.bignumber.equal(amountToken[0]);
  });

  it('can be released after time limit', async function () {
    const addone = await this.tokenVesting.addVesting( [receipients[0]], [10], [this.releaseTime]);
    log(`Add vesting gasUsed: ${addone.receipt.gasUsed}`);        
    const addsecond = await this.tokenVesting.addVesting( [receipients[0]], [35], [this.releaseTime]);
    log(`Add vesting gasUsed: ${addsecond.receipt.gasUsed}`);        
    await increaseTimeTo(this.releaseTime + duration.years(1));
    const claim = await this.tokenVesting.claim({from :  receipients[0]}).should.be.fulfilled;
    log(`Claim vesting gasUsed: ${claim.receipt.gasUsed}`);
    const balance = await this.token.balanceOf(receipients[0]);
    balance.should.be.bignumber.equal(45);
  });

  it('can be manage released when having multiple entry for same address', async function () {
    const addone = await this.tokenVesting.addVesting( [receipients[0]], [10], [this.releaseTime]);
    log(`Add vesting gasUsed: ${addone.receipt.gasUsed}`);        
    const addsecond = await this.tokenVesting.addVesting( [receipients[0]], [35], [this.newReleaseTime]);
    log(`Add vesting gasUsed: ${addsecond.receipt.gasUsed}`);        
    await increaseTimeTo(this.newReleaseTime - duration.seconds(5));
    const claim = await this.tokenVesting.claim({from :  receipients[0]}).should.be.fulfilled;
    log(`Claim vesting gasUsed: ${claim.receipt.gasUsed}`);
    const balance = await this.token.balanceOf(receipients[0]);
    balance.should.be.bignumber.equal(10);
  });

  it('cannot be released twice', async function () {
    const add = await this.tokenVesting.addVesting( [receipients[0]], [10], [this.releaseTime]);
    log(`Add vesting gasUsed: ${add.receipt.gasUsed}`);        
    await increaseTimeTo(this.releaseTime + duration.years(1));
    const firstclaim = await this.tokenVesting.claim({from :  receipients[0]}).should.be.fulfilled;
    log(`Claim vesting gasUsed: ${firstclaim.receipt.gasUsed}`);
    const finalclaim = await this.tokenVesting.claim({from :  receipients[0]}).should.be.rejected;
    const balance = await this.token.balanceOf(receipients[0]);
    balance.should.be.bignumber.equal(10);
  });

  it('if not whitelisted then transaction should get rejected', async function () {
    const add = await this.tokenVesting.addVesting( [accounts[1]], [10], [this.releaseTime]);
    log(`Add vesting gasUsed: ${add.receipt.gasUsed}`);        
    await increaseTimeTo(this.releaseTime + duration.years(1));
    const firstclaim = await this.tokenVesting.claim(accounts[1]).should.be.rejected;
  });
});
