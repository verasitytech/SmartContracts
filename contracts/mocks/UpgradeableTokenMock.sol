pragma solidity 0.4.21;

import "../token/UpgradeableToken.sol";


contract UpgradeableTokenMock is UpgradeableToken {
    function UpgradeableTokenMock(
        address upgradeMaster,
        address initialAccount,
        uint initialBalance
    )
        public
        UpgradeableToken(upgradeMaster)
    {
        balances[initialAccount] = initialBalance.div(2);
        balances[msg.sender] = initialBalance.div(2);
        totalSupply_ = initialBalance;
    }
}
