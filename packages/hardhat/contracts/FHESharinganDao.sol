// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint32, externalEuint32} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/**
 * @title FHESharinganDao
 * @dev Privacy-preserving voting contract for choosing your favorite Uchiha eye.
 *      Each user can submit or update their encrypted vote anytime.
 */
contract FHESharinganDao is SepoliaConfig {
    /// @dev Stores each user's encrypted vote
    mapping(address => euint32) private encryptedVotes;

    /// @dev Tracks if a user has ever voted
    mapping(address => bool) private hasVoted;

    /**
     * @notice Submit or update your encrypted vote for your favorite eye.
     * @param encryptedChoice The encrypted eye ID (e.g., 1–5)
     * @param proof Zero-knowledge proof for encrypted input
     */
    function castVote(externalEuint32 encryptedChoice, bytes calldata proof) external {
        euint32 newVote = FHE.fromExternal(encryptedChoice, proof);

        encryptedVotes[msg.sender] = newVote;
        hasVoted[msg.sender] = true;

        // Allow decryption for the user and the contract itself
        FHE.allow(encryptedVotes[msg.sender], msg.sender);
        FHE.allowThis(encryptedVotes[msg.sender]);
    }

    /**
     * @notice Check if a user has voted at least once.
     * @param user Address to check.
     * @return True if the user has voted.
     */
    function hasUserVoted(address user) external view returns (bool) {
        return hasVoted[user];
    }

    /**
     * @notice Retrieve the encrypted vote of a user.
     * @param user Address whose encrypted vote to retrieve.
     * @return Encrypted vote (only decryptable by user or contract).
     */
    function getEncryptedVote(address user) external view returns (euint32) {
        return encryptedVotes[user];
    }
}
