// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import "../src/contracts/PancakePredictionV2Pyth.sol";

/**
 * @title DeployCeloTestnetPyth
 * @notice Deployment script for PancakePredictionV2Pyth on Celo Alfajores Testnet
 * @dev Run with: forge script script/DeployCeloTestnetPyth.s.sol:DeployCeloTestnetPyth --rpc-url celo_alfajores --broadcast -vvv
 */
contract DeployCeloTestnetPyth is Script {
    // Celo Alfajores Testnet Pyth contract
    address constant PYTH_CONTRACT = 0x74f09cb3c7e2A01865f424FD14F6dc9A14E3e94E;

    // ETH/USD Price Feed ID on Pyth Network
    bytes32 constant ETH_USD_PRICE_ID = 0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace;

    // Configuration - 30 SECOND INTERVALS WITH PYTH!
    uint256 constant INTERVAL_SECONDS = 30; // 30 seconds - Pyth updates every 400ms!
    uint256 constant BUFFER_SECONDS = 30; // 30 seconds buffer (MUST be >= interval for auto-execution)
    uint256 constant MIN_BET_AMOUNT = 1000000000000000; // 0.001 CELO minimum bet (from .env.local)
    uint256 constant TREASURY_FEE = 300; // 3% (300 / 10000)

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("\n=== Deploying PancakePredictionV2Pyth to Celo Alfajores Testnet ===");
        console.log("Deployer:", deployer);
        console.log("Network: Celo Alfajores Testnet");
        console.log("Chain ID: 44787");
        console.log("Pyth Contract:", PYTH_CONTRACT);
        console.log("ETH/USD Price ID:", vm.toString(ETH_USD_PRICE_ID));
        console.log("30-SECOND INTERVALS - Powered by Pyth Network!");
        console.log("");

        vm.startBroadcast(deployerPrivateKey);

        PancakePredictionV2Pyth prediction = new PancakePredictionV2Pyth(
            PYTH_CONTRACT,
            ETH_USD_PRICE_ID,
            deployer, // admin
            deployer, // operator
            INTERVAL_SECONDS,
            BUFFER_SECONDS,
            MIN_BET_AMOUNT,
            TREASURY_FEE
        );

        vm.stopBroadcast();

        console.log("\n=== Deployment Successful ===");
        console.log("PancakePredictionV2Pyth deployed at:", address(prediction));
        console.log("");
        console.log("Configuration:");
        console.log("  - Admin:", deployer);
        console.log("  - Operator:", deployer);
        console.log("  - Pyth Contract:", PYTH_CONTRACT);
        console.log("  - Price Feed ID:", vm.toString(ETH_USD_PRICE_ID));
        console.log("  - Interval (seconds):", INTERVAL_SECONDS, "- 30s MODE WITH PYTH!");
        console.log("  - Buffer (seconds):", BUFFER_SECONDS);
        console.log("  - Min Bet (wei):", MIN_BET_AMOUNT);
        console.log("  - Treasury Fee (bp):", TREASURY_FEE);
        console.log("");
        console.log("=== Contract Info for Frontend ===");
        console.log("  Contract Address:", address(prediction));
        console.log("  Network: Celo Alfajores Testnet");
        console.log("  Chain ID: 44787");
        console.log("  RPC URL: https://alfajores-forno.celo-testnet.org");
        console.log("");
        console.log("=== Next Steps ===");
        console.log("  1. Start the first round:");
        console.log('     cast send', address(prediction), '"genesisStartRound()" --rpc-url celo_alfajores --private-key $PRIVATE_KEY');
        console.log("  2. Wait 30 seconds");
        console.log("  3. Lock the round:");
        console.log('     cast send', address(prediction), '"genesisLockRound()" --rpc-url celo_alfajores --private-key $PRIVATE_KEY');
        console.log("  4. Wait 30 seconds");
        console.log("  5. Execute rounds: call executeRound() every 30 seconds");
        console.log("");

        // Save deployment info to file
        string memory deploymentInfo = string(
            abi.encodePacked(
                '{\n',
                '  "network": "Celo Alfajores Testnet",\n',
                '  "chainId": 44787,\n',
                '  "rpcUrl": "https://alfajores-forno.celo-testnet.org",\n',
                '  "mode": "Pyth Oracle - 30 second intervals",\n',
                '  "contractAddress": "', vm.toString(address(prediction)), '",\n',
                '  "pythContract": "', vm.toString(PYTH_CONTRACT), '",\n',
                '  "priceId": "', vm.toString(ETH_USD_PRICE_ID), '",\n',
                '  "admin": "', vm.toString(deployer), '",\n',
                '  "operator": "', vm.toString(deployer), '",\n',
                '  "intervalSeconds": ', vm.toString(INTERVAL_SECONDS), ',\n',
                '  "bufferSeconds": ', vm.toString(BUFFER_SECONDS), ',\n',
                '  "minBetAmount": "', vm.toString(MIN_BET_AMOUNT), '",\n',
                '  "treasuryFee": ', vm.toString(TREASURY_FEE), '\n',
                '}'
            )
        );

        vm.writeFile("deployments/celo-alfajores.json", deploymentInfo);
        console.log("Deployment info saved to: deployments/celo-alfajores.json");
    }
}
