import { ethers } from "hardhat";

async function main() {
    const accounts = await ethers.getSigners();
    let deployer = accounts[0];
    let player1 = accounts[1];
    const MyContract = await ethers.getContract("MyContract", deployer);
    console.log(`Got contract MyContract at ${MyContract.address}`);
    console.log("Initiating Transaction...");
    const txResponse = await MyContract.method({});
    const txReceipt = await txResponse.wait(1);
    console.log("Transaction finished!!!");
    console.log("-------------------------------------------------------------");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
