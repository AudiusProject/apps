pragma solidity ^0.5.0;


/// @title The interface for contracts to interact with the Audius Service Provider Storage Contract
interface ServiceProviderStorageInterface {

  function register(
    bytes32 _serviceType,
    address _owner,
    string calldata _endpoint,
    address _delegateOwnerWallet
  ) external returns (uint);

  function deregister(
    bytes32 _serviceType,
    address _owner,
    string calldata _endpoint
  ) external returns (uint deregisteredSpID);

  function updateDelegateOwnerWallet(
    address _owner,
    bytes32 _serviceType,
    string calldata _endpoint,
    address _updatedDelegateOwnerWallet
  ) external returns (address);

  function getServiceProviderInfo(
    bytes32 _serviceType,
    uint _serviceId
  ) external view returns (address owner, string memory endpoint, uint blocknumber, address delegateOwnerWallet);

  function getServiceProviderIdFromEndpoint(
    string calldata _endpoint
  ) external view returns (uint);

  function getServiceProviderIdsFromAddress(
    address _ownerAddress,
    bytes32 _serviceType
  ) external view returns (uint[] memory);

  function getTotalServiceTypeProviders(
    bytes32 _serviceType
  ) external view returns (uint);

  function getDelegateOwnerWallet(
    address _owner,
    bytes32 _serviceType,
    string calldata _endpoint
  ) external view returns (address);

  function getNumberOfEndpointsFromAddress(address _ownerAddress)
  external view returns (uint);
}
