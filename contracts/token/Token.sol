pragma solidity 0.4.21;

import "./UpgradeableToken.sol";
import "../../zeppelin-solidity/contracts/token/ERC20/BurnableToken.sol";
import "../../zeppelin-solidity/contracts/math/SafeMath.sol";

contract Token is UpgradeableToken, BurnableToken {
    using SafeMath for uint256;
    
    string public name = "VERA";
    string public symbol = "VRA";
    uint256 public maxTokenSupply;
    string public constant TERMS_AND_CONDITION =  "THE DIGITAL TOKENS REPRESENTED BY THIS BLOCKCHAIN LEDGER RECORD HAVE BEEN ACQUIRED FOR INVESTMENT UNDER CERTAIN SECURITIES EXEMPTIONS AND HAVE NOT BEEN REGISTERED UNDER THE U.S. SECURITIES ACT OF 1933, AS AMENDED (THE 'ACT'). UNTIL THE EXPIRATION OF THIS RESTRICTIVE LEGEND, SUCH TOKENS MAY NOT BE OFFERED, SOLD, ASSIGNED, TRANSFERRED, PLEDGED, ENCUMBERED OR OTHERWISE DISPOSED OF TO ANOTHER U.S. PERSON IN THE ABSENCE OF A REGISTRATION OR AN EXEMPTION THEREFROM UNDER THE ACT AND ANY APPLICABLE U.S. STATE SECURITIES LAWS. THE APPLICABLE RESTRICTED PERIOD (PER RULE 144 PROMULGATED UNDER THE ACT) IS ONE YEAR FROM THE ISSUANCE OF THE TOKENS. ANY PARTIES, INCLUDING EXCHANGES AND THE ORIGINAL ACQUIRERS OF THESE TOKENS, MAY BE HELD LIABLE FOR ANY UNAUTHORIZED TRANSFERS OR SALES OF THESE TOKENS DURING THE RESTRICTIVE PERIOD, AND ANY HOLDER OR ACQUIRER OF THESE TOKENS AGREES, AS A CONDITION OF SUCH HOLDING, THAT THE TOKEN GENERATOR/ISSUER (THE 'COMPANY') SHALL BE FREE OF ANY LIABILITY IN CONNECTION WITH SUCH UNAUTHORIZED TRANSACTIONS. REQUESTS TO TRANSFER THESE TOKENS DURING THE RESTRICTIVE PERIOD WITH LEGAL JUSTIFICATION MAY BE MADE BY WRITTEN REQUEST OF THE HOLDER OF THESE TOKENS TO THE COMPANY, WITH NO GUARANTEE OF APPROVAL.";
    uint8 public constant decimals = 18;

    event UpdatedTokenInformation(string newName, string newSymbol);

    function Token(address _vraWallet, address _upgradeMaster, uint256 _maxTokenSupply)
        public
        UpgradeableToken(_upgradeMaster)
    {
        maxTokenSupply = _maxTokenSupply.mul(10 ** uint256(decimals));
        vraWallet = _vraWallet;
        totalSupply_ = maxTokenSupply;
        balances[vraWallet] = totalSupply_;
        pause();
        emit Mint(vraWallet, totalSupply_);
        emit Transfer(address(0), vraWallet, totalSupply_);
    }

    /**
    * Owner can update token information here
    */
    function setTokenInformation(string _name, string _symbol) external onlyOwner {
        name = _name;
        symbol = _symbol;

        emit UpdatedTokenInformation(name, symbol);
    }

    /**
    * Owner can burn token here
    */
    function burn(uint256 _value) public onlyOwner {
        super.burn(_value);
    }

}
