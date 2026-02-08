// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract GameVault {
    address public admin;
    mapping(address => uint256) public poolBalances;
    uint256 public totalDeposits;

    event Deposited(address indexed pool, uint256 amount);
    event Withdrawn(address indexed pool, uint256 amount, address indexed recipient);
    event AdminChanged(address indexed oldAdmin, address indexed newAdmin);

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can call this");
        _;
    }

    constructor() {
        admin = msg.sender;
    }

    function deposit() external payable {
        require(msg.value > 0, "Cannot deposit 0");
        
        poolBalances[msg.sender] += msg.value;
        totalDeposits += msg.value;
        
        emit Deposited(msg.sender, msg.value);
    }

    function withdraw(address pool, uint256 amount, address payable recipient) external onlyAdmin {
        require(amount > 0, "Cannot withdraw 0");
        require(poolBalances[pool] >= amount, "Insufficient balance");
        require(recipient != address(0), "Invalid recipient address");
        
        poolBalances[pool] -= amount;
        totalDeposits -= amount;
        
        recipient.transfer(amount);
    
        emit Withdrawn(pool, amount, recipient);
    }

    function changeAdmin(address newAdmin) external onlyAdmin {
        require(newAdmin != address(0), "Invalid admin address");
        address oldAdmin = admin;
        admin = newAdmin;
        emit AdminChanged(oldAdmin, newAdmin);
    }

    function getPoolBalance(address pool) external view returns (uint256) {
        return poolBalances[pool];
    }

    function getTotalDeposits() external view returns (uint256) {
        return totalDeposits;
    }
}