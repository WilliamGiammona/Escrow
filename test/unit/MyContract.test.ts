import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { assert, expect } from "chai";
import { network, deployments, ethers } from "hardhat";
import { MyContract } from "../../typechain-types";

network.config.chainId !== 31337
  ? describe.skip
  : describe("MyContract", function () {
      let MyContract: MyContract;
      let deployer: SignerWithAddress;
      let player1: SignerWithAddress;
      const VAL = ethers.utils.parseEther("1");

      beforeEach(async function () {
        const accounts = await ethers.getSigners();
        deployer = accounts[0];
        player1 = accounts[1];
        await deployments.fixture(["all"]); //Runs every deployment w/ all tag
        MyContract = await ethers.getContract("MyContract", deployer);
        MyContract = await MyContract.connect(deployer);
      });

      describe('constructor', functin () {
        it("Does something", async function () {})
      })

      describe("receive", function () {
        beforeEach(async function () {
          const transactionHash = await deployer.sendTransaction({
            to: MyContract.address,
            value: VAL,
          });
        });

        it("Does something", async function () {});
        });

        describe("fallback", function () {
          beforeEach(async function () {
            const transactionHash = await deployer.sendTransaction({
              to: MyContract.address,
              value: VAL,
              data: "0x1234",
            });
          });
          it("Does Something", async function () {});
        });
    
    });
