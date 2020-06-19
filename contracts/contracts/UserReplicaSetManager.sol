pragma solidity ^0.5.0;

import "./interface/RegistryInterface.sol";
import "./registry/RegistryContract.sol";
import "./UserFactory.sol";
import "./SigningLogic.sol";


/** @title Contract for Audius user replica sets */
contract UserReplicaSetManager is RegistryContract, SigningLogic {

    RegistryInterface private registry = RegistryInterface(0);
    bytes32 private userFactoryRegistryKey;

    // TODO: Permission to special address if necessary
    address deployer;

    // spID to ServiceProvider delegateOwnerWallet
    mapping (uint => address) spIdToCreatorNodeDelegateWallet;

    // Struct used to represent replica sets
    // Each uint reprsets the spID registered on eth-contracts
    struct ReplicaSet {
        uint primary;
        uint[] secondaries;
    }

    // Current uint userId to Replica Set
    mapping (uint => ReplicaSet) artistReplicaSets;

    event UpdateReplicaSet(
        uint _userId,
        uint _primary,
        uint[] _secondaries
    );

    event AddOrUpdateCreatorNode(
        uint _newCnodeId,
        address _newCnodeDelegateOwnerWallet,
        uint _proposerSpId
    );

    /* EIP-712 */
    bytes32 constant ADD_UPDATE_CNODE_REQUEST_TYPEHASH = keccak256(
        "AddOrUpdateCreatorNode(uint newCnodeId,address newCnodeDelegateOwnerWallet,uint proposerSpId,bytes32 nonce)"
    );

    bytes32 constant UPDATE_REPLICA_SET_REQUEST_TYPEHASH = keccak256(
        "UpdateReplicaSet(uint userId,uint primary,bytes32 secondariesHash,uint oldPrimary,bytes32 oldSecondariesHash,bytes32 nonce)"
    );

    constructor(
        address _registryAddress,
        bytes32 _userFactoryRegistryKey,
        uint _networkId
    ) SigningLogic("User Replica Set Manager", "1", _networkId) public
    {
        require(
            _registryAddress != address(0x00) &&
            _userFactoryRegistryKey.length != 0,
            "Requires non-zero _registryAddress and registryKey"
        );

        registry = RegistryInterface(_registryAddress);
        userFactoryRegistryKey = _userFactoryRegistryKey;
        deployer = msg.sender;
    }

    // WIP - Update model allowing existing nodes to register others
    // From chain of trust based authentication scheme
    function addOrUpdateCreatorNode(
        uint _newCnodeId,
        address _newCnodeDelegateOwnerWallet,
        uint _proposerSpId,
        bytes32 _requestNonce,
        bytes calldata _subjectSig
    ) external
    {
        address signer = _recoverAddOrUpdateCreatorNodeRequestSignerAddress(
            _newCnodeId,
            _newCnodeDelegateOwnerWallet,
            _proposerSpId,
            _requestNonce,
            _subjectSig
        );

        // Requirements for non deployer address
        if (signer != deployer) {
            require(spIdToCreatorNodeDelegateWallet[_proposerSpId] == signer, "Mismatch proposer wallet for existing spID");
        }

        spIdToCreatorNodeDelegateWallet[_newCnodeId] = _newCnodeDelegateOwnerWallet;

        emit AddOrUpdateCreatorNode(_newCnodeId, _newCnodeDelegateOwnerWallet, _proposerSpId);
    }

    // TODO: Revisit delete logic - how to remove an spID <-> wallet combo entirely

    // Function used to permission updates to a given user's replica set
    function updateReplicaSet(
        uint _userId,
        uint _primary,
        uint[] calldata _secondaries,
        uint _oldPrimary,
        uint[] calldata _oldSecondaries,
        bytes32 _requestNonce,
        bytes calldata _subjectSig
    ) external
    {

        address signer = _recoverUserReplicaSetRequestSignerAddress(
            _userId,
            _primary,
            _secondaries,
            _oldPrimary,
            _oldSecondaries,
            _requestNonce,
            _subjectSig);

        // A valid updater can be one of the dataOwnerWallet, existing creator node, or contract deployer
        bool validUpdater = false;

        // Get user object from UserFactory
        (address userWallet, ) = UserFactory(
            registry.getContract(userFactoryRegistryKey)
        ).getUser(_userId);
        require(userWallet != address(0x00), "Valid user required");

        // Valid updaters include userWallet (artist account), existing primary, existing secondary, or contract deployer
        if (signer == userWallet ||
            signer == spIdToCreatorNodeDelegateWallet[_oldPrimary] ||
            signer == deployer
           )
        {
            validUpdater = true;
        }

        // Caller's notion of existing primary must match regisered value on chain
        require(
            artistReplicaSets[_userId].primary == _oldPrimary,
            "Invalid prior primary configuration"
        );

        validUpdater = _compareUserSecondariesAndCheckSender(
            _userId,
            _oldSecondaries,
            signer,
            validUpdater
        );
        require(validUpdater == true, "Invalid update operation");

        // Confirm primary and every incoming secondary is valid
        require(spIdToCreatorNodeDelegateWallet[_primary] != address(0x00), "Primary must exist");
        for (uint i = 0; i < _secondaries.length; i++) {
            require(
                spIdToCreatorNodeDelegateWallet[_secondaries[i]] != address(0x00),
                "Secondary must exist"
            );
        }

        // Perform replica set update
        artistReplicaSets[_userId] = ReplicaSet({
            primary: _primary,
            secondaries: _secondaries
        });

        emit UpdateReplicaSet(_userId, _primary, _secondaries);
    }

    // Return an artist's current replica set
    function getArtistReplicaSet(uint _userId) external view
    returns (uint primary, uint[] memory secondaries)
    {
        return (
            artistReplicaSets[_userId].primary,
            artistReplicaSets[_userId].secondaries
        );
    }

    // Get wallet corresponding to creator node
    function getCreatorNodeWallet(uint _spID) external view
    returns (address wallet)
    {
        return spIdToCreatorNodeDelegateWallet[_spID];
    }

    /* EIP712 - Signer recovery */
    function _recoverAddOrUpdateCreatorNodeRequestSignerAddress(
        uint _cnodeId,
        address _cnodeWallet,
        uint _proposerId,
        bytes32 _nonce,
        bytes memory _subjectSig
    ) internal returns (address)
    {
        bytes32 signatureDigest = generateSchemaHash(
            keccak256(
                abi.encode(
                    ADD_UPDATE_CNODE_REQUEST_TYPEHASH,
                    _cnodeId,
                    _cnodeWallet,
                    _proposerId,
                    _nonce
                )
            )
        );
        address signer = recoverSigner(signatureDigest, _subjectSig);
        burnSignatureDigest(signatureDigest, signer);
        return signer;
    }

    function _recoverUserReplicaSetRequestSignerAddress(
        uint _userId,
        uint _primary,
        uint[] memory _secondaries,
        uint _oldPrimary,
        uint[] memory _oldSecondaries,
        bytes32 _nonce,
        bytes memory _subjectSig
    ) internal returns (address)
    {
        bytes32 signatureDigest = generateSchemaHash(
            keccak256(
                abi.encode(
                    UPDATE_REPLICA_SET_REQUEST_TYPEHASH,
                    _userId,
                    _primary,
                    keccak256(abi.encode(_secondaries)),
                    _oldPrimary,
                    keccak256(abi.encode(_oldSecondaries)),
                    _nonce
                )
            )
        );
        address signer = recoverSigner(signatureDigest, _subjectSig);
        burnSignatureDigest(signatureDigest, signer);
        return signer;
    }

    function _compareUserSecondariesAndCheckSender(
        uint _userId,
        uint[] memory _oldSecondaries,
        address signer,
        bool senderFound
    ) internal view returns (bool)
    {
        // Caller's notion of secondary values must match registered value on chain
        // A secondary node can also be considered a valid updater
        require(
            _oldSecondaries.length == artistReplicaSets[_userId].secondaries.length,
            "Invalid prior secondary configuration"
        );
        bool secondarySenderFound = senderFound;
        for (uint i = 0; i < _oldSecondaries.length; i++) {
            require(
                artistReplicaSets[_userId].secondaries[i] == _oldSecondaries[i],
                "Invalid prior secondary configuration"
            );
            if (signer == spIdToCreatorNodeDelegateWallet[_oldSecondaries[i]]) {
                secondarySenderFound = true;
            }
        }
        return secondarySenderFound;
    }
}
