---
sidebar_label: Staking
sidebar_position: 2
---

# Staking

### What is Staking?

Built as a decentralized protocol on Ethereum, all the content, information and data on Audius is stored and indexed by a growing network of third-party node operators, rather than by the Audius team.

To ensure this content can be trusted and maintained, node operators are required to provide collateral or ‘stake’ as a bond to service the protocol. This stake, denominated in $AUDIO, ensures that node operators have tokens at risk that can be slashed, or taken, in the event of malicious or poor behavior.

By using $AUDIO tokens as collateral, anyone with the proper hardware requirements can join as a node operator in a completely permissionless fashion. The more $AUDIO staked to the protocol, the more secure the network becomes and the less vulnerable it is to outside attacks.

As a reward for servicing the network, node operators stand to earn $AUDIO through the automatic on-chain issuance, or the ongoing creation of new tokens distributed to value-added actors.

Those who stake more $AUDIO stand to earn a larger portion of issuance in exchange for securing the network.

### How Audius Works

On Audius, content is routed to two different types of nodes:

* _Content Nodes_ - To store and relay audio content \(tracks, mixes, etc.\) streamed on Audius
* _Discovery Nodes_ - To index and hash data like user profiles, playlists and followers.

As an artist, uploading to Audius feels no different than uploading to a platform like Soundcloud. But, what happens behind the scenes is what makes Audius so unique.

When an artist uploads a track to Audius:

1. That content is uploaded to a Content Node.
2. The data gets transcoded and returns a reference code used to identify the track
3. The data linked by the reference code is replicated to two other Content Nodes on the network.
4. An onchain transaction is published signifying that the track exists on Audius and that the metadata is attached to the profile that uploaded the track.
5. The transaction is picked up and indexed by a Discovery Node
6. The client returns that the track was successfully published when it shows up on the Discovery Node, marking the upload complete!

Super simple right! Well, this is where staking comes into play.

On other platforms, a similar process is operated by the parent company, effectively making them the true owner of the content. Should that company cease to exist, so does all the content stored in its database. With Audius, the track is maintained by the network and controlled by third-party and decentralized node operators. **Audius is not dependent on one company to keep running**.

**By staking $AUDIO, you’re helping to protect and power the protocol.**

This design allows Audius to operate on the back of a global network of third-party node operators, rather than solely by the Audius team.

The decision to use two node types allows Audius to scale in correlation to different metrics, meaning that if the number of listeners were to spike relative to the Audius catalog, Discovery Nodes could pick up the weight while the Content Nodes continue to run as normal. Similarly, the network could choose to adjust incentives depending on where bandwidth is needed to meet demand at any given time.

Talk about a platform adapting to the needs of its users!

### **Staking on Audius**

To stake on Audius, node operators can set up content and/or discovery nodes using [these resources](https://github.com/AudiusProject/apps/wiki/Staking-Resources).

https://twitter.com/Figment_io/status/1324763638729740288?s=20

A list of all active node operators can be found under the [Services tab](https://dashboard.audius.org/services) in the Audius protocol dashboard.

$AUDIO holders can delegate a minimum of 100 tokens to any of these node operators by connecting to either MetaMask or using a Gnosis Safe. More details on delegation will be released soon!

Node operators can choose to run either a Content Node, a Discovery Node or a combination of both. The amount of $AUDIO staked to a given Operator can be thought of as their economic bandwidth to run one or a combination of services on the network.

All node operators are required to post a **minimum self-bond of 200,000 $AUDIO tokens per node**. While both Content and Discovery Nodes utilize the same machine, Content Nodes require more storage and therefore cost slightly more to operate.

To this effect, the staking parameters of each node is as follows:

_Discovery Node_

* Minimum Bond (Stake): 200,000 AUDIO
* Maximum Bond (Stake): 7,000,000 AUDIO

_Content Node_

* Minimum Bond (Stake): 200,000 AUDIO
* Maximum Bond (Stake): 10,000,0000 AUDIO

The minimum stake ensures sufficient skin in the game, while the maximum prevents the protocol from becoming too centralized. Content nodes have slightly higher minimum requirements, which is why they are able to accept more stake than discovery nodes.

Each Operator is given a unique profile, allowing users to identify their address, timeline of votes, and the different nodes they maintain. Other key parameters include:

* _Staked $AUDIO_ - The total amount of $AUDIO staked across all the operator’s nodes, measured as a combination of tokens staked or delegated to a given address.
* _Deployer Cut_ - The percentage of staking rewards that delegates pay to node operators for staking $AUDIO on their node. This is configurable by the node operator.
* _Services_ - The number of unique nodes run by a given operator.
* _Delegators_ - The total number of unique addresses delegating tokens to the Operator.

Node operators can also populate their information via [3Box](https://3box.io/), displaying a profile image, title and website link to allow delegates to more easily distinguish themselves from others on the network.

Audius features a 7 day cooldown period to undelegate or unstake in order to provide adequate time for nodes to be slashed in the event of malicious behavior. During the genesis staking period, nodes operated by the Audius foundation will have their Deployer Cut set to 100%, with all proceeds being routed to a community treasury to be governed by $AUDIO tokenholders. These nodes will be retired in the near future.

### **$AUDIO Staking Rewards**

Audius features a 7% automatic annual issuance rate distributed on-chain and on a weekly basis. $AUDIO rewards are distributed directly on-chain to node operators, with the on-chain system deducting their Delegator Cut and routing the remaining rewards to those who delegated their tokens.

Service providers are expected to run one transaction per week to distribute issuance for the network, where tokens can be claimed in real time by individual node operators.

In the near future, $AUDIO issuance will begin to be computed from the call of the reward function. Moving forward, anyone in the network can call the reward function, with tokens being distributed on a weekly cadence and claimable at any time.

The rate, duration and parameters of $AUDIO staking are controlled entirely by governance.
