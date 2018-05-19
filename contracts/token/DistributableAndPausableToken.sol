pragma solidity 0.4.21;

import "../../zeppelin-solidity/contracts/token/ERC20/PausableToken.sol";


contract DistributableAndPausableToken is PausableToken {
    uint256 public distributedToken;
    address public vraWallet;

    event Distribute(address indexed to, uint256 amount);
    event Mint(address indexed to, uint256 amount);

    function distributeTokens(address _to, uint256 _amount) 
        external
        onlyOwner
        returns (bool)
    {
        require(_to != address(0));
        require(_amount > 0);
        require(balances[vraWallet].sub(_amount) >= 0);
        balances[vraWallet] = balances[vraWallet].sub(_amount);
        balances[_to] = balances[_to].add(_amount);
        distributedToken = distributedToken.add(_amount);
        emit Distribute(_to, _amount);
        emit Transfer(address(0), _to, _amount);
        return true;
    }

    function getDistributedToken() public constant returns (uint256) {
        return distributedToken;
    }

}
