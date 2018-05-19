pragma solidity 0.4.21;

import "./UpgradeableTokenMock.sol";
import "../token/TokenUpgrader.sol";


contract TokenUpgraderMock is TokenUpgrader {
    function TokenUpgraderMock(UpgradeableTokenMock _token) public {
        originalSupply = _token.totalSupply();
    }
}
