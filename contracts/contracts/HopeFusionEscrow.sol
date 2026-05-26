// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * HopeFusion Africa — Impact Escrow Smart Contract
 * Milestone-based fund release for startup investments
 * Network: Polygon (MATIC) — low gas fees, Africa-friendly
 * Deploy via: Hardhat / Remix IDE / Foundry
 */

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract HopeFusionEscrow is ReentrancyGuard, Ownable {

    /* ── ENUMS ─────────────────────────────────────────────── */
    enum EscrowStatus   { Active, Completed, Disputed, Cancelled }
    enum MilestoneStatus{ Locked, PendingEvidence, UnderReview, Released, Rejected }

    /* ── STRUCTS ────────────────────────────────────────────── */
    struct Milestone {
        string      title;
        string      description;
        uint256     amount;          // in wei or token units
        uint256     dueDate;
        MilestoneStatus status;
        string      evidenceURI;     // IPFS hash of evidence
        uint256     reviewDeadline;
        string      rejectionReason;
        uint256     releasedAt;
    }

    struct Escrow {
        bytes32         id;
        address payable startup;
        address         investor;
        address         arbitrator;  // HopeFusion Africa platform address
        uint256         totalAmount;
        uint256         releasedAmount;
        uint256         platformFeeRate; // basis points (200 = 2%)
        address         tokenAddress;    // address(0) = native MATIC
        EscrowStatus    status;
        uint256         createdAt;
        uint256         completedAt;
        string          startupName;
        string          dealRef;        // HopeFusion deal reference
        Milestone[]     milestones;
        bool            startupApproved;
        bool            investorApproved;
    }

    /* ── STATE ──────────────────────────────────────────────── */
    mapping(bytes32 => Escrow) public escrows;
    mapping(address => bytes32[]) public startupEscrows;
    mapping(address => bytes32[]) public investorEscrows;

    uint256 public platformFeeRate    = 200;   // 2% default
    address public platformTreasury;
    uint256 public totalEscrowed;
    uint256 public totalReleased;
    uint256 public totalEscrowCount;
    uint256 public reviewPeriodDays   = 5;     // days investor has to review evidence

    /* ── EVENTS ─────────────────────────────────────────────── */
    event EscrowCreated(bytes32 indexed id, address startup, address investor, uint256 amount, string dealRef);
    event MilestoneSubmitted(bytes32 indexed escrowId, uint256 milestoneIndex, string evidenceURI);
    event MilestoneReleased(bytes32 indexed escrowId, uint256 milestoneIndex, uint256 amount, address startup);
    event MilestoneRejected(bytes32 indexed escrowId, uint256 milestoneIndex, string reason);
    event DisputeRaised(bytes32 indexed escrowId, address raisedBy, string reason);
    event DisputeResolved(bytes32 indexed escrowId, address winner, uint256 amount);
    event EscrowCancelled(bytes32 indexed escrowId, string reason);
    event EscrowCompleted(bytes32 indexed escrowId, uint256 totalReleased);
    event PlatformFeeCollected(bytes32 indexed escrowId, uint256 feeAmount);

    /* ── MODIFIERS ──────────────────────────────────────────── */
    modifier onlyStartup(bytes32 escrowId) {
        require(msg.sender == escrows[escrowId].startup, "Only startup can call this");
        _;
    }
    modifier onlyInvestor(bytes32 escrowId) {
        require(msg.sender == escrows[escrowId].investor, "Only investor can call this");
        _;
    }
    modifier onlyArbitrator(bytes32 escrowId) {
        require(msg.sender == escrows[escrowId].arbitrator || msg.sender == owner(), "Only arbitrator");
        _;
    }
    modifier escrowActive(bytes32 escrowId) {
        require(escrows[escrowId].status == EscrowStatus.Active, "Escrow not active");
        _;
    }
    modifier escrowExists(bytes32 escrowId) {
        require(escrows[escrowId].createdAt > 0, "Escrow does not exist");
        _;
    }

    /* ── CONSTRUCTOR ────────────────────────────────────────── */
    constructor(address _treasury) Ownable(msg.sender) {
        platformTreasury = _treasury;
    }

    /* ============================================================
       1. CREATE ESCROW
       Called by investor when committing funds to a startup deal
       ============================================================ */
    function createEscrow(
        address payable _startup,
        address         _arbitrator,
        string memory   _startupName,
        string memory   _dealRef,
        string[] memory _milestoneTitles,
        string[] memory _milestoneDescriptions,
        uint256[] memory _milestoneAmounts,
        uint256[] memory _milestoneDueDates,
        address         _tokenAddress    // address(0) for native MATIC
    ) external payable nonReentrant returns (bytes32 escrowId) {
        require(_startup != address(0),                         "Invalid startup address");
        require(_milestoneTitles.length > 0,                    "At least one milestone required");
        require(_milestoneTitles.length == _milestoneAmounts.length, "Array length mismatch");
        require(_milestoneTitles.length <= 10,                  "Max 10 milestones");

        uint256 totalMilestoneAmount = 0;
        for (uint i = 0; i < _milestoneAmounts.length; i++) {
            require(_milestoneAmounts[i] > 0,                   "Milestone amount must be > 0");
            require(_milestoneDueDates[i] > block.timestamp,    "Due date must be in future");
            totalMilestoneAmount += _milestoneAmounts[i];
        }

        uint256 platformFee = (totalMilestoneAmount * platformFeeRate) / 10000;
        uint256 totalRequired = totalMilestoneAmount + platformFee;

        if (_tokenAddress == address(0)) {
            // Native MATIC payment
            require(msg.value >= totalRequired, "Insufficient MATIC sent");
        } else {
            // ERC-20 token payment (USDC, DAI, etc.)
            IERC20 token = IERC20(_tokenAddress);
            require(token.transferFrom(msg.sender, address(this), totalRequired), "Token transfer failed");
        }

        // Generate unique escrow ID
        escrowId = keccak256(abi.encodePacked(
            msg.sender, _startup, block.timestamp, _dealRef, totalEscrowCount
        ));

        Escrow storage e = escrows[escrowId];
        e.id              = escrowId;
        e.startup         = _startup;
        e.investor        = msg.sender;
        e.arbitrator      = _arbitrator != address(0) ? _arbitrator : owner();
        e.totalAmount     = totalMilestoneAmount;
        e.platformFeeRate = platformFeeRate;
        e.tokenAddress    = _tokenAddress;
        e.status          = EscrowStatus.Active;
        e.createdAt       = block.timestamp;
        e.startupName     = _startupName;
        e.dealRef         = _dealRef;

        for (uint i = 0; i < _milestoneTitles.length; i++) {
            e.milestones.push(Milestone({
                title:           _milestoneTitles[i],
                description:     _milestoneDescriptions[i],
                amount:          _milestoneAmounts[i],
                dueDate:         _milestoneDueDates[i],
                status:          MilestoneStatus.Locked,
                evidenceURI:     "",
                reviewDeadline:  0,
                rejectionReason: "",
                releasedAt:      0
            }));
        }

        startupEscrows[_startup].push(escrowId);
        investorEscrows[msg.sender].push(escrowId);
        totalEscrowed += totalMilestoneAmount;
        totalEscrowCount++;

        // Refund excess MATIC if overpaid
        if (_tokenAddress == address(0) && msg.value > totalRequired) {
            payable(msg.sender).transfer(msg.value - totalRequired);
        }

        // Collect platform fee immediately
        _transferFunds(_tokenAddress, payable(platformTreasury), platformFee);
        emit PlatformFeeCollected(escrowId, platformFee);
        emit EscrowCreated(escrowId, _startup, msg.sender, totalMilestoneAmount, _dealRef);
    }

    /* ============================================================
       2. SUBMIT MILESTONE EVIDENCE
       Called by startup to submit proof of milestone completion
       ============================================================ */
    function submitMilestoneEvidence(
        bytes32 escrowId,
        uint256 milestoneIndex,
        string memory evidenceURI    // IPFS hash: "ipfs://Qm..."
    ) external escrowExists(escrowId) escrowActive(escrowId) onlyStartup(escrowId) {
        Escrow storage e = escrows[escrowId];
        require(milestoneIndex < e.milestones.length, "Invalid milestone index");
        Milestone storage m = e.milestones[milestoneIndex];
        require(m.status == MilestoneStatus.Locked || m.status == MilestoneStatus.Rejected, "Milestone not available");
        require(bytes(evidenceURI).length > 0, "Evidence URI required");

        m.status          = MilestoneStatus.PendingEvidence;
        m.evidenceURI     = evidenceURI;
        m.reviewDeadline  = block.timestamp + (reviewPeriodDays * 1 days);

        emit MilestoneSubmitted(escrowId, milestoneIndex, evidenceURI);
    }

    /* ============================================================
       3. APPROVE + RELEASE MILESTONE FUNDS
       Called by investor after verifying milestone evidence
       ============================================================ */
    function approveMilestone(
        bytes32 escrowId,
        uint256 milestoneIndex
    ) external escrowExists(escrowId) escrowActive(escrowId) onlyInvestor(escrowId) nonReentrant {
        Escrow storage e = escrows[escrowId];
        require(milestoneIndex < e.milestones.length, "Invalid milestone index");
        Milestone storage m = e.milestones[milestoneIndex];
        require(m.status == MilestoneStatus.PendingEvidence || m.status == MilestoneStatus.UnderReview, "Not pending approval");

        m.status      = MilestoneStatus.Released;
        m.releasedAt  = block.timestamp;
        e.releasedAmount += m.amount;

        // Transfer funds to startup
        _transferFunds(e.tokenAddress, e.startup, m.amount);
        totalReleased += m.amount;

        emit MilestoneReleased(escrowId, milestoneIndex, m.amount, e.startup);

        // Check if all milestones released
        if (e.releasedAmount >= e.totalAmount) {
            e.status      = EscrowStatus.Completed;
            e.completedAt = block.timestamp;
            emit EscrowCompleted(escrowId, e.releasedAmount);
        }
    }

    /* ============================================================
       4. AUTO-RELEASE (after review period if investor doesn't act)
       Anyone can call this after review deadline passes
       ============================================================ */
    function autoReleaseMilestone(
        bytes32 escrowId,
        uint256 milestoneIndex
    ) external escrowExists(escrowId) escrowActive(escrowId) nonReentrant {
        Escrow storage e = escrows[escrowId];
        Milestone storage m = e.milestones[milestoneIndex];
        require(m.status == MilestoneStatus.PendingEvidence, "Not pending review");
        require(block.timestamp > m.reviewDeadline, "Review period not ended");

        m.status      = MilestoneStatus.Released;
        m.releasedAt  = block.timestamp;
        e.releasedAmount += m.amount;

        _transferFunds(e.tokenAddress, e.startup, m.amount);
        totalReleased += m.amount;

        emit MilestoneReleased(escrowId, milestoneIndex, m.amount, e.startup);
    }

    /* ============================================================
       5. REJECT MILESTONE
       Investor rejects evidence — startup must resubmit
       ============================================================ */
    function rejectMilestone(
        bytes32 escrowId,
        uint256 milestoneIndex,
        string memory reason
    ) external escrowExists(escrowId) escrowActive(escrowId) onlyInvestor(escrowId) {
        Milestone storage m = escrows[escrowId].milestones[milestoneIndex];
        require(m.status == MilestoneStatus.PendingEvidence, "Not pending review");
        m.status          = MilestoneStatus.Rejected;
        m.rejectionReason = reason;
        emit MilestoneRejected(escrowId, milestoneIndex, reason);
    }

    /* ============================================================
       6. RAISE DISPUTE
       Either party can raise a dispute — locks the escrow
       ============================================================ */
    function raiseDispute(
        bytes32 escrowId,
        string memory reason
    ) external escrowExists(escrowId) escrowActive(escrowId) {
        Escrow storage e = escrows[escrowId];
        require(msg.sender == e.startup || msg.sender == e.investor, "Not a party to this escrow");
        e.status = EscrowStatus.Disputed;
        emit DisputeRaised(escrowId, msg.sender, reason);
    }

    /* ============================================================
       7. RESOLVE DISPUTE (arbitrator only)
       HopeFusion Africa acts as neutral arbitrator
       ============================================================ */
    function resolveDispute(
        bytes32 escrowId,
        address payable winner,
        uint256 startupAmount,
        uint256 investorAmount
    ) external escrowExists(escrowId) onlyArbitrator(escrowId) nonReentrant {
        Escrow storage e = escrows[escrowId];
        require(e.status == EscrowStatus.Disputed, "Escrow not in dispute");
        require(startupAmount + investorAmount <= e.totalAmount - e.releasedAmount, "Amount exceeds balance");

        e.status = EscrowStatus.Completed;

        if (startupAmount > 0) {
            _transferFunds(e.tokenAddress, e.startup, startupAmount);
        }
        if (investorAmount > 0) {
            _transferFunds(e.tokenAddress, payable(e.investor), investorAmount);
        }

        emit DisputeResolved(escrowId, winner, startupAmount + investorAmount);
    }

    /* ============================================================
       8. CANCEL ESCROW (mutual consent)
       Both parties must approve cancellation
       ============================================================ */
    function approveCancellation(bytes32 escrowId, string memory reason)
        external escrowExists(escrowId) escrowActive(escrowId) {
        Escrow storage e = escrows[escrowId];
        require(msg.sender == e.startup || msg.sender == e.investor, "Not a party");
        if (msg.sender == e.startup)   e.startupApproved   = true;
        if (msg.sender == e.investor)  e.investorApproved  = true;

        if (e.startupApproved && e.investorApproved) {
            uint256 remaining = e.totalAmount - e.releasedAmount;
            e.status = EscrowStatus.Cancelled;
            if (remaining > 0) {
                _transferFunds(e.tokenAddress, payable(e.investor), remaining);
            }
            emit EscrowCancelled(escrowId, reason);
        }
    }

    /* ============================================================
       VIEW FUNCTIONS
       ============================================================ */
    function getEscrow(bytes32 escrowId) external view returns (
        bytes32 id, address startup, address investor, uint256 totalAmount,
        uint256 releasedAmount, EscrowStatus status, string memory startupName,
        string memory dealRef, uint256 milestoneCount, uint256 createdAt
    ) {
        Escrow storage e = escrows[escrowId];
        return (e.id, e.startup, e.investor, e.totalAmount, e.releasedAmount,
                e.status, e.startupName, e.dealRef, e.milestones.length, e.createdAt);
    }

    function getMilestone(bytes32 escrowId, uint256 index) external view returns (
        string memory title, uint256 amount, uint256 dueDate,
        MilestoneStatus status, string memory evidenceURI, uint256 reviewDeadline
    ) {
        Milestone storage m = escrows[escrowId].milestones[index];
        return (m.title, m.amount, m.dueDate, m.status, m.evidenceURI, m.reviewDeadline);
    }

    function getStartupEscrows(address startup) external view returns (bytes32[] memory) {
        return startupEscrows[startup];
    }

    function getInvestorEscrows(address investor) external view returns (bytes32[] memory) {
        return investorEscrows[investor];
    }

    function getPlatformStats() external view returns (
        uint256 _totalEscrowed, uint256 _totalReleased,
        uint256 _totalCount, uint256 _feeRate
    ) {
        return (totalEscrowed, totalReleased, totalEscrowCount, platformFeeRate);
    }

    /* ── INTERNAL TRANSFER ──────────────────────────────────── */
    function _transferFunds(address tokenAddress, address payable recipient, uint256 amount) internal {
        if (amount == 0) return;
        if (tokenAddress == address(0)) {
            (bool ok,) = recipient.call{value: amount}("");
            require(ok, "MATIC transfer failed");
        } else {
            require(IERC20(tokenAddress).transfer(recipient, amount), "Token transfer failed");
        }
    }

    /* ── ADMIN ──────────────────────────────────────────────── */
    function setPlatformFeeRate(uint256 _rate) external onlyOwner {
        require(_rate <= 500, "Max fee is 5%");
        platformFeeRate = _rate;
    }
    function setTreasury(address _treasury) external onlyOwner {
        platformTreasury = _treasury;
    }
    function setReviewPeriod(uint256 _days) external onlyOwner {
        require(_days >= 3 && _days <= 30, "Review period must be 3-30 days");
        reviewPeriodDays = _days;
    }

    receive() external payable {}
}
