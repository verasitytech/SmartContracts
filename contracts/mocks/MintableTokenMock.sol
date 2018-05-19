pragma solidity 0.4.21;

import "../../zeppelin-solidity/contracts/token/ERC20/MintableToken.sol";


// mock class using MintableToken
contract MintableTokenMock is MintableToken {
    function MintableTokenMock(address initialAccount, uint256 initialBalance) public {
        balances[initialAccount] = initialBalance;
        totalSupply_ = initialBalance;
    }
}
