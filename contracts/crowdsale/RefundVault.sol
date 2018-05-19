pragma solidity 0.4.21;

import "../../zeppelin-solidity/contracts/ownership/Ownable.sol";


contract RefundVault is Ownable {

    enum State { Active, Refunding, Closed }

    address public wallet;
    State public state;

    event Closed();
    event RefundsEnabled();
    event Refunded(address indexed beneficiary, uint256 weiAmount);

    function RefundVault(address _wallet) public {
        require(_wallet != address(0));
        wallet = _wallet;
        state = State.Active;
    }

    function deposit() public onlyOwner payable {
        require(state == State.Active);
    }

    function close() public onlyOwner {
        require(state == State.Active || state == State.Refunding);
        state = State.Closed;
        emit Closed();
        wallet.transfer(address(this).balance);
    }

    function enableRefunds() public onlyOwner {
        require(state == State.Active);
        state = State.Refunding;
        emit RefundsEnabled();
    }

    function refund(address investor, uint256 depositedValue) public onlyOwner {
        require(state == State.Refunding);
        investor.transfer(depositedValue);
        emit Refunded(investor, depositedValue);
    }
}
