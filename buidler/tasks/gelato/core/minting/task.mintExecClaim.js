import { task } from "@nomiclabs/buidler/config";
import { defaultNetwork } from "../../../../../buidler.config";
import { constants } from "ethers";

export default task(
  "gc-mintexecclaim",
  `Sends tx to GelatoCore.mintExecClaim() or --selfprovide to mintSelfProvidedExecClaim() on [--network] (default: ${defaultNetwork})`
)
  .addOptionalPositionalParam(
    "conditionname",
    "Must exist inside buidler.config. Supply '0' for AddressZero Conditions"
  )
  .addOptionalPositionalParam(
    "actionname",
    "Actionname (must be inside buidler.config) OR --actionaddress MUST be supplied."
  )
  .addOptionalPositionalParam(
    "gelatoprovider",
    "Defaults to network addressbook default"
  )
  .addOptionalPositionalParam("gelatoprovidermodule")
  .addOptionalParam("conditionaddress")
  .addOptionalParam("actionaddress")
  .addOptionalPositionalParam(
    "conditionpayload",
    "If needed but not provided, must have a default returned from handleGelatoPayload()"
  )
  .addOptionalPositionalParam(
    "actionpayload",
    "If not provided, must have a default returned from handleGelatoPayload()"
  )
  .addOptionalPositionalParam(
    "execclaimexpirydate",
    "Defaults to 0 for gelatoexecutor's maximum"
  )
  .addOptionalParam(
    "execclaim",
    "Pass a complete class ExecClaim obj for minting."
  )
  .addFlag("selfprovide", "Calls gelatoCore.mintSelfProvidedExecClaim()")
  .addOptionalParam(
    "funds",
    "Optional ETH value to sent along with --selfprovide",
    constants.HashZero
  )
  .addOptionalParam(
    "gelatoexecutor",
    "Provide for --selfprovide",
    constants.AddressZero
  )
  .addOptionalParam("gelatocoreaddress", "Supply if not in BRE-config")
  .addFlag("events", "Logs parsed Event Logs to stdout")
  .addFlag("log", "Logs return values to stdout")
  .setAction(async (taskArgs) => {
    try {
      // if (
      //   !taskArgs.funds ||
      //   (!taskArgs.gelatoexecutor && !taskArgs.selfprovide)
      // )
      //   throw new Error(
      //     "\n --funds or --gelatoexecutor only with --selfprovide"
      //   );

      if (!taskArgs.execclaim) {
        taskArgs.execclaim = {};
        // Command Line Argument Checks
        if (!taskArgs.actionname && !taskArgs.actionaddress)
          throw new Error(`\n Must supply <actionname> or --actionaddress`);

        if (
          taskArgs.conditionname &&
          taskArgs.conditionname !== "0" &&
          !taskArgs.conditionname.startsWith("Condition")
        ) {
          throw new Error(
            `\nInvalid condition: ${taskArgs.conditionname}: 1.<conditionname> 2.<actionname>\n`
          );
        }

        if (taskArgs.actionname && !taskArgs.actionname.startsWith("Action")) {
          throw new Error(
            `\nInvalid action: ${taskArgs.actionname}: 1.<conditionname> 2.<actionname>\n`
          );
        }

        console.log(taskArgs.gelatoprovider);
        if (!taskArgs.gelatoprovider)
          // Selected GelatoProvider
          taskArgs.execclaim.provider = await run("handleGelatoProvider", {
            gelatoprovider: taskArgs.gelatoprovider,
          });
        else {
          taskArgs.execclaim.provider = taskArgs.gelatoprovider;
        }

        // ProviderModule
        if (!taskArgs.gelatoprovidermodule)
          throw new Error(`\n gc-mintexecclaim: gelatoprovidermodule \n`);
        else taskArgs.execclaim.providerModule = taskArgs.gelatoprovidermodule;

        // Condition and ConditionPayload (optional)
        if (taskArgs.conditionname !== "0") {
          if (!taskArgs.conditionaddress) {
            taskArgs.execclaim.condition = await run("bre-config", {
              deployments: true,
              contractname: taskArgs.conditionname,
            });
          }
          if (!taskArgs.conditionpayload) {
            taskArgs.execclaim.conditionPayload = await run(
              "handleGelatoPayload",
              {
                contractname: taskArgs.conditionname,
              }
            );
          }
        }

        // Action and ActionPayload
        if (!taskArgs.actionaddress) {
          taskArgs.execclaim.action = await run("bre-config", {
            deployments: true,
            contractname: taskArgs.actionname,
          });
        }
        if (!taskArgs.actionpayload) {
          taskArgs.execclaim.actionPayload = await run("handleGelatoPayload", {
            contractname: taskArgs.actionname,
            payload: taskArgs.actionpayload,
          });
        }
      }

      if (taskArgs.log)
        console.log("\n gc-mintexecclaiom TaskArgs:\n", taskArgs, "\n");

      // Construct ExecClaim for minting
      const execClaim = new ExecClaim(taskArgs.execclaim);

      if (taskArgs.log) console.log("\n ExecClaim:\n", execClaim);

      // GelatoCore write Instance
      const gelatoCore = await run("instantiateContract", {
        contractname: "GelatoCore",
        contractaddress: taskArgs.gelatocoreaddress,
        write: true,
      });

      // Send Minting Tx
      let mintTxHash;

      if (taskArgs.selfprovide) {
        mintTxHash = await gelatoCore.mintSelfProvidedExecClaim(
          execClaim,
          taskArgs.gelatoexecutor,
          { value: taskArgs.funds }
        );
      } else {
        // Wrap Mint function in Gnosis Safe Transaction
        const safeAddress = await run("gc-determineCpkProxyAddress");
        mintTxHash = await run("gsp-exectransaction", {
          gnosissafeproxyaddress: safeAddress,
          contractname: "GelatoCore",
          inputs: execClaim,
          functionname: "mintExecClaim",
          operation: 0,
          log: true,
        });

        // const tx = await gelatoCore.mintExecClaim(execClaim, {
        //   gasLimit: 1000000,
        // });
        // mintTxHash = tx.hash;
      }

      if (taskArgs.log) console.log(`\n mintTx Hash: ${mintTxHash}\n`);

      // // Wait for tx to get mined
      // const { blockHash: blockhash } = await mintTx.wait();

      // Event Emission verification
      if (taskArgs.events) {
        const parsedMintingLog = await run("event-getparsedlog", {
          contractname: "GelatoCore",
          contractaddress: taskArgs.gelatocoreaddress,
          eventname: "LogExecClaimMinted",
          txhash: mintTxHash,
          blockhash,
          values: true,
          stringify: true,
        });
        if (parsedMintingLog)
          console.log("\n✅ LogExecClaimMinted\n", parsedMintingLog);
        else console.log("\n❌ LogExecClaimMinted not found");
      }

      return mintTxHash;
    } catch (error) {
      console.error(error, "\n");
      process.exit(1);
    }
  });
