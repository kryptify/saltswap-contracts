pragma solidity 0.6.12;

import "@openzeppelin/contracts/math/SafeMath.sol";
import './libs/IBEP20.sol';
import './libs/SafeBEP20.sol';
import "@openzeppelin/contracts/access/Ownable.sol";

contract ModSalary is Ownable {
    using SafeMath for uint256;
    using SafeBEP20 for IBEP20;

    // Info of each mod.
    struct UserInfo {
        uint256 lastBlockClaim; // last claimed block
        uint256 claimPerBlock; //  block payment
    }

    // SALT TOKEN
    IBEP20 public paymentToken;

    uint256 public endBlock;

    // Info of each mod
    mapping (address => UserInfo) public userInfo;

    event Claim(address indexed user, uint256 amount);
    event AddMod(address indexed user, uint256 claimPerBlock);
    event RemoveMod(address indexed user);

    constructor(
        IBEP20 _paymentToken
    ) public {
        paymentToken = _paymentToken;
        endBlock = 1115342314;
    }

    function claim() public {
        uint256 reward = pendingReward(msg.sender);
        if (reward > 0) {
            UserInfo storage user = userInfo[msg.sender];
            user.lastBlockClaim = block.number;
            paymentToken.transfer(address(msg.sender), reward);
            emit Claim(msg.sender, reward);     
        }
    }

    // View function to see pending Reward on frontend.
    function pendingReward(address _user) public view returns (uint256) {
        UserInfo storage user = userInfo[_user];
        uint256 claimableBlocks = min(block.number, endBlock) - user.lastBlockClaim;
        uint256 claimablePayment = claimableBlocks.mul(user.claimPerBlock);
        
        if (claimableBlocks > 0) {
            return claimablePayment;
        } 
        return 0;
    }

    function addMod(address _mod, uint256 _claimPerBlock) public onlyOwner {
        UserInfo storage user = userInfo[_mod];
        user.lastBlockClaim = block.number;
        user.claimPerBlock = _claimPerBlock;
        emit AddMod(_mod, _claimPerBlock);
    }

    function removeMod(address _mod) public onlyOwner {
        delete userInfo[_mod];
        emit RemoveMod(_mod);
    }

    /**
     * @dev block = 0 sets the current block as the endBlock.
     */
    function setEndBlock(uint256 _block) public onlyOwner {
        if (_block == 0) {
            endBlock = block.number;
        } else {
            endBlock = _block;
        }
    }

    // Withdraw reward. EMERGENCY ONLY.
    function emergencyPaymentWithdraw(uint256 _amount) public onlyOwner {
        paymentToken.safeTransfer(address(msg.sender), _amount);
    }

     /**
     * @dev Returns the smallest of two numbers.
     */
    function min(uint256 a, uint256 b) internal pure returns (uint256) {
        return a < b ? a : b;
    }

}