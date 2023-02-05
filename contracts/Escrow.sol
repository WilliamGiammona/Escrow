// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

error Escrow__NoFundsDeposited();
error Escrow__SellerCannotBeBuyer();
error Escrow__AmountMustBeGreaterThanZero();
error Escrow__InsufficientFunds();
error Escrow__SaleInProgress(address buyer);
error Escrow__NotEnoughTimeHasPassed();
error Escrow__NotInvolvedInSale();
error Escrow__TransferFailed();

contract Escrow is ERC721, Ownable {
    enum EscrowState {
        NoFundsDeposited,
        FundsDeposited
    }

    modifier noFundsDeposited() {
        if (s_escrowState == EscrowState.NoFundsDeposited) {
            revert Escrow__NoFundsDeposited();
        }
        _;
    }

    //Storage Vars
    EscrowState private s_escrowState = EscrowState.NoFundsDeposited;

    address private s_buyer;
    uint256 private s_startTime;
    uint256 private s_minFundAmount;

    constructor() ERC721("HouseDeedToken", "HDT") {
        _safeMint(msg.sender, 1);
        s_minFundAmount = .00001 ether;
    }

    receive() external payable {
        buyerDeposit();
    }

    fallback() external payable {
        buyerDeposit();
    }

    function _baseURI() internal pure override returns (string memory) {
        return "j";
    }

    function setOwner() public {
        if (msg.sender == s_buyer) {
            revert Escrow__SellerCannotBeBuyer();
        }

        safeTransferFrom(owner(), msg.sender, 1);
        transferOwnership(msg.sender);
    }

    function setMinFundAmount(uint256 minFundAmount) public onlyOwner {
        if (0 >= minFundAmount) {
            revert Escrow__AmountMustBeGreaterThanZero();
        }
        s_minFundAmount = minFundAmount;
    }

    function buyerDeposit() public payable {
        if (msg.sender == owner()) {
            revert Escrow__SellerCannotBeBuyer();
        }
        if (msg.value < s_minFundAmount) {
            revert Escrow__InsufficientFunds();
        }
        if (s_escrowState == EscrowState.FundsDeposited) {
            revert Escrow__SaleInProgress({buyer: s_buyer});
        }

        s_escrowState = EscrowState.FundsDeposited;
        s_startTime = block.timestamp;
        s_buyer = msg.sender;
    }

    function finishSale() public onlyOwner noFundsDeposited {
        if (s_startTime + 10 minutes > block.timestamp) {
            revert Escrow__NotEnoughTimeHasPassed();
        }

        s_escrowState = EscrowState.NoFundsDeposited;

        safeTransferFrom(msg.sender, s_buyer, 1);
        transferOwnership(s_buyer);

        (bool success, ) = payable(msg.sender).call{value: address(this).balance}("");
        if (!success) {
            revert Escrow__TransferFailed();
        }
    }

    function cancelSale() public noFundsDeposited {
        if (msg.sender != s_buyer && msg.sender != owner()) {
            revert Escrow__NotInvolvedInSale();
        }

        s_escrowState = EscrowState.NoFundsDeposited;

        (bool success, ) = payable(s_buyer).call{value: address(this).balance}("");
        if (!success) {
            revert Escrow__TransferFailed();
        }
    }

    // View / Pure Functions

    function getEscrowState() public view returns (EscrowState) {
        return s_escrowState;
    }

    function getBuyer() public view returns (address) {
        return s_buyer;
    }

    function getStartTime() public view returns (uint256) {
        return s_startTime;
    }

    function getMinFundAmount() public view returns (uint256) {
        return s_minFundAmount;
    }
}
