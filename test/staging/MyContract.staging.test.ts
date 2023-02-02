import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { assert, expect } from "chai";
import { network, deployments, ethers } from "hardhat";
import { MyContract } from "../../typechain-types";

network.config.chainId === 31337
  ? describe.skip
  : describe("MyContract", function () {
      let MyContract: MyContract;
      let deployer: SignerWithAddress;
      const VAL = ethers.utils.parseEther(".025");

      beforeEach(async function () {
        const accounts = await ethers.getSigners();
        deployer = accounts[0];
        MyContract = await ethers.getContract("MyContract", deployer.address);
      });
      it("Does Something", async function () {});
    });
