pragma solidity 0.4.21;

import "../../zeppelin-solidity/contracts/ownership/Ownable.sol";
import "../../zeppelin-solidity/contracts/token/ERC20/SafeERC20.sol";
import "../../zeppelin-solidity/contracts/math/SafeMath.sol";
import "../whitelisting/Whitelisting.sol";


/**
 * @title TokenVesting
 * @dev TokenVesting is a token holder contract that will allow a
 * beneficiary to extract the tokens after a given release time
 */
contract TokenVesting is Ownable {
    using SafeERC20 for ERC20Basic;
    using SafeMath for uint256;

    // ERC20 basic token contract being held
    ERC20Basic public token;
    // whitelisting contract being held
    Whitelisting public whitelisting;

    struct VestingObj {
        uint256 token;
        uint256 releaseTime;
    }

    mapping (address  => VestingObj[]) public vestingObj;

    uint256 public totalTokenVested;

    event AddVesting ( address indexed _beneficiary, uint256 token, uint256 _vestingTime);
    event Release ( address indexed _beneficiary, uint256 token, uint256 _releaseTime);

    modifier checkZeroAddress(address _add) {
        require(_add != address(0));
        _;
    }

    function TokenVesting(ERC20Basic _token, Whitelisting _whitelisting)
        public
        checkZeroAddress(_token)
        checkZeroAddress(_whitelisting)
    {
        token = _token;
        whitelisting = _whitelisting;
    }

    function addVesting( address[] _beneficiary, uint256[] _token, uint256[] _vestingTime) 
        external 
        onlyOwner
    {
        require((_beneficiary.length == _token.length) && (_beneficiary.length == _vestingTime.length));
        
        for (uint i = 0; i < _beneficiary.length; i++) {
            require(_vestingTime[i] > now);
            require(checkZeroValue(_token[i]));
            require(uint256(getBalance()) >= totalTokenVested.add(_token[i]));
            vestingObj[_beneficiary[i]].push(VestingObj({
                token : _token[i],
                releaseTime : _vestingTime[i]
            }));
            totalTokenVested = totalTokenVested.add(_token[i]);
            emit AddVesting(_beneficiary[i], _token[i], _vestingTime[i]);
        }
    }

    /**
   * @notice Transfers tokens held by timelock to beneficiary.
   */
    function claim() external {
        require(whitelisting.isInvestorApproved(msg.sender));
        uint256 transferTokenCount = 0;
        for (uint i = 0; i < vestingObj[msg.sender].length; i++) {
            if (now >= vestingObj[msg.sender][i].releaseTime) {
                transferTokenCount = transferTokenCount.add(vestingObj[msg.sender][i].token);
                delete vestingObj[msg.sender][i];
            }
        }
        require(transferTokenCount > 0);
        token.safeTransfer(msg.sender, transferTokenCount);
        emit Release(msg.sender, transferTokenCount, now);
    }

    function getBalance() public view returns (uint256) {
        return token.balanceOf(address(this));
    }
    
    function checkZeroValue(uint256 value) internal returns(bool){
        return value > 0;
    }
}
