// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.8.0;
pragma experimental ABIEncoderV2;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract AirdropPull712 is Ownable {
    using ECDSA for bytes32;
    using SafeERC20 for IERC20;

    event SetSigner(address newSigner);
    event Claimed(uint256 nonce, address wallet, uint256 amount);

    struct EIP712Domain {
        string name;
        string version;
        uint256 chainId;
        address verifyingContract;
    }

    struct Recipient {
        uint256 nonce;
        address wallet;
        uint256 amount;
    }

    bytes32 private constant EIP712_DOMAIN_TYPEHASH =
        keccak256(
            "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
        );

    bytes32 private constant RECIPIENT_TYPEHASH =
        keccak256("Recipient(uint256 nonce,address wallet,uint256 amount)");

    bytes32 private immutable DOMAIN_SEPARATOR;

    IERC20 public immutable token;
    mapping(address => uint256) public accountNonces;
    address public signerAddress;

    constructor(IERC20 _token, address _signerAddress) public {
        require(address(_token) != address(0), "Invalid Token");
        require(_signerAddress != address(0), "Invalid Signer Address");
        token = _token;
        signerAddress = _signerAddress;

        DOMAIN_SEPARATOR = _hashDomain(
            EIP712Domain({
                name: "Airdrop Signature",
                version: "1",
                chainId: _getChainID(),
                verifyingContract: address(this)
            })
        );
    }

    function _hashDomain(EIP712Domain memory eip712Domain)
        private
        pure
        returns (bytes32)
    {
        return
            keccak256(
                abi.encode(
                    EIP712_DOMAIN_TYPEHASH,
                    keccak256(bytes(eip712Domain.name)),
                    keccak256(bytes(eip712Domain.version)),
                    eip712Domain.chainId,
                    eip712Domain.verifyingContract
                )
            );
    }

    function _hashRecipient(Recipient memory recipient)
        private
        pure
        returns (bytes32)
    {
        return
            keccak256(
                abi.encode(
                    RECIPIENT_TYPEHASH,
                    recipient.nonce,
                    recipient.wallet,
                    recipient.amount
                )
            );
    }

    function _hash(Recipient memory recipient) private view returns (bytes32) {
        return
            keccak256(
                abi.encodePacked(
                    "\x19\x01",
                    DOMAIN_SEPARATOR,
                    _hashRecipient(recipient)
                )
            );
    }

    function _getChainID() private pure returns (uint256) {
        uint256 id;
        // no-inline-assembly
        assembly {
            id := chainid()
        }
        return id;
    }

    function setSigner(address newSignerAddress) external onlyOwner {
        signerAddress = newSignerAddress;
    }

    function claim(
        Recipient calldata recipient,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        address signatureSigner = ecrecover(_hash(recipient), v, r, s);
        require(signatureSigner == signerAddress, "Invalid Signature");

        require(
            recipient.nonce == accountNonces[recipient.wallet],
            "Nonce Mismatch"
        );

        require(
            token.balanceOf(address(this)) >= recipient.amount,
            "Insufficient Funds"
        );

        accountNonces[recipient.wallet] += 1;
        token.safeTransfer(recipient.wallet, recipient.amount);

        emit Claimed(recipient.nonce, recipient.wallet, recipient.amount);
    }
}
