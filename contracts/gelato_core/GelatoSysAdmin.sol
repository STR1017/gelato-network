pragma solidity ^0.6.4;

import "./interfaces/IGelatoSysAdmin.sol";
import "../external/Ownable.sol";
import "../external/SafeMath.sol";

abstract contract GelatoSysAdmin is IGelatoSysAdmin, Ownable {

    using SafeMath for uint256;

    uint256 public override gelatoGasPrice = 9000000000;  // 9 gwei initial
    uint256 public override gelatoMaxGas = 7000000;  // 7 mio initial
    uint256 public override minExecutorStake = 0.02 ether;
    uint256 public override execClaimLifespan = 90 days;
    uint256 public override executorSuccessShare = 50;  // 50% of successful execution cost
    uint256 public override sysAdminSuccessShare = 20;  // 20% of successful execution cost
    uint256 public override sysAdminFunds;

    // == The main functions of the Sys Admin (DAO) ==
    // exec-tx gasprice
    function setGelatoGasPrice(uint256 _newGasPrice) external override onlyOwner {
        emit LogSetGelatoGasPrice(gelatoGasPrice, _newGasPrice);
        gelatoGasPrice = _newGasPrice;
    }

    // exec-tx gas
    function setGelatoMaxGas(uint256 _newMaxGas) external override onlyOwner {
        emit LogSetGelatoMaxGas(gelatoMaxGas, _newMaxGas);
        gelatoMaxGas = _newMaxGas;
    }

    // Executors' profit share on exec costs
    function setExecutorSuccessShare(uint256 _percentage) external override onlyOwner {
        require(_percentage < 100, "GelatoExecutors.setExecutorSuccessShare: over 100");
        emit LogSetExecutorSuccessShare(executorSuccessShare, _percentage);
        if (_percentage == 0) delete executorSuccessShare;
        else executorSuccessShare = _percentage;
    }

    // Minimum Executor Stake Per Provider
    function setMinExecutorStake(uint256 _newMin) external override onlyOwner {
        emit LogSetMinExecutorStake(minExecutorStake, _newMin);
        if (_newMin == 0) delete minExecutorStake;
        else minExecutorStake = _newMin;
    }

    // execClaim lifespan
    function setExecClaimLifespan(uint256 _lifespan) external override onlyOwner {
        emit LogSetExecClaimLifespan(execClaimLifespan, _lifespan);
        execClaimLifespan = _lifespan;
    }

    // Sys Admin (DAO) Business Model
    function setSysAdminSuccessShare(uint256 _percentage) external override onlyOwner {
        require(_percentage < 100, "GelatoSysAdmin.setSysAdminSuccessShare: over 100");
        emit LogSetSysAdminSuccessShare(sysAdminSuccessShare, _percentage);
        sysAdminSuccessShare = _percentage;
    }

    function withdrawSysAdminFunds(uint256 _amount) external override onlyOwner {
        uint256 currentBalance = sysAdminFunds;
        uint256 newBalance = currentBalance.sub(
            _amount,
            "GelatoSysAdmin.withdrawSysAdminFunds: underflow"
        );
        sysAdminFunds = newBalance;
        emit LogWithdrawOracleFunds(currentBalance, newBalance);
    }

    // Executors' total fee for a successful exec
    function executorSuccessFee(uint256 _gas, uint256 _gasPrice)
        public
        view
        override
        returns(uint256)
    {
        uint256 estExecCost = _gas.mul(_gasPrice);
        return SafeMath.div(
            estExecCost.mul(executorSuccessShare),
            100,
            "GelatoExecutors.executorSuccessFee: div error"
        );
    }

    function sysAdminSuccessFee(uint256 _gas, uint256 _gasPrice)
        public
        view
        override
        returns(uint256)
    {
        uint256 estExecCost = _gas.mul(_gasPrice);
        return SafeMath.div(
            estExecCost.mul(sysAdminSuccessShare),
            100,
            "GelatoSysAdmin.sysAdminSuccessShare: div error"
        );
    }
}