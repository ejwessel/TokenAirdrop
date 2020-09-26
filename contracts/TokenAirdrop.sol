//SPDX-License-Identifier: Unlicense
pragma solidity ^0.6.10;
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/ERC20.sol";

contract TokenAirdrop is Ownable {
    using SafeERC20 for IERC20;

    function distributeTokens(
        IERC20 token,
        address[] memory users,
        uint256[] memory amounts
    ) external onlyOwner {
        require(users.length == amounts.length, "LENGTH_MISMATCH");
        for (uint256 i = 0; i < users.length; i++) {
            token.safeTransferFrom(msg.sender, users[i], amounts[i]);
        }
    }
}
