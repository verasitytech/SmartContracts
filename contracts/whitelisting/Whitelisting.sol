pragma solidity 0.4.21;

import "../../zeppelin-solidity/contracts/ownership/Ownable.sol";


contract Whitelisting is Ownable {
    mapping(address => bool) public isInvestorApproved;

    event Approved(address indexed investor);
    event Disapproved(address indexed investor);

    function approveInvestor(address toApprove) public onlyOwner {
        isInvestorApproved[toApprove] = true;
        emit Approved(toApprove);
    }

    function approveInvestorsInBulk(address[] toApprove) public onlyOwner {
        for (uint i=0; i<toApprove.length; i++) {
            isInvestorApproved[toApprove[i]] = true;
            emit Approved(toApprove[i]);
        }
    }

    function disapproveInvestor(address toDisapprove) public onlyOwner {
        delete isInvestorApproved[toDisapprove];
        emit Disapproved(toDisapprove);
    }

    function disapproveInvestorsInBulk(address[] toDisapprove) public onlyOwner {
        for (uint i=0; i<toDisapprove.length; i++) {
            delete isInvestorApproved[toDisapprove[i]];
            emit Disapproved(toDisapprove[i]);
        }
    }
}
