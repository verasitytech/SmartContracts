pragma solidity 0.4.21;

import "./TokenCapCrowdsale.sol";
import "./TokenCapRefund.sol";


contract PublicSale is TokenCapCrowdsale, TokenCapRefund {
    
    function PublicSale (
        uint256 _startTime,
        uint256 _endTime,
        address _wallet,
        Whitelisting _whitelisting,
        TokenDistributer _token,
        uint256 _refundClosingTime,
        uint256 _refundClosingTokenCap,
        uint256 _cap,
        uint256 _individualCap
    )
        public
        TokenCapCrowdsale(_cap, _individualCap)
        TokenCapRefund(_refundClosingTime, _refundClosingTokenCap)
        BaseCrowdsale(_startTime, _endTime, _wallet, _token, _whitelisting)
    {
    }

    function allocateTokens(uint256 index, uint256 tokens)
        external
        onlyOwner
        waitingTokenAllocation(index)
    {
        require(now >= endTime);
        require(whitelisting.isInvestorApproved(contributions[index].contributor));
        require(checkAndUpdateSupply(distributedSupply.add(tokens)));

        uint256 alreadyExistingTokens = token.balanceOf(contributions[index].contributor);
        require(withinIndividualCap(tokens.add(alreadyExistingTokens)));

        contributions[index].tokensAllocated = true;
        tokenRaised = tokenRaised.add(tokens);
        token.distributeTokens(contributions[index].contributor, tokens);
        
        emit TokenPurchase(
            msg.sender,
            contributions[index].contributor,
            contributions[index].weiAmount,
            tokens
        );
    }

    function ownerAssignedTokens(address beneficiary, uint256 tokens)
        external
        onlyOwner
    {
        require(now >= endTime);        
        require(whitelisting.isInvestorApproved(beneficiary));
        require(checkAndUpdateSupply(distributedSupply.add(tokens)));

        uint256 alreadyExistingTokens = token.balanceOf(beneficiary);
        require(withinIndividualCap(tokens.add(alreadyExistingTokens)));
        tokenRaised = tokenRaised.add(tokens);
        token.distributeTokens(beneficiary, tokens);
        
        emit TokenPurchase(
            msg.sender,
            beneficiary,
            0,
            tokens
        );
    }
}
