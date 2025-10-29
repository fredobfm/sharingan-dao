import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedFHESharinganDao = await deploy("FHESharinganDao", {
    from: deployer,
    log: true,
  });

  console.log(`FHESharinganDao contract: `, deployedFHESharinganDao.address);
};
export default func;
func.id = "deploy_FHESharinganDao"; // id required to prevent reexecution
func.tags = ["FHESharinganDao"];
