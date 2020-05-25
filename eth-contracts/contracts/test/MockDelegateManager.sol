pragma solidity ^0.5.0;
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/ERC20Mintable.sol";
import "@openzeppelin/contracts-ethereum-package/contracts/token/ERC20/ERC20.sol";
import "../InitializableV2.sol";
import "../ClaimsManager.sol";


// TEST ONLY MOCK CONTRACT
contract MockDelegateManager is InitializableV2 {
    address claimsManagerAddress;

    function initialize(
        address _claimsManagerAddress
    ) public initializer {
        claimsManagerAddress = _claimsManagerAddress;

        InitializableV2.initialize();
    }

    // Test only function
    function testProcessClaim(
        address _claimer,
        uint _totalLockedForSP
    ) external {
        ClaimsManager claimsManager = ClaimsManager(
            claimsManagerAddress
        );
        return claimsManager.processClaim(_claimer, _totalLockedForSP);
    }
}

