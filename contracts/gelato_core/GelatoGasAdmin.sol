pragma solidity ^0.6.4;

import "./interfaces/IGelatoGasAdmin.sol";
import "../external/Ownable.sol";
import "../external/SafeMath.sol";

abstract contract GelatoGasAdmin is IGelatoGasAdmin, Ownable {

    using SafeMath for uint256;

    uint256 public override gelatoGasPrice = 9000000000;  // 9 gwei initial
    uint256 public override gelatoMaxGas = 7000000;  // 7 mio initial
    uint256 public override gasAdminSuccessShare = 2;  // 2% on successful execution cost
    uint256 public override gasAdminFunds;

    // The main function of the Gelato Gas Admin (DAO)
    function setGelatoGasPrice(uint256 _newGasPrice) external override onlyOwner {
        emit LogSetGelatoGasPrice(gelatoGasPrice, _newGasPrice);
        gelatoGasPrice = _newGasPrice;
    }

    function setGelatoMaxGas(uint256 _newMaxGas) external override onlyOwner {
        emit LogSetGelatoMaxGas(gelatoMaxGas, _newMaxGas);
        gelatoMaxGas = _newMaxGas;
    }

    function setGasAdminSuccessShare(uint256 _percentage) external override onlyOwner {
        require(_percentage < 100, "GelatoGasAdmin.setGasAdminSuccessShare: over 100");
        emit LogSetGasAdminSuccessShare(gasAdminSuccessShare, _percentage);
        gasAdminSuccessShare = _percentage;
    }

    function gasAdminSuccessFee(uint256 _gas, uint256 _gasPrice)
        public
        view
        override
        returns(uint256)
    {
        uint256 estExecCost = _gas.mul(_gasPrice);
        return SafeMath.div(
            estExecCost.mul(gasAdminSuccessShare),
            100,
            "GelatoGasAdmin.gasAdminSuccessShare: div error"
        );
    }

    function withdrawGasAdminFunds(uint256 _amount) external override onlyOwner {
        uint256 currentBalance = gasAdminFunds;
        uint256 newBalance = currentBalance.sub(
            _amount,
            "GelatoGasAdmin.withdrawGasAdminFunds: underflow"
        );
        gasAdminFunds = newBalance;
        emit LogWithdrawOracleFunds(currentBalance, newBalance);
    }

}