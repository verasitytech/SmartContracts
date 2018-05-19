pragma solidity 0.4.21;

import "./BaseCrowdsale.sol";
import "./RefundVault.sol";


contract TokenCapRefund is BaseCrowdsale {

    RefundVault public vault;
    uint256 public refundClosingTime;
    uint256 public refundClosingTokenCap;
    
    modifier waitingTokenAllocation(uint256 index) {
        require(!contributions[index].tokensAllocated);
        _;
    }

    modifier validRefundClosingTokenCap(uint256 _refundClosingTokenCap){
        require(tokenCap >= _refundClosingTokenCap);
        _;
    }

    function TokenCapRefund(uint256 _refundClosingTime, uint256 _refundClosingTokenCap) 
        public
        validRefundClosingTokenCap(_refundClosingTokenCap)         
    {
        vault = new RefundVault(wallet);

        require(_refundClosingTime > endTime);
        refundClosingTime = _refundClosingTime;
        refundClosingTokenCap = _refundClosingTokenCap;
    }

    function closeRefunds() external onlyOwner {
        require(now > refundClosingTime);
        require(tokenRaised >= refundClosingTokenCap);
        vault.close();
    }

    function enableRefunds() external onlyOwner {
        require(now > endTime); 
        vault.enableRefunds();
    }

    function refundContribution(uint256 index)
        external
        onlyOwner
        waitingTokenAllocation(index)
    {
        vault.refund(contributions[index].contributor, contributions[index].weiAmount);
        contributions[index].weiAmount = 0;

    }

    function setRefundClosingTime(uint256 _newRefundClosingTime)
        external
        onlyOwner
        allowedUpdate(_newRefundClosingTime)
    {
        require(refundClosingTime > now);
        require(_newRefundClosingTime > endTime);
        
        refundClosingTime = _newRefundClosingTime;
    }

    function setRefundClosingTokenCap(uint256 _newRefundClosingTokenCap)
        external
        onlyOwner
        validRefundClosingTokenCap(_newRefundClosingTokenCap)
    {
        refundClosingTokenCap = _newRefundClosingTokenCap;
    }

    function forwardFunds() internal {
        vault.deposit.value(msg.value)();
    }
}
