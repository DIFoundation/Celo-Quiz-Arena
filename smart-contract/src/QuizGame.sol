// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract QuizGame is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // -- Ownership & basic info
    address public immutable host;          // quiz creator who can start/finalize/cancel
    address public immutable token;         // payout token; address(0) == native CELO
    string public metadataURI;              // pointer to off-chain questions/answers/metadata
    uint256 public immutable numWinners;    // number of winners configured
    bool public immutable equalSplit;       // true => equal split; false => percentages mode
    uint256[] private percentages;          // used if equalSplit == false

    // -- prize accounting
    uint256 public prizePool;               // total funds held for prizes (token units or native wei)
    bool public started;                    // host called startQuiz()
    bool public finalized;                  // finalizeAndPayout called
    bool public cancelled;                  // host cancelled before start

    // -- timestamps
    uint256 public createdAt;
    uint256 public startedAt;
    uint256 public finalizedAt;
    uint256 public cancelledAt;

    // -- events
    event PrizeFunded(address indexed from, uint256 amount);
    event QuizStarted(uint256 startedAt);
    event QuizFinalized(address[] winners, uint256[] payouts);
    event QuizCancelled(uint256 cancelledAt, uint256 refundedAmount);
    event PrizeWithdrawnByHost(uint256 amount);

    modifier onlyHost() {
        require(msg.sender == host, "only host");
        _;
    }

    modifier notStarted() {
        require(!started, "already started");
        _;
    }

    modifier notFinalized() {
        require(!finalized, "already finalized");
        _;
    }

    /**
     * @notice Constructor called by factory.
     * @param _host quiz creator (owner)
     * @param _token payout token (address(0) -> native CELO)
     * @param _numWinners number of winners
     * @param _percentages percentage splits (only when equalSplit == false); copy into storage
     * @param _equalSplit whether to split equally
     * @param _metadataURI pointer to off-chain metadata
     */
    constructor(
        address _host,
        address _token,
        uint256 _numWinners,
        uint256[] memory _percentages,
        bool _equalSplit,
        string memory _metadataURI
    ) {
        require(_host != address(0), "host zero");
        require(_numWinners > 0, "numWinners>0");
        if (!_equalSplit) {
            require(_percentages.length == _numWinners, "percent len mismatch");
            uint256 sum = 0;
            for (uint256 i = 0; i < _percentages.length; ++i) {
                sum += _percentages[i];
            }
            require(sum == 100, "percentages must sum to 100");
        } else {
            require(_percentages.length == 0, "percentages must be empty for equalSplit");
        }

        host = _host;
        token = _token;
        numWinners = _numWinners;
        equalSplit = _equalSplit;
        createdAt = block.timestamp;
        metadataURI = _metadataURI;

        if (!_equalSplit) {
            // store copy of percentages
            percentages = new uint256[](_percentages.length);
            for (uint256 i = 0; i < _percentages.length; ++i) {
                percentages[i] = _percentages[i];
            }
        }
    }

    // --------------------
    // Funding functions
    // --------------------

    /**
     * @notice Fund prize pool with ERC20 tokens. Caller must approve this contract for `amount` first.
     * @param amount Amount of token to add to prize pool
     */
    function fundPrizePoolERC20(uint256 amount) external nonReentrant {
        require(token != address(0), "token is native; use payable");
        require(amount > 0, "amount>0");
        // transfer tokens from caller to this contract
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        prizePool += amount;
        emit PrizeFunded(msg.sender, amount);
    }

    /**
     * @notice Fund prize pool with native CELO. Use if token == address(0)
     */
    function fundPrizePoolNative() external payable nonReentrant {
        require(token == address(0), "token is ERC20; use fundPrizePoolERC20");
        require(msg.value > 0, "value>0");
        prizePool += msg.value;
        emit PrizeFunded(msg.sender, msg.value);
    }

    // --------------------
    // Host control
    // --------------------

    /**
     * @notice Host starts the quiz. After this point the quiz cannot be cancelled via cancelQuiz().
     *         Off-chain game play occurs after start.
     */
    function startQuiz() external onlyHost notStarted notFinalized {
        started = true;
        startedAt = block.timestamp;
        emit QuizStarted(startedAt);
    }

    /**
     * @notice Host may cancel prior to start and withdraw funds.
     * Refunds the prizePool back to the host.
     */
    function cancelQuiz() external onlyHost notFinalized notStarted nonReentrant {
        cancelled = true;
        cancelledAt = block.timestamp;

        uint256 amount = prizePool;
        prizePool = 0;

        if (amount > 0) {
            _transferOut(host, amount);
            emit QuizCancelled(cancelledAt, amount);
        } else {
            emit QuizCancelled(cancelledAt, 0);
        }
    }

    // --------------------
    // Finalization & payouts
    // --------------------

    /**
     * @notice Finalize the quiz and distribute the prizePool to winners.
     * @dev Only host can call. `winners` must be ordered by ranking (best -> worst).
     *      winners.length must equal numWinners. Contract does not validate correctness of winners;
     *      off-chain system / UI must audit and detect misbehavior. All payouts are attempted; if a transfer fails,
     *      the transaction will revert (ensures deterministic state).
     * @param winners Ordered list of winner addresses (length == numWinners)
     */
    function finalizeAndPayout(address[] calldata winners) external onlyHost notFinalized nonReentrant {
        require(started, "not started");
        require(!cancelled, "quiz cancelled");
        require(winners.length == numWinners, "winners length mismatch");
        require(prizePool > 0, "no prizePool");

        finalized = true;
        finalizedAt = block.timestamp;

        uint256 pool = prizePool;
        prizePool = 0; // zero immediately to avoid reentrancy or double spend

        uint256[] memory payouts = new uint256[](numWinners);

        if (equalSplit) {
            uint256 share = pool / numWinners;
            for (uint256 i = 0; i < numWinners; ++i) {
                payouts[i] = share;
                _transferOut(winners[i], share);
            }
            // handle remainder due to integer division, send to host
            uint256 paid = share * numWinners;
            uint256 remainder = pool - paid;
            if (remainder > 0) {
                _transferOut(host, remainder);
                // emit event indicates host got remainder via QuizFinalized event payload? we'll include it below indirectly
            }
        } else {
            // percentages mode
            uint256 paid = 0;
            for (uint256 i = 0; i < numWinners; ++i) {
                uint256 p = percentages[i];
                uint256 amount = (pool * p) / 100;
                payouts[i] = amount;
                paid += amount;
                _transferOut(winners[i], amount);
            }
            // remainder due to rounding goes to host
            uint256 remainder = pool - paid;
            if (remainder > 0) {
                _transferOut(host, remainder);
            }
        }

        emit QuizFinalized(winners, payouts);
    }

    // --------------------
    // Helpers & utilities
    // --------------------

    /**
     * @dev Internal transfer that supports native CELO and ERC20 tokens.
     */
    function _transferOut(address to, uint256 amount) internal {
        if (amount == 0) return;
        if (token == address(0)) {
            // native transfer
            (bool sent, ) = payable(to).call{value: amount}("");
            require(sent, "native transfer failed");
        } else {
            IERC20(token).safeTransfer(to, amount);
        }
    }

    /**
     * @notice Host may withdraw any accidental ERC20 tokens (non-payout token) sent to this contract.
     * @param tokenAddress Address of token to withdraw (must not be the configured payout token)
     * @param to Recipient
     * @param amount Amount to withdraw
     */
    function rescueERC20(address tokenAddress, address to, uint256 amount) external onlyHost nonReentrant {
        require(tokenAddress != token, "cannot rescue payout token");
        IERC20(tokenAddress).safeTransfer(to, amount);
    }

    /**
     * @notice If native tokens were accidentally sent and are not meant for payout (shouldn't happen),
     *         the host can withdraw them if prizePool == 0 and not finalized.
     *         (This is a small helper - avoid using it to drain real prize funds.)
     */
    function rescueNative(address payable to, uint256 amount) external onlyHost nonReentrant {
        require(token != address(0), "payout token is native; cannot rescue native while configured as payout");
        // only allow if prizePool is zero to avoid interfering with prize pool.
        require(prizePool == 0, "prizePool nonzero");
        (bool sent, ) = to.call{value: amount}("");
        require(sent, "native rescue failed");
    }

    /**
     * @notice View configured percentages (if in percentages mode).
     */
    function getPercentages() external view returns (uint256[] memory) {
        return percentages;
    }

    /**
     * @notice Get a snapshot of quiz state useful for frontend.
     */
    function getQuizInfo() external view returns (
        address _host,
        address _token,
        string memory _metadataURI,
        uint256 _numWinners,
        bool _equalSplit,
        uint256 _prizePool,
        bool _started,
        bool _finalized,
        bool _cancelled,
        uint256 _createdAt,
        uint256 _startedAt,
        uint256 _finalizedAt,
        uint256 _cancelledAt
    ) {
        _host = host;
        _token = token;
        _metadataURI = metadataURI;
        _numWinners = numWinners;
        _equalSplit = equalSplit;
        _prizePool = prizePool;
        _started = started;
        _finalized = finalized;
        _cancelled = cancelled;
        _createdAt = createdAt;
        _startedAt = startedAt;
        _finalizedAt = finalizedAt;
        _cancelledAt = cancelledAt;
    }

    // --------------------
    // Receive fallback for native transfers
    // --------------------
    receive() external payable {
        // If token==address(0), allow funding by sending native directly.
        if (token == address(0)) {
            prizePool += msg.value;
            emit PrizeFunded(msg.sender, msg.value);
        } else {
            // If token != native, native payments are unintended; accept but not credited to prizePool.
            // Host can rescue this native via rescueNative if prizePool == 0.
        }
    }
}