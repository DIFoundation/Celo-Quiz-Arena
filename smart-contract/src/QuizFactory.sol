// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title Celo Quiz Factory + QuizGame
 * @notice Factory deploys QuizGame contracts. QuizGame supports native CELO (address(0))
 *         or ERC20 tokens for payouts, configurable number of winners, either
 *         percentage splits or equal splits, host-only finalize, and auto-refund before start.
 *
 * Security: Uses OpenZeppelin's SafeERC20 and ReentrancyGuard.
 *
 * Integration notes:
 *  - Off-chain: questions, answers, timing, and fastest-finger scoring are handled off-chain.
 *  - Host: creates quiz via factory, funds the prize pool (native or ERC20), calls startQuiz(),
 *          runs game off-chain, then calls finalizeAndPayout(winnersOrdered) to distribute rewards.
 */

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {QuizGame} from "./QuizGame.sol";

contract QuizFactory {
    /// @notice Emitted when a new quiz is created
    event QuizCreated(address indexed quizAddress, address indexed host, address indexed token, uint256 numWinners, bool equalSplit);

    address[] public allQuizzes;
    mapping(address => address[]) public hostQuizzes;

    /**
     * @notice Create a new QuizGame contract.
     * @param token Address of payout token (address(0) for native CELO).
     * @param numWinners Number of winners to be paid.
     * @param percentages If percentagesMode, an array of percentages with length == numWinners and sum == 100.
     *                    If using equalSplit set this to an empty array.
     * @param equalSplit If true, prize pool is split equally among winners. If false, percentages array required.
     * @param metadataURI Optional pointer to off-chain metadata (IPFS/Arweave JSON with question set).
     * @return quizAddress Deployed QuizGame contract address
     */
    function createQuiz(
        address token,
        uint256 numWinners,
        uint256[] calldata percentages,
        bool equalSplit,
        string calldata metadataURI
    ) external returns (address quizAddress) {
        require(numWinners > 0, "numWinners>0");
        if (!equalSplit) {
            require(percentages.length == numWinners, "percentages length mismatch");
            uint256 sum = 0;
            for (uint256 i = 0; i < percentages.length; ++i) {
                sum += percentages[i];
            }
            require(sum == 100, "percentages must sum to 100");
        } else {
            require(percentages.length == 0, "provide empty percentages when equalSplit");
        }

        QuizGame q = new QuizGame(msg.sender, token, numWinners, percentages, equalSplit, metadataURI);
        quizAddress = address(q);

        allQuizzes.push(quizAddress);
        hostQuizzes[msg.sender].push(quizAddress);

        emit QuizCreated(quizAddress, msg.sender, token, numWinners, equalSplit);
    }

    /// @notice Get all quizzes deployed through this factory
    function getAllQuizzes() external view returns (address[] memory) {
        return allQuizzes;
    }

    /// @notice Get quizzes deployed by a particular host
    function getHostQuizzes(address host) external view returns (address[] memory) {
        return hostQuizzes[host];
    }
}
