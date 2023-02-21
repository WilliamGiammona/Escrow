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

/**
 * @dev This Escrow contract is for example purposes only. It is not inteded to be used as an actual escrow contract.
 * Several security flaws exist in the contract, including allowing anyone to be the owner and have the NFT transferred to them
 * in order to make it easier to demonstrate the idea of how a real Escrow contract would work.
 */

contract Escrow is ERC721, Ownable {
    event MinFundAmtSet(uint256 indexed newMinFundAmt);
    event FundsDeposited(address indexed buyer, uint256 indexed amountDeposited);
    event SaleFinished(address indexed seller, address indexed buyer);
    event SaleCancelled(address indexed buyer, address indexed owner);

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

    /**
     * @notice only one NFT is ever minted
     */
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

    /**
     * @notice Since this is for educational purposes, this is just a picture of a mock property sale agreement.
     */

    function _baseURI() internal pure override returns (string memory) {
        return
            "http://127.0.0.1:45005/ipfs/bafybeibjbq3tmmy7wuihhhwvbladjsd3gx3kfjepxzkq6wylik6wc3whzy/#/files/ipfs-companion-imports/2023-02-05_141422";
    }

    /**
     * @notice To make this contract easier to demonstrate, anyone can be the owner of the contract and NFT.
     */
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

        emit MinFundAmtSet(minFundAmount);
    }

    /**
     * @notice The buyer deposits funds setting off a 10 minute timer. If the buyer does not
     * cancel the sale within 10 minutes, the seller can call finishSale.
     */

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
        s_startTime = block.timestamp; // less secure, only used for simplicity for test contract
        s_buyer = msg.sender;

        emit FundsDeposited(msg.sender, msg.value);
    }

    /**
     * @notice After waiting the appropriate amount of time, the seller can close the sale, collecting the ether while
     * transferring the NFT (ownership of property) to the buyer.
     */

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

        emit SaleFinished(msg.sender, s_buyer);
    }

    /**
     * @notice The buyer or seller can cancel the sale at any time, where the ether is immediately given back to the buyer.
     */

    function cancelSale() public noFundsDeposited {
        if (msg.sender != s_buyer && msg.sender != owner()) {
            revert Escrow__NotInvolvedInSale();
        }

        s_escrowState = EscrowState.NoFundsDeposited;

        (bool success, ) = payable(s_buyer).call{value: address(this).balance}("");
        if (!success) {
            revert Escrow__TransferFailed();
        }

        emit SaleCancelled(s_buyer, owner());
    }

    // View / Pure Functions

    function isOwner() public view returns (bool) {
        return msg.sender == owner();
    }

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
