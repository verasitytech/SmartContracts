pragma solidity 0.4.21;

import "../crowdsale/TokenCapRefund.sol";
import "../crowdsale/TokenCapCrowdsale.sol";


contract TokenCapRefundImpl is TokenCapCrowdsale, TokenCapRefund {

    function TokenCapRefundImpl (
        uint256 _startTime,
        uint256 _endTime,
        address _wallet,
        uint256 _cap,
        uint256 _individualCap,
        uint256 _refundClosingTime,
        uint256 _refundClosingTokenCap,
        TokenDistributer _token,
        Whitelisting _whitelisting
    ) 
        public
        TokenCapCrowdsale(_cap, _individualCap)
        BaseCrowdsale(_startTime, _endTime, _wallet, _token, _whitelisting)
        TokenCapRefund(_refundClosingTime, _refundClosingTokenCap)
    {
    }

    // mock function to allocate tokens
    function allocateTokens(uint256 index, uint256 tokens)
        public
        payable
    {
        contributions[index].tokensAllocated = true;
        tokenRaised = tokenRaised.add(tokens);        
        token.distributeTokens(contributions[index].contributor, tokens);
    }
    
}
