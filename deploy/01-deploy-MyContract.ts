import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { networkConfig } from "../helper-hardhat-config";
import verify from "../utils/verify";

const deployMyContract: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const { deployments, getNamedAccounts, network, ethers } = hre;
    const { deploy } = deployments;
    const { deployer } = await getNamedAccounts();
    const chainId: number = network.config.chainId!;

    console.log("Deploying Escrow Contract.....");

    const args: any[] = [];

    const Escrow = await deploy("Escrow", {
        from: deployer,
        args: args,
        log: true,
        autoMine: true,
        waitConfirmations: networkConfig[chainId].blockConfirmations || 1,
    });

    console.log("MyContract deployed!!!");
    console.log("----------------------------------------------------");

    if (chainId !== 31337 && process.env.ETHERSCAN_API_KEY) {
        await verify(Escrow.address, args);
    }
};
export default deployMyContract;
deployMyContract.tags = ["all", "Escrow"];
