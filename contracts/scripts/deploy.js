const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  console.log("Deploying HopeFusionEscrow with account:", deployer.address);

  // We use the deployer's own address as the initial platform treasury address
  const platformTreasury = deployer.address;

  const HopeFusionEscrow = await hre.ethers.getContractFactory("HopeFusionEscrow");
  const escrow = await HopeFusionEscrow.deploy(platformTreasury);

  await escrow.waitForDeployment();

  console.log("HopeFusionEscrow contract successfully deployed!");
  console.log("Contract Address:", await escrow.getAddress());
  console.log("Platform Treasury Address Set To:", platformTreasury);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
