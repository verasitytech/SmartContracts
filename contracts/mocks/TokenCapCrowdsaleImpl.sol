pragma solidity 0.4.21;

import "../crowdsale/TokenCapCrowdsale.sol";


contract TokenCapCrowdsaleImpl is TokenCapCrowdsale {
    function TokenCapCrowdsaleImpl (
        uint256 _startTime,
        uint256 _endTime,
        address _wallet,
        uint256 _cap,
        uint256 _individualCap,
        TokenDistributer _token,
        Whitelisting _whitelisting
    )   public
        BaseCrowdsale(_startTime, _endTime, _wallet, _token, _whitelisting)
        TokenCapCrowdsale(_cap, _individualCap)
    {
    }

    // mock function
    function addTokensAndIncreaseSupply(address beneficiary, uint256 tokens) public {
        distributedSupply = distributedSupply.add(tokens);
        token.distributeTokens(beneficiary, tokens);
    }
}
