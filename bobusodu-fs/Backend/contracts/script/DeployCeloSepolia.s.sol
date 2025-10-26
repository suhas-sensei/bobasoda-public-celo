// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {PancakePredictionV2} from "../src/contracts/PancakePredictionV2.sol";
import {MockAggregatorV3} from "../src/contracts/test/MockAggregatorV3.sol";

/**
 * @title DeployCeloSepolia
 * @notice Deployment script for PancakePredictionV2 on Celo Sepolia with Mock Oracle
 * @dev This deploys a MOCK ORACLE for testing - no Chainlink or Pyth needed!
 * @dev Run with: forge script script/DeployCeloSepolia.s.sol:DeployCeloSepolia --rpc-url https://rpc.ankr.com/celo_sepolia --broadcast -vvv
 */
contract DeployCeloSepolia is Script {
    // Configuration - 30 SECOND INTERVALS FOR FAST TESTING
    uint256 constant INTERVAL_SECONDS = 30; // 30 seconds - matches execute-rounds.js
    uint256 constant BUFFER_SECONDS = 30; // 30 seconds buffer
    uint256 constant MIN_BET_AMOUNT = 0.0001 ether; // 0.0001 CELO minimum bet
    uint256 constant ORACLE_UPDATE_ALLOWANCE = 60; // 1 minute allowance
    uint256 constant TREASURY_FEE = 300; // 3% (300 / 10000)

    // Initial ETH/USD price for mock oracle (e.g., $3500)
    int256 constant INITIAL_ETH_PRICE = 350000000000; // $3500 with 8 decimals

    function run() public {
        // Get deployer address from private key
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("\n=== Deploying to Celo Sepolia ===");
        console.log("Deployer:", deployer);
        console.log("Network: Celo Sepolia");
        console.log("Chain ID: 44787");
        console.log("30-SECOND INTERVALS - Mock Oracle (No Chainlink/Pyth)");
        console.log("");

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy Mock Oracle
        console.log("Deploying Mock Oracle...");
        MockAggregatorV3 mockOracle = new MockAggregatorV3(
            8, // 8 decimals (standard for price feeds)
            INITIAL_ETH_PRICE // Initial price
        );
        console.log("Mock Oracle deployed at:", address(mockOracle));
        console.log("Initial ETH/USD Price: $3500");

        // 2. Deploy PancakePredictionV2
        console.log("\nDeploying PancakePredictionV2...");
        PancakePredictionV2 prediction = new PancakePredictionV2(
            address(mockOracle),     // Oracle address (our mock)
            deployer,                // Admin address
            deployer,                // Operator address
            INTERVAL_SECONDS,
            BUFFER_SECONDS,
            MIN_BET_AMOUNT,
            ORACLE_UPDATE_ALLOWANCE,
            TREASURY_FEE
        );

        vm.stopBroadcast();

        console.log("\n=== Deployment Successful ===");
        console.log("PancakePredictionV2 deployed at:", address(prediction));
        console.log("Mock Oracle deployed at:", address(mockOracle));
        console.log("");
        console.log("Configuration:");
        console.log("  - Admin:", deployer);
        console.log("  - Operator:", deployer);
        console.log("  - Mock Oracle:", address(mockOracle));
        console.log("  - Interval (seconds):", INTERVAL_SECONDS, "- FAST MODE!");
        console.log("  - Buffer (seconds):", BUFFER_SECONDS);
        console.log("  - Min Bet (wei):", MIN_BET_AMOUNT);
        console.log("  - Treasury Fee (bp):", TREASURY_FEE);
        console.log("");
        console.log("=== Contract Info for Frontend ===");
        console.log("  Contract Address:", address(prediction));
        console.log("  Mock Oracle Address:", address(mockOracle));
        console.log("  Network: Celo Sepolia");
        console.log("  Chain ID: 44787");
        console.log("");
        console.log("=== Next Steps ===");
        console.log("  1. Start the first round: cast send", address(prediction), '"genesisStartRound()" --rpc-url https://rpc.ankr.com/celo_sepolia --private-key $PRIVATE_KEY');
        console.log("  2. Wait 30 seconds");
        console.log("  3. Lock the round: cast send", address(prediction), '"genesisLockRound()" --rpc-url https://rpc.ankr.com/celo_sepolia --private-key $PRIVATE_KEY');
        console.log("  4. Wait 30 seconds");
        console.log("  5. Run automated rounds: node execute-rounds.js");
        console.log("");
        console.log("=== Update Price (for testing) ===");
        console.log('  Update ETH price to $3600: cast send', address(mockOracle), '"updateAnswer(int256)" 360000000000 --rpc-url https://rpc.ankr.com/celo_sepolia --private-key $PRIVATE_KEY');
        console.log("");

        // Save deployment info to file
        string memory deploymentInfo = string(
            abi.encodePacked(
                '{\n',
                '  "network": "Celo Sepolia",\n',
                '  "chainId": 44787,\n',
                '  "rpcUrl": "https://rpc.ankr.com/celo_sepolia",\n',
                '  "mode": "TEST - 30 second intervals with Mock Oracle",\n',
                '  "contractAddress": "', vm.toString(address(prediction)), '",\n',
                '  "mockOracle": "', vm.toString(address(mockOracle)), '",\n',
                '  "admin": "', vm.toString(deployer), '",\n',
                '  "operator": "', vm.toString(deployer), '",\n',
                '  "intervalSeconds": ', vm.toString(INTERVAL_SECONDS), ',\n',
                '  "bufferSeconds": ', vm.toString(BUFFER_SECONDS), ',\n',
                '  "minBetAmount": "', vm.toString(MIN_BET_AMOUNT), '",\n',
                '  "treasuryFee": ', vm.toString(TREASURY_FEE), '\n',
                '}'
            )
        );

        vm.writeFile("deployments/celo-sepolia.json", deploymentInfo);
        console.log("Deployment info saved to: deployments/celo-sepolia.json");
    }
}
