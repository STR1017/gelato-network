pragma solidity ^0.6.4;
pragma experimental ABIEncoderV2;

import { IGelatoExecutors } from "./interfaces/IGelatoExecutors.sol";
import { GelatoProviders } from "./GelatoProviders.sol";
import { Address } from  "../external/Address.sol";
import { SafeMath } from "../external/SafeMath.sol";

abstract contract GelatoExecutors is IGelatoExecutors, GelatoProviders {

    using Address for address payable;  /// for sendValue method
    using SafeMath for uint256;

    mapping(address => uint256) public override executorStake;
    mapping(address => uint256) public override executorFunds;

    // Executor De/Registrations and Staking
    function stakeExecutor() external payable override {
        require(
            executorStake[msg.sender] == 0,
            "GelatoExecutors.stakeExecutor: already registered"
        );
        require(
            msg.value >= minExecutorStake,
            "GelatoExecutors.stakeExecutor: minExecutorStake"
        );
        executorStake[msg.sender] = msg.value;
        emit LogStakeExecutor(msg.sender, msg.value);
    }

    function unstakeExecutor(address _transferExecutor) external override {
        require(
            isExecutorMinStaked(msg.sender),
            "GelatoExecutors.unstakeExecutor: msg.sender is NOT min staked"
        );
        require(
            isExecutorMinStaked(_transferExecutor),
            "GelatoExecutors.unstakeExecutor: _transferExecutor is NOT min staked"
        );
        require(
            !isExecutorAssigned(msg.sender),
            "GelatoExecutors.unstakeExecutor: msg.sender still assigned to provider(s)"
        );
        uint256 unbondedStake = executorStake[msg.sender];
        delete executorStake[msg.sender];
        msg.sender.sendValue(unbondedStake);
        emit LogUnstakeExecutor(msg.sender, _transferExecutor);
    }

    function increaseExecutorStake(uint256 _topUpAmount) external payable override {
        executorStake[msg.sender] = executorStake[msg.sender].add(_topUpAmount);
        require(isExecutorMinStaked(msg.sender), "GelatoExecutors.increaseExecutorStake");
        emit LogIncreaseExecutorStake(msg.sender, executorStake[msg.sender]);
    }

    // To unstake, Executors must reassign ALL their Providers to another staked Executor
    function batchReassignProviders(address[] calldata _providers, address _transferExecutor)
        external
        override
    {
        for (uint i; i < _providers.length; i++)
            assignProviderExecutor(_providers[i], _transferExecutor);
    }

    // Executor Accounting
    function withdrawExecutorBalance(uint256 _withdrawAmount) external override {
        // Checks
        require(
            _withdrawAmount > 0,
            "GelatoExecutors.withdrawExecutorBalance: zero _withdrawAmount"
        );
        uint256 currentExecutorBalance = executorFunds[msg.sender];
        require(
            currentExecutorBalance >= _withdrawAmount,
            "GelatoExecutors.withdrawExecutorBalance: out of balance"
        );
        // Effects
        executorFunds[msg.sender] = currentExecutorBalance - _withdrawAmount;
        // Interaction
        msg.sender.sendValue(_withdrawAmount);
        emit LogWithdrawExecutorBalance(msg.sender, _withdrawAmount);
    }

    // An Executor qualifies and remains registered for as long as he has minExecutorStake
    function isExecutorMinStaked(address _executor) public view override returns(bool) {
        return executorStake[_executor] >= minExecutorStake;
    }
}