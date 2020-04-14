// running `npx buidler test` automatically makes use of buidler-waffle plugin
// => only dependency we need is "chai"
const { expect } = require("chai");

import { utils } from "ethers";

// GelatoProviders creation time variable values
import initialState from "./GelatoProviders.initialState";

describe("GelatoCore - GelatoProviders - Setters: CAMS", function () {
  // We define the ContractFactory and Address variables here and assign them in
  // a beforeEach hook.
  let GelatoCoreFactory;
  let ConditionFactory;
  let ActionFactory;
  let OtherActionFactory;

  let gelatoCore;
  let condition;
  let action;
  let otherAction;

  let actionStruct;
  let otherActionStruct;
  let noDataAction;
  let otherNoDataAction;

  const gasPriceCeil = utils.parseUnits("20", "gwei");

  // Condition - Actions - Mix
  let cam;
  let otherCAM;

  // ExecClaim for isCAMProvided check
  let execClaim;
  let otherExecClaim;

  let provider;
  let providerAddress;

  beforeEach(async function () {
    // Get the ContractFactory, contract instance, and Signers here.
    GelatoCoreFactory = await ethers.getContractFactory("GelatoCore");
    ConditionFactory = await ethers.getContractFactory("MockConditionDummy");
    ActionFactory = await ethers.getContractFactory("MockActionDummy");
    OtherActionFactory = await ethers.getContractFactory("MockActionDummy");

    gelatoCore = await GelatoCoreFactory.deploy();
    condition = await ConditionFactory.deploy();
    action = await ActionFactory.deploy();
    otherAction = await OtherActionFactory.deploy();

    await gelatoCore.deployed();
    await condition.deployed();
    await action.deployed();
    await otherAction.deployed();

    // Provider
    [provider] = await ethers.getSigners();
    providerAddress = await provider.getAddress();

    // Construct ExecClaim for unit test isCAMProvided():
    // GelatoProvider
    const gelatoProvider = new GelatoProvider({
      addr: providerAddress,
      module: constants.AddressZero,
    });

    // Condition
    const conditionStruct = new Condition({
      inst: condition.address,
      data: constants.HashZero,
    });

    // Action
    actionStruct = new Action({
      inst: action.address,
      data: "0xdeadbeef",
      operation: "delegatecall",
      termsOkCheck: false,
    });
    otherActionStruct = new Action({
      inst: otherAction.address,
      data: "0xdeadbeef",
      operation: "delegatecall",
      termsOkCheck: true,
    });

    // Task
    const task = new Task({
      provider: gelatoProvider,
      condition: conditionStruct,
      actions: [actionStruct],
      expiryDate: constants.Zero,
    });
    const otherTask = new Task({
      provider: gelatoProvider,
      condition: conditionStruct,
      actions: [actionStruct, otherActionStruct],
      expiryDate: constants.Zero,
    });

    // ExecClaim
    execClaim = new ExecClaim({
      id: constants.Zero,
      userProxy: constants.AddressZero,
      taskObj: task,
    });
    otherExecClaim = new ExecClaim({
      id: 1,
      userProxy: constants.AddressZero,
      taskObj: otherTask,
    });

    // Condition Action Mix
    noDataAction = new NoDataAction({
      inst: action.address,
      operation: "delegatecall",
      termsOkCheck: false,
    });
    otherNoDataAction = new NoDataAction({
      inst: otherAction.address,
      operation: "delegatecall",
      termsOkCheck: true,
    });

    cam = new CAM({
      condition: condition.address,
      noDataActions: [noDataAction],
      gasPriceCeil,
    });

    otherCAM = new CAM({
      condition: condition.address,
      noDataActions: [noDataAction, otherNoDataAction],
      gasPriceCeil,
    });
  });

  // We test different functionality of the contract as normal Mocha tests.

  // provideCAMs
  describe("GelatoCore.GelatoProviders.provideCAMs", function () {
    it("Should allow anyone to provide a single CAM", async function () {
      // camHash
      const camHash = await gelatoCore.camHash(
        cam.condition,
        cam.noDataActions
      );
      await expect(gelatoCore.provideCAMs([cam]))
        .to.emit(gelatoCore, "LogProvideCAM")
        .withArgs(
          providerAddress,
          camHash,
          initialState.camGPC,
          cam.gasPriceCeil
        );
      expect(await gelatoCore.camGPC(providerAddress, camHash)).to.be.equal(
        cam.gasPriceCeil
      );
      expect(
        await gelatoCore.isCAMProvided(providerAddress, condition.address, [
          actionStruct,
        ])
      ).to.be.equal("Ok");
      expect(await gelatoCore.isExecClaimProvided(execClaim)).not.to.be.equal(
        "ConditionActionsMixNotProvided"
      );
      expect(
        await gelatoCore.isCAMProvided(providerAddress, condition.address, [
          otherActionStruct,
        ])
      ).to.be.equal("ConditionActionsMixNotProvided");
      expect(await gelatoCore.isExecClaimProvided(otherExecClaim)).to.be.equal(
        "ConditionActionsMixNotProvided"
      );
    });

    it("Should allow anyone to provideCAMs", async function () {
      // camHash
      const camHash = await gelatoCore.camHash(
        cam.condition,
        cam.noDataActions
      );
      const otherCAMHash = await gelatoCore.camHash(
        otherCAM.condition,
        otherCAM.noDataActions
      );
      await expect(gelatoCore.provideCAMs([cam, otherCAM]))
        .to.emit(gelatoCore, "LogProvideCAM")
        .withArgs(
          providerAddress,
          camHash,
          initialState.camGPC,
          cam.gasPriceCeil
        )
        .and.to.emit(gelatoCore, "LogProvideCAM")
        .withArgs(
          providerAddress,
          otherCAMHash,
          initialState.camGPC,
          otherCAM.gasPriceCeil
        );

      // cam
      // camGPC
      expect(await gelatoCore.camGPC(providerAddress, camHash)).to.be.equal(
        cam.gasPriceCeil
      );

      // isCAMProvided
      expect(
        await gelatoCore.isCAMProvided(providerAddress, condition.address, [
          actionStruct,
        ])
      ).to.be.equal("Ok");

      // isExecClaimProvided
      expect(await gelatoCore.isExecClaimProvided(execClaim)).not.to.be.equal(
        "ConditionActionsMixNotProvided"
      );

      // otherCAM
      // camGPC
      expect(
        await gelatoCore.camGPC(providerAddress, otherCAMHash)
      ).to.be.equal(otherCAM.gasPriceCeil);

      // isCAMProvided
      expect(
        await gelatoCore.isCAMProvided(providerAddress, condition.address, [
          actionStruct,
          otherActionStruct,
        ])
      ).to.be.equal("Ok");

      // isExecClaimProvided;
      expect(
        await gelatoCore.isExecClaimProvided(otherExecClaim)
      ).not.to.be.equal("ConditionActionsMixNotProvided");
    });

    it("Should NOT allow to provide same CAMs again", async function () {
      await gelatoCore.provideCAMs([cam]);

      await expect(gelatoCore.provideCAMs([cam])).to.be.revertedWith(
        "GelatoProviders.provideCAMs: redundant"
      );

      await expect(gelatoCore.provideCAMs([otherCAM, cam])).to.be.revertedWith(
        "GelatoProviders.provideCAMs: redundant"
      );
    });
  });

  // unprovideCAMs
  describe("GelatoCore.GelatoProviders.unprovideCAMs", function () {
    it("Should allow Providers to unprovide a single CAM", async function () {
      // provideCAMs
      await gelatoCore.provideCAMs([cam, otherCAM]);

      // camHash
      const camHash = await gelatoCore.camHash(
        cam.condition,
        cam.noDataActions
      );
      const otherCAMHash = await gelatoCore.camHash(
        otherCAM.condition,
        otherCAM.noDataActions
      );

      // unprovideCAMs
      await expect(gelatoCore.unprovideCAMs([cam]))
        .to.emit(gelatoCore, "LogUnprovideCAM")
        .withArgs(providerAddress, camHash);

      // cam
      // camGPC
      expect(await gelatoCore.camGPC(providerAddress, camHash)).to.be.equal(
        initialState.camGPC
      );

      // isCamProvided
      expect(
        await gelatoCore.isCAMProvided(providerAddress, condition.address, [
          actionStruct,
        ])
      ).to.be.equal("ConditionActionsMixNotProvided");

      // isExecClaimProvided
      expect(await gelatoCore.isExecClaimProvided(execClaim)).to.be.equal(
        "ConditionActionsMixNotProvided"
      );

      // otherCAM
      // camGPC
      expect(
        await gelatoCore.camGPC(providerAddress, otherCAMHash)
      ).to.be.equal(otherCAM.gasPriceCeil);

      // isCamProvided
      expect(
        await gelatoCore.isCAMProvided(providerAddress, condition.address, [
          actionStruct,
          otherActionStruct,
        ])
      ).to.be.equal("Ok");

      // isExecClaimProvided
      expect(
        await gelatoCore.isExecClaimProvided(otherExecClaim)
      ).not.to.be.equal("ConditionActionsMixNotProvided");
    });

    it("Should allow Providers to unprovideCAMs", async function () {
      // provideCAMs
      await gelatoCore.provideCAMs([cam, otherCAM]);

      const camHash = await gelatoCore.camHash(
        cam.condition,
        cam.noDataActions
      );
      const otherCAMHash = await gelatoCore.camHash(
        otherCAM.condition,
        otherCAM.noDataActions
      );

      // unprovideCAMs
      await expect(gelatoCore.unprovideCAMs([cam, otherCAM]))
        .to.emit(gelatoCore, "LogUnprovideCAM")
        .withArgs(providerAddress, camHash)
        .and.to.emit(gelatoCore, "LogUnprovideCAM")
        .withArgs(providerAddress, otherCAMHash);

      // cam
      // camGPC
      expect(await gelatoCore.camGPC(providerAddress, camHash)).to.be.equal(
        initialState.camGPC
      );

      // isCAMProvided
      expect(
        await gelatoCore.isCAMProvided(providerAddress, condition.address, [
          actionStruct,
        ])
      ).to.be.equal("ConditionActionsMixNotProvided");

      // otherCAM
      // camGPC
      expect(
        await gelatoCore.camGPC(providerAddress, otherCAMHash)
      ).to.be.equal(initialState.camGPC);

      // isCAMProvided
      expect(
        await gelatoCore.isCAMProvided(providerAddress, condition.address, [
          actionStruct,
          otherActionStruct,
        ])
      ).to.be.equal("ConditionActionsMixNotProvided");
    });

    it("Should NOT allow Providers to unprovide not-provided CAMs", async function () {
      // unprovideCAMs
      await expect(gelatoCore.unprovideCAMs([cam])).to.be.revertedWith(
        "GelatoProviders.unprovideCAMs: redundant"
      );

      await expect(
        gelatoCore.unprovideCAMs([cam, otherCAM])
      ).to.be.revertedWith("GelatoProviders.unprovideCAMs: redundant");

      // provideCAMs
      await gelatoCore.provideCAMs([cam]);

      // unprovideCAMs
      await expect(gelatoCore.unprovideCAMs([otherCAM])).to.be.revertedWith(
        "GelatoProviders.unprovideCAMs: redundant"
      );

      await expect(
        gelatoCore.unprovideCAMs([cam, otherCAM])
      ).to.be.revertedWith("GelatoProviders.unprovideCAMs: redundant");
    });
  });
});
