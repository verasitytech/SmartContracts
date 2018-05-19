pragma solidity 0.4.21;

import "./BaseCrowdsale.sol";


contract TokenCapCrowdsale is BaseCrowdsale {

    modifier greaterThanZero(uint256 value) {
        require(value > 0);
        _;
    }

    function TokenCapCrowdsale(uint256 _cap, uint256 _individualCap)
        public
        greaterThanZero(_cap)
        greaterThanZero(_individualCap)
    {
        syncDistributedSupply();
        require(distributedSupply < _cap);
        tokenCap = _cap;
        individualCap = _individualCap;
    }

    function setIndividualCap(uint256 _newIndividualCap)
        external
        onlyOwner
    {     
        individualCap = _newIndividualCap;
    }

    function setTokenCap(uint256 _newTokenCap)
        external
        onlyOwner
    {     
        tokenCap = _newTokenCap;
    }

    function hasEnded() public view returns (bool) {
        bool tokenCapReached = distributedSupply >= tokenCap;
        return tokenCapReached || super.hasEnded();
    }

    function checkAndUpdateSupply(uint256 newSupply) internal returns (bool) {
        distributedSupply = newSupply;
        return tokenCap >= distributedSupply;
    }

    function withinIndividualCap(uint256 _tokens) internal view returns (bool) {
        return individualCap >= _tokens;
    }

    function syncDistributedSupply() internal {
        distributedSupply = token.getDistributedToken();
    }
}
