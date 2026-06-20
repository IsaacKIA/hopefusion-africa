const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("HopeFusionEscrow", function () {
  let escrow;
  let token;
  let owner;
  let treasury;
  let startup;
  let investor;
  let arbitrator;
  let other;
  
  const platformFeeRate = 200; // 2%
  const reviewPeriodDays = 5;

  beforeEach(async function () {
    // Get signers
    [owner, treasury, startup, investor, arbitrator, other] = await ethers.getSigners();

    // Deploy Mock ERC20 Token
    const MockTokenFactory = await ethers.getContractFactory("MockERC20");
    token = await MockTokenFactory.deploy();
    await token.waitForDeployment();

    // Deploy Escrow Contract
    const EscrowFactory = await ethers.getContractFactory("HopeFusionEscrow");
    escrow = await EscrowFactory.deploy(treasury.address);
    await escrow.waitForDeployment();

    // Distribute tokens to investor
    await token.transfer(investor.address, ethers.parseEther("10000"));
  });

  describe("Deployment", function () {
    it("should set the correct platform treasury", async function () {
      expect(await escrow.platformTreasury()).to.equal(treasury.address);
    });

    it("should set the default fee rate (2%)", async function () {
      expect(await escrow.platformFeeRate()).to.equal(platformFeeRate);
    });

    it("should set the default review period (5 days)", async function () {
      expect(await escrow.reviewPeriodDays()).to.equal(reviewPeriodDays);
    });
  });

  describe("Native MATIC Escrow Creation", function () {
    it("should successfully create an escrow and collect fee", async function () {
      const milestoneTitles = ["Milestone 1", "Milestone 2"];
      const milestoneDescriptions = ["Desc 1", "Desc 2"];
      const milestoneAmounts = [ethers.parseEther("1"), ethers.parseEther("2")];
      const futureTime = Math.floor(Date.now() / 1000) + 86400 * 10;
      const milestoneDueDates = [futureTime, futureTime + 86400 * 5];

      const totalMilestonesAmount = ethers.parseEther("3");
      const expectedFee = (totalMilestonesAmount * BigInt(platformFeeRate)) / 10000n; // 2% of 3 MATIC = 0.06 MATIC
      const totalRequired = totalMilestonesAmount + expectedFee;

      const treasuryBalanceBefore = await ethers.provider.getBalance(treasury.address);

      // Create escrow (Investor calls)
      const tx = await escrow.connect(investor).createEscrow(
        startup.address,
        arbitrator.address,
        "Startup A",
        "DEAL-123",
        milestoneTitles,
        milestoneDescriptions,
        milestoneAmounts,
        milestoneDueDates,
        ethers.ZeroAddress,
        { value: totalRequired }
      );

      const receipt = await tx.wait();
      
      // Parse EscrowCreated event to extract escrow ID
      const event = receipt.logs
        .map((log) => {
          try {
            return escrow.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find((e) => e && e.name === "EscrowCreated");

      const escrowId = event.args.id;
      expect(escrowId).to.not.be.undefined;

      // Verify escrow state
      const esc = await escrow.getEscrow(escrowId);
      expect(esc.startup).to.equal(startup.address);
      expect(esc.investor).to.equal(investor.address);
      expect(esc.totalAmount).to.equal(totalMilestonesAmount);
      expect(esc.status).to.equal(0); // EscrowStatus.Active

      // Verify treasury collected fee
      const treasuryBalanceAfter = await ethers.provider.getBalance(treasury.address);
      expect(treasuryBalanceAfter - treasuryBalanceBefore).to.equal(expectedFee);
    });
  });

  describe("ERC20 Escrow Creation", function () {
    it("should successfully create an escrow and collect token fee", async function () {
      const milestoneTitles = ["Milestone 1"];
      const milestoneDescriptions = ["Desc 1"];
      const milestoneAmounts = [ethers.parseEther("100")];
      const futureTime = Math.floor(Date.now() / 1000) + 86400 * 10;
      const milestoneDueDates = [futureTime];

      const totalMilestonesAmount = ethers.parseEther("100");
      const expectedFee = (totalMilestonesAmount * BigInt(platformFeeRate)) / 10000n; // 2 tokens
      const totalRequired = totalMilestonesAmount + expectedFee;

      // Approve escrow contract to spend investor tokens
      await token.connect(investor).approve(await escrow.getAddress(), totalRequired);

      const treasuryBalanceBefore = await token.balanceOf(treasury.address);

      // Create escrow
      const tx = await escrow.connect(investor).createEscrow(
        startup.address,
        arbitrator.address,
        "Startup A",
        "DEAL-123",
        milestoneTitles,
        milestoneDescriptions,
        milestoneAmounts,
        milestoneDueDates,
        await token.getAddress()
      );

      const receipt = await tx.wait();
      const event = receipt.logs
        .map((log) => {
          try {
            return escrow.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find((e) => e && e.name === "EscrowCreated");

      const escrowId = event.args.id;

      // Verify token balances
      const treasuryBalanceAfter = await token.balanceOf(treasury.address);
      expect(treasuryBalanceAfter - treasuryBalanceBefore).to.equal(expectedFee);

      const escrowContractBalance = await token.balanceOf(await escrow.getAddress());
      expect(escrowContractBalance).to.equal(totalMilestonesAmount);
    });
  });

  describe("Milestone Workflows", function () {
    let escrowId;
    const milestoneAmount = ethers.parseEther("100");

    beforeEach(async function () {
      const milestoneTitles = ["Milestone 1"];
      const milestoneDescriptions = ["Desc 1"];
      const milestoneAmounts = [milestoneAmount];
      const futureTime = Math.floor(Date.now() / 1000) + 86400 * 10;
      const milestoneDueDates = [futureTime];

      const totalRequired = milestoneAmount + (milestoneAmount * BigInt(platformFeeRate)) / 10000n;

      await token.connect(investor).approve(await escrow.getAddress(), totalRequired);

      const tx = await escrow.connect(investor).createEscrow(
        startup.address,
        arbitrator.address,
        "Startup A",
        "DEAL-123",
        milestoneTitles,
        milestoneDescriptions,
        milestoneAmounts,
        milestoneDueDates,
        await token.getAddress()
      );
      const receipt = await tx.wait();
      const event = receipt.logs
        .map((log) => {
          try { return escrow.interface.parseLog(log); } catch { return null; }
        })
        .find((e) => e && e.name === "EscrowCreated");
      escrowId = event.args.id;
    });

    it("should allow startup to submit evidence", async function () {
      await expect(escrow.connect(startup).submitMilestoneEvidence(escrowId, 0, "ipfs://QmEvidenceHash"))
        .to.emit(escrow, "MilestoneSubmitted")
        .withArgs(escrowId, 0, "ipfs://QmEvidenceHash");

      const mil = await escrow.getMilestone(escrowId, 0);
      expect(mil.status).to.equal(1); // MilestoneStatus.PendingEvidence
      expect(mil.evidenceURI).to.equal("ipfs://QmEvidenceHash");
    });

    it("should allow investor to approve milestone and release funds", async function () {
      await escrow.connect(startup).submitMilestoneEvidence(escrowId, 0, "ipfs://QmEvidenceHash");

      const startupBalanceBefore = await token.balanceOf(startup.address);

      await expect(escrow.connect(investor).approveMilestone(escrowId, 0))
        .to.emit(escrow, "MilestoneReleased")
        .withArgs(escrowId, 0, milestoneAmount, startup.address);

      const startupBalanceAfter = await token.balanceOf(startup.address);
      expect(startupBalanceAfter - startupBalanceBefore).to.equal(milestoneAmount);

      const esc = await escrow.getEscrow(escrowId);
      expect(esc.status).to.equal(1); // EscrowStatus.Completed
    });

    it("should allow automatic release after review period passes", async function () {
      await escrow.connect(startup).submitMilestoneEvidence(escrowId, 0, "ipfs://QmEvidenceHash");

      // Increase EVM time by 6 days (longer than 5 days reviewPeriodDays)
      await ethers.provider.send("evm_increaseTime", [86400 * 6]);
      await ethers.provider.send("evm_mine");

      const startupBalanceBefore = await token.balanceOf(startup.address);

      // Anyone can trigger autoRelease
      await expect(escrow.connect(other).autoReleaseMilestone(escrowId, 0))
        .to.emit(escrow, "MilestoneReleased")
        .withArgs(escrowId, 0, milestoneAmount, startup.address);

      const startupBalanceAfter = await token.balanceOf(startup.address);
      expect(startupBalanceAfter - startupBalanceBefore).to.equal(milestoneAmount);
    });

    it("should allow investor to reject evidence", async function () {
      await escrow.connect(startup).submitMilestoneEvidence(escrowId, 0, "ipfs://QmEvidenceHash");

      await expect(escrow.connect(investor).rejectMilestone(escrowId, 0, "Incomplete proof"))
        .to.emit(escrow, "MilestoneRejected")
        .withArgs(escrowId, 0, "Incomplete proof");

      const mil = await escrow.getMilestone(escrowId, 0);
      expect(mil.status).to.equal(4); // MilestoneStatus.Rejected
    });

    it("should allow raising a dispute and resolving it by arbitrator", async function () {
      await expect(escrow.connect(startup).raiseDispute(escrowId, "Investor unresponsive"))
        .to.emit(escrow, "DisputeRaised")
        .withArgs(escrowId, startup.address, "Investor unresponsive");

      const escBefore = await escrow.getEscrow(escrowId);
      expect(escBefore.status).to.equal(2); // EscrowStatus.Disputed

      const startupBalanceBefore = await token.balanceOf(startup.address);
      const investorBalanceBefore = await token.balanceOf(investor.address);

      // Resolve dispute: 40 tokens to startup, 60 tokens to investor
      const startupAmount = ethers.parseEther("40");
      const investorAmount = ethers.parseEther("60");

      await expect(escrow.connect(arbitrator).resolveDispute(escrowId, startup.address, startupAmount, investorAmount))
        .to.emit(escrow, "DisputeResolved")
        .withArgs(escrowId, startup.address, startupAmount + investorAmount);

      const startupBalanceAfter = await token.balanceOf(startup.address);
      const investorBalanceAfter = await token.balanceOf(investor.address);

      expect(startupBalanceAfter - startupBalanceBefore).to.equal(startupAmount);
      expect(investorBalanceAfter - investorBalanceBefore).to.equal(investorAmount);
    });

    it("should allow mutual cancellation", async function () {
      await escrow.connect(startup).approveCancellation(escrowId, "Deal cancelled");
      
      const investorBalanceBefore = await token.balanceOf(investor.address);

      // Investor also approves → triggers cancellation & refund
      await expect(escrow.connect(investor).approveCancellation(escrowId, "Deal cancelled"))
        .to.emit(escrow, "EscrowCancelled")
        .withArgs(escrowId, "Deal cancelled");

      const investorBalanceAfter = await token.balanceOf(investor.address);
      expect(investorBalanceAfter - investorBalanceBefore).to.equal(milestoneAmount);

      const esc = await escrow.getEscrow(escrowId);
      expect(esc.status).to.equal(3); // EscrowStatus.Cancelled
    });
  });

  describe("Admin Setters", function () {
    it("should allow owner to change platform fee rate", async function () {
      await escrow.connect(owner).setPlatformFeeRate(300); // 3%
      expect(await escrow.platformFeeRate()).to.equal(300);
    });

    it("should reject changing platform fee rate to >5%", async function () {
      await expect(escrow.connect(owner).setPlatformFeeRate(600))
        .to.be.revertedWith("Max fee is 5%");
    });

    it("should allow owner to change treasury", async function () {
      await escrow.connect(owner).setTreasury(other.address);
      expect(await escrow.platformTreasury()).to.equal(other.address);
    });

    it("should allow owner to change review period", async function () {
      await escrow.connect(owner).setReviewPeriod(10);
      expect(await escrow.reviewPeriodDays()).to.equal(10);
    });

    it("should reject changing review period to invalid days (<3 or >30)", async function () {
      await expect(escrow.connect(owner).setReviewPeriod(2))
        .to.be.revertedWith("Review period must be 3-30 days");
    });
  });
});
