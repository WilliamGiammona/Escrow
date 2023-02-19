import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { assert, expect } from "chai";
import { BigNumber } from "ethers";
import { isAddress } from "ethers/lib/utils";
import { network, deployments, ethers } from "hardhat";
import { Escrow } from "../../typechain-types";

network.config.chainId !== 31337
    ? describe.skip
    : describe("MyContract", function () {
          let EscrowContract: Escrow;
          let deployer: SignerWithAddress;
          let player1: SignerWithAddress;
          let player2: SignerWithAddress;
          const VAL = ethers.utils.parseEther("1");

          beforeEach(async function () {
              const accounts = await ethers.getSigners();
              deployer = accounts[0];
              player1 = accounts[1];
              player2 = accounts[2];
              await deployments.fixture(["Escrow"]); //Runs every deployment w/ all tag
              EscrowContract = await ethers.getContract("Escrow", deployer);
              EscrowContract = await EscrowContract.connect(deployer);
          });

          describe("constructor", function () {
              it("Sets a name for the NFT", async function () {
                  assert.equal(await EscrowContract.name(), "HouseDeedToken");
              });

              it("Sets a symbol for the NFT", async function () {
                  assert.equal(await EscrowContract.symbol(), "HDT");
              });

              it("It gives the NFT to the deployer", async function () {
                  assert.equal(await EscrowContract.ownerOf(1), deployer.address);
              });
          });

          describe("setOwner", function () {
              it("Reverts if msg.sender is the buyer ", async function () {
                  EscrowContract = await EscrowContract.connect(player1);
                  await EscrowContract.buyerDeposit({ value: VAL });
                  await expect(EscrowContract.setOwner()).to.be.revertedWithCustomError(
                      EscrowContract,
                      "Escrow__SellerCannotBeBuyer"
                  );
              });

              it("Transfers NFT Ownership", async function () {
                  EscrowContract = await EscrowContract.connect(player1);
                  await EscrowContract.setOwner();
                  assert.equal(await EscrowContract.owner(), player1.address);
              });

              it("Transfers Contract Ownership", async function () {
                  EscrowContract = await EscrowContract.connect(player1);
                  await EscrowContract.setOwner();
                  assert.equal(await EscrowContract.ownerOf(1), player1.address);
              });
          });

          describe("setMinFundAmount", function () {
              it("Reverts if not the owner", async function () {
                  EscrowContract = await EscrowContract.connect(player1);
                  await expect(EscrowContract.setMinFundAmount(1)).to.be.revertedWith(
                      "Ownable: caller is not the owner"
                  );
              });

              it("Reverts if value not > than 0 wei", async function () {
                  await expect(EscrowContract.setMinFundAmount(0)).to.be.revertedWithCustomError(
                      EscrowContract,
                      "Escrow__AmountMustBeGreaterThanZero"
                  );
              });

              it("Sets the minimum fund amount", async function () {
                  await EscrowContract.setMinFundAmount(VAL);
                  assert.equal((await EscrowContract.getMinFundAmount()).toString(), VAL.toString());
              });

              it("Emits the MinFundAmtSet Event", async function () {
                  await expect(EscrowContract.setMinFundAmount(VAL))
                      .to.emit(EscrowContract, "MinFundAmtSet")
                      .withArgs(VAL);
              });
          });

          describe("buyerDeposit", function () {
              beforeEach(async function () {
                  await EscrowContract.setMinFundAmount(VAL);
                  EscrowContract = await EscrowContract.connect(player1);
              });

              it("Reverts if it's the owner", async function () {
                  EscrowContract = await EscrowContract.connect(deployer);
                  await expect(EscrowContract.buyerDeposit({ value: VAL })).to.be.revertedWithCustomError(
                      EscrowContract,
                      "Escrow__SellerCannotBeBuyer"
                  );
              });
              it("Reverts if the value sent is less than the minimum fund amount", async function () {
                  await expect(EscrowContract.buyerDeposit({ value: 1 })).to.be.revertedWithCustomError(
                      EscrowContract,
                      "Escrow__InsufficientFunds"
                  );
              });
              it("Reverts if the state isn't open", async function () {
                  await EscrowContract.buyerDeposit({ value: VAL });
                  await expect(EscrowContract.buyerDeposit({ value: VAL })).to.be.revertedWithCustomError(
                      EscrowContract,
                      "Escrow__SaleInProgress"
                  );
              });

              it("Closes the state", async function () {
                  await EscrowContract.buyerDeposit({ value: VAL });
                  assert.equal(await EscrowContract.getEscrowState(), 1);
              });

              it("Sets the start time", async function () {
                  await EscrowContract.buyerDeposit({ value: VAL });
                  assert.equal(true, (await EscrowContract.getStartTime()).toNumber() > 0);
              });

              it("Sets the buyer correctly", async function () {
                  await EscrowContract.buyerDeposit({ value: VAL });
                  assert.equal(player1.address, await EscrowContract.getBuyer());
              });

              it("Emits the FundsDeposited Event", async function () {
                  await expect(EscrowContract.buyerDeposit({ value: VAL }))
                      .to.emit(EscrowContract, "FundsDeposited")
                      .withArgs(player1.address, VAL);
              });
          });

          describe("Receive", function () {
              beforeEach(async function () {
                  const transactionHash = await player1.sendTransaction({
                      to: EscrowContract.address,
                      value: VAL,
                  });
              });
              it("Calls the buyer function", async function () {
                  assert.equal(await EscrowContract.getEscrowState(), 1);
                  assert.equal(true, (await EscrowContract.getStartTime()).toNumber() > 0);
                  assert.equal(player1.address, await EscrowContract.getBuyer());
              });
          });

          describe("Fallback", function () {
              beforeEach(async function () {
                  const transactionHash = await player1.sendTransaction({
                      to: EscrowContract.address,
                      value: VAL,
                      data: "0x1234",
                      gasLimit: 1000000,
                  });
              });
              it("Calls the buyer function", async function () {
                  assert.equal(await EscrowContract.getEscrowState(), 1);
                  assert.equal(true, (await EscrowContract.getStartTime()).toNumber() > 0);
                  assert.equal(player1.address, await EscrowContract.getBuyer());
              });
          });

          describe("finishSale", function () {
              it("Reverts if not the owner", async function () {
                  EscrowContract = await EscrowContract.connect(player1);
                  await expect(EscrowContract.finishSale()).to.be.revertedWith("Ownable: caller is not the owner");
              });

              it("Reverts if no funds deposited", async function () {
                  await expect(EscrowContract.finishSale()).to.be.revertedWithCustomError(
                      EscrowContract,
                      "Escrow__NoFundsDeposited"
                  );
              });

              it("Reverts if not enough time has passed", async function () {
                  EscrowContract = await EscrowContract.connect(player1);
                  await EscrowContract.buyerDeposit({ value: VAL });
                  EscrowContract = await EscrowContract.connect(deployer);
                  await expect(EscrowContract.finishSale()).to.be.revertedWithCustomError(
                      EscrowContract,
                      "Escrow__NotEnoughTimeHasPassed"
                  );
              });

              it("Changes state to no funds deposited", async function () {
                  EscrowContract = await EscrowContract.connect(player1);
                  await EscrowContract.buyerDeposit({ value: VAL });
                  EscrowContract = await EscrowContract.connect(deployer);
                  await network.provider.send("evm_increaseTime", [601]);
                  await network.provider.send("evm_mine", []);
                  await EscrowContract.finishSale();
                  assert.equal(await EscrowContract.getEscrowState(), 0);
              });

              it("Transfers the NFT to the buyer", async function () {
                  EscrowContract = await EscrowContract.connect(player1);
                  await EscrowContract.buyerDeposit({ value: VAL });
                  EscrowContract = await EscrowContract.connect(deployer);
                  await network.provider.send("evm_increaseTime", [601]);
                  await network.provider.send("evm_mine", []);
                  await EscrowContract.finishSale();
                  assert.equal(await EscrowContract.ownerOf(1), player1.address);
              });

              it("Transfers ownership of the contract to the buyer", async function () {
                  EscrowContract = await EscrowContract.connect(player1);
                  await EscrowContract.buyerDeposit({ value: VAL });
                  EscrowContract = await EscrowContract.connect(deployer);
                  await network.provider.send("evm_increaseTime", [601]);
                  await network.provider.send("evm_mine", []);
                  await EscrowContract.finishSale();
                  assert.equal(await EscrowContract.owner(), player1.address);
              });

              it("Transfers the ether to the seller", async function () {
                  EscrowContract = await EscrowContract.connect(player1);
                  await EscrowContract.buyerDeposit({ value: VAL });
                  EscrowContract = await EscrowContract.connect(deployer);
                  const beginningDeployerBalance = await ethers.provider.getBalance(deployer.address);
                  const beginningEscrowTreasury = await ethers.provider.getBalance(EscrowContract.address);
                  const beginningTotal = beginningDeployerBalance.add(beginningEscrowTreasury);
                  await network.provider.send("evm_increaseTime", [601]);
                  await network.provider.send("evm_mine", []);
                  const txResponse = await EscrowContract.finishSale();
                  const txReceipt = await txResponse.wait(1);
                  const endingDeployerBalance = await ethers.provider.getBalance(deployer.address);
                  const { gasUsed, effectiveGasPrice } = txReceipt;
                  const gasCost = gasUsed.mul(effectiveGasPrice);
                  const beginningTotalMinusGas = beginningTotal.sub(gasCost);
                  assert.equal(beginningTotalMinusGas.toString(), endingDeployerBalance.toString());
              });

              it("clears the treasury", async function () {
                  EscrowContract = await EscrowContract.connect(player1);
                  await EscrowContract.buyerDeposit({ value: VAL });
                  EscrowContract = await EscrowContract.connect(deployer);
                  await network.provider.send("evm_increaseTime", [601]);
                  await network.provider.send("evm_mine", []);
                  await EscrowContract.finishSale();
                  const treasury = await ethers.provider.getBalance(EscrowContract.address);
                  assert.equal(treasury.toString(), "0");
              });

              it("Emits the SaleFinished Event", async function () {
                  EscrowContract = await EscrowContract.connect(player1);
                  await EscrowContract.buyerDeposit({ value: VAL });
                  EscrowContract = await EscrowContract.connect(deployer);
                  await network.provider.send("evm_increaseTime", [601]);
                  await network.provider.send("evm_mine", []);
                  await expect(EscrowContract.finishSale())
                      .to.emit(EscrowContract, "SaleFinished")
                      .withArgs(deployer.address, player1.address);
              });
          });

          describe("cancelSale", function () {
              it("Reverts if no funds deposited", async function () {
                  await expect(EscrowContract.finishSale()).to.be.revertedWithCustomError(
                      EscrowContract,
                      "Escrow__NoFundsDeposited"
                  );
              });

              it("Reverts if not buyer or seller", async function () {
                  EscrowContract = await EscrowContract.connect(player1);
                  await EscrowContract.buyerDeposit({ value: VAL });
                  EscrowContract = await EscrowContract.connect(player2);
                  await expect(EscrowContract.cancelSale()).to.be.revertedWithCustomError(
                      EscrowContract,
                      "Escrow__NotInvolvedInSale"
                  );
              });

              it("Changes state to no funds deposited", async function () {
                  EscrowContract = await EscrowContract.connect(player1);
                  await EscrowContract.buyerDeposit({ value: VAL });
                  await EscrowContract.cancelSale();
                  assert.equal(await EscrowContract.getEscrowState(), 0);
              });

              it("Transfers the ether to the buyer", async function () {
                  EscrowContract = await EscrowContract.connect(player1);
                  await EscrowContract.buyerDeposit({ value: VAL });
                  const beginningBuyerBalance = await ethers.provider.getBalance(player1.address);
                  const beginningEscrowTreasury = await ethers.provider.getBalance(EscrowContract.address);
                  const beginningTotal = beginningBuyerBalance.add(beginningEscrowTreasury);
                  const txResponse = await EscrowContract.cancelSale();
                  const txReceipt = await txResponse.wait(1);
                  const endingBuyerBalance = await ethers.provider.getBalance(player1.address);
                  const { gasUsed, effectiveGasPrice } = txReceipt;
                  const gasCost = gasUsed.mul(effectiveGasPrice);
                  const beginningTotalMinusGas = beginningTotal.sub(gasCost);
                  assert.equal(beginningTotalMinusGas.toString(), endingBuyerBalance.toString());
              });

              it("clears the treasury", async function () {
                  EscrowContract = await EscrowContract.connect(player1);
                  await EscrowContract.buyerDeposit({ value: VAL });
                  await EscrowContract.cancelSale();
                  const treasury = await ethers.provider.getBalance(EscrowContract.address);
                  assert.equal(treasury.toString(), "0");
              });

              it("Emits the SaleCancelled Event", async function () {
                  EscrowContract = await EscrowContract.connect(player1);
                  await EscrowContract.buyerDeposit({ value: VAL });
                  await expect(EscrowContract.cancelSale())
                      .to.emit(EscrowContract, "SaleCancelled")
                      .withArgs(player1.address, deployer.address);
              });
          });
      });
