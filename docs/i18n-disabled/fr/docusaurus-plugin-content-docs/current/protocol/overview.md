---
sidebar_label: Aperçu
sidebar_position: 1
---

# Aperçu

Audius est un protocole de partage de musique décentralisé, détenu par la communauté et contrôlé par les artistes. Audius offre une alternative basée sur la blockchain aux plateformes de streaming existantes pour aider les artistes à publier et monétiser leur travail et à le distribuer directement aux fans.

La mission du projet est de donner à chacun la liberté de partager, de monétiser et d'écouter n'importe quel fichier audio.

Le dépôt [Audius Protocol](https://github.com/AudiusProject/apps) est un dépôt mono-référentiel qui a toutes les pièces qui font et supportent le protocole, y compris les contrats intelligents, , et d'autres bibliothèques de support.

Si vous êtes intéressé par le fonctionnement d'un service, consultez la section [`exécutant un noeud`](../token/running-a-node/introduction.md). Si vous êtes intéressé à contribuer au protocole Audius, explorez le code ci-dessous!

![](/img/architecture.png)

Audius se compose de trois types d'utilisateurs : Les artistes (créateurs de contenu), les fans (consommateurs de contenu) et les fournisseurs de services. Certains utilisateurs vérifient les trois catégories d'utilisateurs !

* **Les artistes** téléchargent des titres, créent des albums et partagent du contenu avec leurs fans
* **Les fans** écoutent des titres, créent des listes de lecture, s'abonnent à des artistes et les suivent, et partagent du contenu avec leurs amis
* **Les prestataires de service** servent le trafic d'applications, diffusent des chansons et aident à sécuriser le réseau

Les prestataires de services peuvent fournir un ou plusieurs des services suivants en échangeant des jetons $AUDIO et en enregistrant leur service :

* Noeud d'exploration \(hébergez un endpoint avec le support SSL et enregistrez le point de terminaison avec stake\)
* Noeud de contenu \(hébergez un endpoint avec le support SSL et enregistrez le point de terminaison avec stake\)

Dans le schéma ci-dessus, les créateurs peuvent soit gérer eux-mêmes un nœud de contenu, soit utiliser l'un des nœuds de contenu enregistrés sur le réseau.

Pour plus de détails sur l'architecture Audius, voir le [ White Paper sur le protocole Audius](whitepaper.md).

## Services d'Audius

| Service                                                                                               | Description                                                                                                                                 |
|:----------------------------------------------------------------------------------------------------- |:------------------------------------------------------------------------------------------------------------------------------------------- |
| [`Nœud de contenu`](https://github.com/AudiusProject/apps/tree/main/creator-node)        | Maintenir la disponibilité du contenu des utilisateurs sur IPFS, y compris les métadonnées des utilisateurs, les images et le contenu audio |
| [`Noeud-Découverte`](https://github.com/AudiusProject/apps/tree/main/discovery-provider) | Indexe et stocke le contenu des contrats Audius sur la blockchain Ethereum pour que les clients puissent les interroger via une API         |
| [`Identité-Service`](https://github.com/AudiusProject/apps/tree/main/identity-service)   | Stocke les cryptogrammes d'authentification, effectue Twitter OAuth et relaie les transactions (paie le gas) au nom des utilisateurs        |

## Contrats Intelligents Audius & Libs

| Lib                                                                                           | Description                                                                                                                                                          |
|:--------------------------------------------------------------------------------------------- |:-------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`libs`](https://github.com/AudiusProject/apps/tree/main/libs)                   | Une interface simple vers le web décentralisé et les services Audius : Identity Service, Discovery Node (fournisseur de découverte), Content Node (nœud de création) |
| [`contracts`](https://github.com/AudiusProject/apps/tree/main/contracts)         | Les smart contract / contrats intelligent, en cours de développement pour le protocole de streaming Audius                                                           |
| [`eth-contracts`](https://github.com/AudiusProject/apps/tree/main/eth-contracts) | Les smart contract/ contrats intelligents Ethereum développés pour le protocole de streaming Audius                                                                  |

## Démarrage rapide pour les fournisseurs de services

Si vous êtes un fournisseur de services, un guide de démarrage rapide pour exécuter les services sur l'Audius peut être trouvé [ici](../token/running-a-node/introduction.md)
