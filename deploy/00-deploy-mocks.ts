import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { networkConfig } from "../helper-hardhat-config";

const deployMock: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const { deployments, getNamedAccounts, network } = hre;
    const { deploy } = deployments;
    const { deployer } = await getNamedAccounts();
    const chainId: number = network.config.chainId!;

    const args: any[] = [];

    if (chainId === 31337) {
        console.log("Deploying Mocks...");

        const MockContract = await deploy("MyContract", {
            from: deployer,
            args: args,
            log: true,
            autoMine: true,
            waitConfirmations: networkConfig[chainId].blockConfirmations || 1,
        });
        console.log("Mocks Deployed!!!");
        console.log("------------------------------------------");
    }
};
export default deployMock;
deployMock.tags = ["all", "mocks"];
