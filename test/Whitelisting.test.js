import { advanceBlock } from "./helpers/advanceToBlock";
import ether from "./helpers/ether";
import log from "./helpers/logger";
import VMExceptionRevert from "./helpers/VMExceptionRevert";

const BigNumber = web3.BigNumber;
const should = require("chai")
  .use(require("chai-as-promised"))
  .use(require("chai-bignumber")(BigNumber))
  .should();

const Whitelisting = artifacts.require("Whitelisting");

contract("Whitelisting", function([
  owner,
  investor1,
  investor2,
  investor3,
  investor4,
  investor5,
  investor6,
  investor7,
  investor8,
  investor9
]) {
  before(async function() {
    this.whitelisting = await Whitelisting.new();

    advanceBlock();
  });

  it("should reject incomming payments", async function() {
    const value = ether(1);
    await this.whitelisting
      .send(value)
      .should.be.rejectedWith(VMExceptionRevert);
  });

  it("should be false by default for investors mapping", async function() {
    (await this.whitelisting.isInvestorApproved(owner)).should.be.equal(false);
    (await this.whitelisting.isInvestorApproved(investor1)).should.be.equal(false);
    (await this.whitelisting.isInvestorApproved(investor2)).should.be.equal(false);
  });

  describe("approveInvestor", function() {
    it("should be able to add whitelisted addresses", async function() {
      const tx = await this.whitelisting.approveInvestor(investor1, {
        from: owner
      }).should.be.fulfilled;
      log(`approveInvestor gasUsed: ${tx.receipt.gasUsed}`);

      (await this.whitelisting.isInvestorApproved(investor1)).should.be.equal(true);
    });

    it("should only be accessible to owner", async function() {
      await this.whitelisting
        .approveInvestor(investor1, {
          from: investor1
        })
        .should.be.rejectedWith(VMExceptionRevert);

      const tx = await this.whitelisting.approveInvestor(investor1, {
        from: owner
      }).should.be.fulfilled;
      log(`approveInvestor gasUsed: ${tx.receipt.gasUsed}`);
    });

    it("should log events", async function() {
      const tx = await this.whitelisting.approveInvestor(investor1, {
        from: owner
      });
      log(`approveInvestor gasUsed: ${tx.receipt.gasUsed}`);

      const event = tx.logs.find(e => e.event === "Approved");

      should.exist(event);
      event.args.investor.should.equal(investor1);
    });
  });

  describe("isInvestorApproved", function() {
    it("should be able to check if an address is whitelisted", async function() {
      const tx = await this.whitelisting.approveInvestor(investor1, {
        from: owner
      }).should.be.fulfilled;
      log(`approveInvestor gasUsed: ${tx.receipt.gasUsed}`);

      (await this.whitelisting.isInvestorApproved(investor1)).should.be.equal(
        true
      );
    });
  });

  describe("approveInvestorsInBulk", function() {
    it("should be able to add whitelisted addresses in bulk", async function() {
      const tx = await this.whitelisting.approveInvestorsInBulk(
        [
          investor1,
          investor2,
          investor3,
          investor4,
          investor5,
          investor6,
          investor7,
          investor8,
          investor9
        ],
        {
          from: owner
        }
      ).should.be.fulfilled;
      log(
        `approveInvestorsInBulk (9 investors) gasUsed: ${tx.receipt.gasUsed}`
      );

      (await this.whitelisting.isInvestorApproved(investor1)).should.be.equal(true);
      (await this.whitelisting.isInvestorApproved(investor2)).should.be.equal(true);
      (await this.whitelisting.isInvestorApproved(investor3)).should.be.equal(true);
      (await this.whitelisting.isInvestorApproved(investor4)).should.be.equal(true);
      (await this.whitelisting.isInvestorApproved(investor5)).should.be.equal(true);
      (await this.whitelisting.isInvestorApproved(investor6)).should.be.equal(true);
      (await this.whitelisting.isInvestorApproved(investor7)).should.be.equal(true);
      (await this.whitelisting.isInvestorApproved(investor8)).should.be.equal(true);
      (await this.whitelisting.isInvestorApproved(investor9)).should.be.equal(true);
    });

    it("should only be accessible to owner", async function() {
      const tx = await this.whitelisting.approveInvestorsInBulk(
        [investor1, investor2, investor3, investor4, investor5],
        {
          from: owner
        }
      ).should.be.fulfilled;
      log(
        `approveInvestorsInBulk (5 investors) gasUsed: ${tx.receipt.gasUsed}`
      );

      await this.whitelisting
        .approveInvestorsInBulk(
          [investor1, investor2, investor3, investor4, investor5],
          {
            from: investor2
          }
        )
        .should.be.rejectedWith(VMExceptionRevert);
    });

    it("should log events", async function() {
      const tx = await this.whitelisting.approveInvestorsInBulk(
        [investor1, investor2, investor3],
        {
          from: owner
        }
      ).should.be.fulfilled;
      log(
        `approveInvestorsInBulk (3 investors) gasUsed: ${tx.receipt.gasUsed}`
      );

      const event1 = tx.logs.find(
        e => e.event === "Approved" && e.logIndex === 0
      );
      const event2 = tx.logs.find(
        e => e.event === "Approved" && e.logIndex === 1
      );
      const event3 = tx.logs.find(
        e => e.event === "Approved" && e.logIndex === 2
      );

      should.exist(event1);
      should.exist(event2);
      should.exist(event3);

      event1.args.investor.should.equal(investor1);
      event2.args.investor.should.equal(investor2);
      event3.args.investor.should.equal(investor3);
    });
  });

  describe("disapproveInvestor", function() {
    it("should be able to remove whitelisted addresses", async function() {
      const tx1 = await this.whitelisting.approveInvestor(investor1, {
        from: owner
      }).should.be.fulfilled;
      log(`approveInvestor gasUsed: ${tx1.receipt.gasUsed}`);

      (await this.whitelisting.isInvestorApproved(investor1)).should.be.equal(true);

      const tx2 = await this.whitelisting.disapproveInvestor(investor1, {
        from: owner
      }).should.be.fulfilled;
      log(`disapproveInvestor gasUsed: ${tx2.receipt.gasUsed}`);

      (await this.whitelisting.isInvestorApproved(investor1)).should.be.equal(false);
    });

    it("should only be accessible to owner", async function() {
      const tx1 = await this.whitelisting.approveInvestor(investor1, {
        from: owner
      }).should.be.fulfilled;
      log(`approveInvestor gasUsed: ${tx1.receipt.gasUsed}`);

      (await this.whitelisting.isInvestorApproved(investor1)).should.be.equal(true);

      await this.whitelisting
        .disapproveInvestor(investor1, {
          from: investor1
        })
        .should.be.rejectedWith(VMExceptionRevert);

      (await this.whitelisting.isInvestorApproved(investor1)).should.be.equal(true);

      const tx2 = await this.whitelisting.disapproveInvestor(investor1, {
        from: owner
      }).should.be.fulfilled;
      log(`disapproveInvestor gasUsed: ${tx2.receipt.gasUsed}`);

      (await this.whitelisting.isInvestorApproved(investor1)).should.be.equal(false);
    });

    it("should log events", async function() {
      const tx1 = await this.whitelisting.approveInvestor(investor1, {
        from: owner
      }).should.be.fulfilled;
      log(`approveInvestor gasUsed: ${tx1.receipt.gasUsed}`);

      (await this.whitelisting.isInvestorApproved(investor1)).should.be.equal(true);

      const tx2 = await this.whitelisting.disapproveInvestor(investor1, {
        from: owner
      }).should.be.fulfilled;
      log(`disapproveInvestor gasUsed: ${tx2.receipt.gasUsed}`);

      (await this.whitelisting.isInvestorApproved(investor1)).should.be.equal(false);

      const event = tx2.logs.find(e => e.event === "Disapproved");

      should.exist(event);
      event.args.investor.should.equal(investor1);
    });
  });

  describe("disapproveInvestorsInBulk", function() {
    it("should be able to remove whitelisted addresses in bulk", async function() {
      const tx1 = await this.whitelisting.approveInvestorsInBulk(
        [
          investor1,
          investor2,
          investor3,
          investor4,
          investor5,
          investor6,
          investor7
        ],
        {
          from: owner
        }
      ).should.be.fulfilled;
      log(
        `approveInvestorsInBulk (7 investors) gasUsed: ${tx1.receipt.gasUsed}`
      );

      (await this.whitelisting.isInvestorApproved(investor1)).should.be.equal(true);
      (await this.whitelisting.isInvestorApproved(investor2)).should.be.equal(true);
      (await this.whitelisting.isInvestorApproved(investor3)).should.be.equal(true);
      (await this.whitelisting.isInvestorApproved(investor4)).should.be.equal(true);
      (await this.whitelisting.isInvestorApproved(investor5)).should.be.equal(true);
      (await this.whitelisting.isInvestorApproved(investor6)).should.be.equal(true);
      (await this.whitelisting.isInvestorApproved(investor7)).should.be.equal(true);

      const tx2 = await this.whitelisting.disapproveInvestorsInBulk(
        [
          investor1,
          investor2,
          investor3,
          investor4,
          investor5,
          investor6,
          investor7
        ],
        {
          from: owner
        }
      ).should.be.fulfilled;
      log(
        `disapproveInvestorsInBulk (7 investors) gasUsed: ${
          tx2.receipt.gasUsed
        }`
      );

      (await this.whitelisting.isInvestorApproved(investor1)).should.be.equal(false);
      (await this.whitelisting.isInvestorApproved(investor2)).should.be.equal(false);
      (await this.whitelisting.isInvestorApproved(investor3)).should.be.equal(false);
      (await this.whitelisting.isInvestorApproved(investor4)).should.be.equal(false);
      (await this.whitelisting.isInvestorApproved(investor5)).should.be.equal(false);
      (await this.whitelisting.isInvestorApproved(investor6)).should.be.equal(false);
      (await this.whitelisting.isInvestorApproved(investor7)).should.be.equal(false);
    });

    it("should only be accessible to owner", async function() {
      const tx1 = await this.whitelisting.approveInvestorsInBulk(
        [investor1, investor2, investor3, investor4],
        {
          from: owner
        }
      ).should.be.fulfilled;
      log(
        `approveInvestorsInBulk (4 investors) gasUsed: ${tx1.receipt.gasUsed}`
      );

      (await this.whitelisting.isInvestorApproved(investor1)).should.be.equal(true);
      (await this.whitelisting.isInvestorApproved(investor2)).should.be.equal(true);
      (await this.whitelisting.isInvestorApproved(investor3)).should.be.equal(true);
      (await this.whitelisting.isInvestorApproved(investor4)).should.be.equal(true);

      await this.whitelisting
        .disapproveInvestorsInBulk(
          [investor1, investor2, investor3, investor4],
          {
            from: investor6
          }
        )
        .should.be.rejectedWith(VMExceptionRevert);

      (await this.whitelisting.isInvestorApproved(investor1)).should.be.equal(true);
      (await this.whitelisting.isInvestorApproved(investor2)).should.be.equal(true);
      (await this.whitelisting.isInvestorApproved(investor3)).should.be.equal(true);
      (await this.whitelisting.isInvestorApproved(investor4)).should.be.equal(true);

      const tx2 = await this.whitelisting.disapproveInvestorsInBulk(
        [investor1, investor2, investor3, investor4],
        {
          from: owner
        }
      ).should.be.fulfilled;
      log(
        `disapproveInvestorsInBulk (4 investors) gasUsed: ${
          tx2.receipt.gasUsed
        }`
      );

      (await this.whitelisting.isInvestorApproved(investor1)).should.be.equal(false);
      (await this.whitelisting.isInvestorApproved(investor2)).should.be.equal(false);
      (await this.whitelisting.isInvestorApproved(investor3)).should.be.equal(false);
      (await this.whitelisting.isInvestorApproved(investor4)).should.be.equal(false);
    });

    it("should log events", async function() {
      const tx1 = await this.whitelisting.approveInvestorsInBulk(
        [investor1, investor2, investor3],
        {
          from: owner
        }
      ).should.be.fulfilled;
      log(
        `approveInvestorsInBulk (3 investors) gasUsed: ${tx1.receipt.gasUsed}`
      );

      const tx2 = await this.whitelisting.disapproveInvestorsInBulk(
        [investor1, investor2, investor3],
        {
          from: owner
        }
      ).should.be.fulfilled;
      log(
        `disapproveInvestorsInBulk (3 investors) gasUsed: ${
          tx2.receipt.gasUsed
        }`
      );

      const event1 = tx2.logs.find(
        e => e.event === "Disapproved" && e.logIndex === 0
      );
      const event2 = tx2.logs.find(
        e => e.event === "Disapproved" && e.logIndex === 1
      );
      const event3 = tx2.logs.find(
        e => e.event === "Disapproved" && e.logIndex === 2
      );

      should.exist(event1);
      should.exist(event2);
      should.exist(event3);

      event1.args.investor.should.equal(investor1);
      event2.args.investor.should.equal(investor2);
      event3.args.investor.should.equal(investor3);
    });
  });
});
