pragma solidity ^0.5.0;

import "./registry/RegistryContract.sol";
import "./interface/registry/RegistryInterface.sol";
import "../InitializableV2.sol";


/** NOTE - will call RegistryContract.constructor, which calls Ownable constructor */
contract ServiceTypeManager is InitializableV2, RegistryContract {
    RegistryInterface registry;
    address versionerAddress;

    /**
     * @dev - mapping of serviceType - serviceTypeVersion
     * Example - "discovery-provider" - ["0.0.1", "0.0.2", ..., "currentVersion"]
     */
    mapping(bytes32 => bytes32[]) public serviceTypeVersions;

    event SetServiceVersion(bytes32 _serviceType, bytes32 _serviceVersion);

    function initialize(address _registryAddress, address _versionerAddress) public initializer {
        // TODO move to RegistryContract as modifier
        require(_registryAddress != address(0x00), "Requires non-zero _registryAddress");
        registry = RegistryInterface(_registryAddress);
        versionerAddress = _versionerAddress;
        
        InitializableV2.initialize();
    }

    function setServiceVersion(bytes32 _serviceType, bytes32 _serviceVersion) external isInitialized {
        require(versionerAddress == msg.sender, "Invalid signature for versioner");

        uint numExistingVersions = this.getNumberOfVersions(_serviceType);

        for (uint i = 0; i < numExistingVersions; i++) {
            bytes32 existingVersion = this.getVersion(_serviceType, i);
            require(existingVersion != _serviceVersion, "Already registered");
        }

        serviceTypeVersions[_serviceType].push(_serviceVersion);

        emit SetServiceVersion(_serviceType, _serviceVersion);
    }

    function getVersion(bytes32 _serviceType, uint _versionIndex)
    external view isInitialized returns (bytes32 version)
    {
        require(
            serviceTypeVersions[_serviceType].length > _versionIndex,
            "No registered version of serviceType"
        );
        return (serviceTypeVersions[_serviceType][_versionIndex]);
    }

    function getCurrentVersion(bytes32 _serviceType)
    external view isInitialized returns (bytes32 currentVersion)
    {
        require(
            serviceTypeVersions[_serviceType].length >= 1,
            "No registered version of serviceType"
        );
        uint latestVersionIndex = serviceTypeVersions[_serviceType].length - 1;
        return (serviceTypeVersions[_serviceType][latestVersionIndex]);
    }

    function getNumberOfVersions(bytes32 _serviceType)
    external view isInitialized returns (uint)
    {
        return serviceTypeVersions[_serviceType].length;
    }
}
