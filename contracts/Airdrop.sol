// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract Airdrop is Ownable {
    using ECDSA for bytes32;
    using SafeERC20 for IERC20;

    mapping(bytes => bool) public _usedSignatures;

    event Claimed(IERC20 token, address recipient, uint256 amount);

    function claim(
        IERC20 token,
        address recipient,
        uint256 amount,
        bytes calldata signature
    ) external {
        require(!_usedSignatures[signature]);
        bytes32 h = keccak256(abi.encodePacked(token, recipient, amount));
        address signer = h.toEthSignedMessageHash().recover(signature);
        require(signer == owner(), "Invalid signature");
        _usedSignatures[signature] = true;
        token.safeTransfer(recipient, amount);
        emit Claimed(token, recipient, amount);
    }
}
