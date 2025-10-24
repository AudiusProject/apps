---
sidebar_label: Instructions d'installation
sidebar_position: 3
---

# Instructions d'installation

Ce guide décrit comment exécuter les services Audius sur un groupe Kubernetes à un seul nœud. Des notes sur les cluster multi-nœuds sont données si nécessaire.

Rejoignez le canal discord de l'opérateur du nœud sur le serveur discord [d'Audius](https://discord.com/invite/audius)



## 0. Clonez le dépôt audius-k8s-manifests

[**https://github.com/AudiusProject/audius-k8s-manifests**](https://github.com/AudiusProject/audius-k8s-manifests)\*\*\*\*



```text
git clone git@github.com:AudiusProject/audius-k8s-manifests.git
```




## 1. Configuration du cluster

Initialiser une machine exécutant Ubuntu 16.04 LTS ou plus, avec au moins 8 vCPU et 16 Go de RAM.

Un script de facilitation est également inclus pour faire une configuration de nœud kubeadm en un clic. Vous pouvez exécuter. Vous pouvez exécuter



```text
yes | sh setup.sh
```


Cependant, si l'installation du nœud ne réussit pas et que kubectl n'est pas disponible, il est conseillé de suivre les étapes d'installation à la main [ici](https://github.com/AudiusProject/audius-k8s-manifests/blob/main/cluster-setup.md).



## 2. Audius CLI Setup

Vous pouvez ignorer cette section si vous installez pour la première fois.

Vous pouvez installer `audius-cli` avec



```text
sh install_audius_cli.sh
```


Vous pouvez ensuite afficher toutes les commandes disponibles via `audius-cli` en exécutant simplement :



```text
audius-cli -h
```




## 3. Stockage

Fournir un répertoire hôte partagé pour le stockage persistant,



```text
mkdir -p /var/k8s
```


Si sudo était requis, changez la propriété avec ,



```text
sudo chown <user>:<group> /var/k8s
```


typiquement cela sera,



```text
sudo chown -R ubuntu:ubuntu /var/k8s
```


**Remarque** Le stockage persistera sur l'hôte même après avoir supprimé `pv, pvc` les objet .

Pour effacer toutes les données et repartir à zéro,



```text
rm -rf /var/k8s/*
```




## 4. Configuration du service

Voir ci-dessous un guide de déploiement du [Creator Node](https://github.com/AudiusProject/audius-k8s-manifests#creator-node-1) et [Discovery Provider](https://github.com/AudiusProject/audius-k8s-manifests#discovery-provider-1) via `audius-cli`. Après avoir terminé la configuration du service, veuillez continuer avec la section Logger.

**Remarque** "Creator Node" et "Discovery Provider" ont récemment été renommés respectivement par "Content Node" et "Discovery Node". Cependant, pour des raisons de cohérence dans le code et dans ce README, nous continuerons à utiliser les termes "Creator Node" et "Discovery Node".



### Creator Node

Un Creator Node Audius maintient la disponibilité du contenu des créateurs sur IPFS.

Les informations stockées comprennent les métadonnées des utilisateurs d'Audius, les images et le contenu audio. Le contenu est soutenu par un répertoire local.

**Remarque**à l'avenir, le service sera étendu pour traiter les demandes de ré encryptage par proxy des clients utilisateurs et prendre en charge d'autres backends de stockage.



#### Exécuter

Utilisez `audius-cli` pour mettre à jour les variables requises. La liste complète des variables et des explications peut être trouvée sur le wiki [ici](https://github.com/AudiusProject/apps/wiki/Content-Node:-Configuration-Details#required-environment-variables).

Certaines variables doivent être définies, vous pouvez le faire avec les commandes suivantes :



```text
audius-cli set-config creator-node backend
key   : spOwnerWallet
value : <address of wallet that contains audius tokens>

audius-cli set-config creator-node backend
key   : delegateOwnerWallet
value : <address of wallet that contains no tokens but that is registered on chain>

audius-cli set-config creator-node backend
key   : delegatePrivateKey
value : <private key>

audius-cli set-config creator-node backend
key   : creatorNodeEndpoint
value : <your service url>
```


**Remarque:** si vous n'avez pas encore enregistré le service, veuillez entrer l'url que vous prévoyez d'enregistrer pour `creatorNodeEndpoint`.

Ensuite, exécutez la commande de lancement via `audius-cli`



```text
audius-cli launch creator-node --configure-ipfs
```


Vérifiez que le service est correct en l'exécutant,



```text
audius-cli health-check creator-node
```




#### Mise à jour

Si vous n'avez `audius-cli`, les instructions pour l'installer sont disponibles dans [la section ci-dessus](https://github.com/AudiusProject/audius-k8s-manifests#2-audius-cli-setup).

Pour mettre à jour votre service en utilisant `audius-cli`, vous devrez récupérer le dernier code manifeste. Vous pouvez le faire avec `audius-cli`



```text
audius-cli upgrade
```


Vérifiez que le service est correct en l'exécutant,



```text
audius-cli health-check creator-node
```


**Ancien flux de mise à niveau avec kubectl:** Pour mettre à niveau votre service en utilisant `kubectl`, vous aurez besoin de récupérer le dernier `k8s-manifests` code. Pour cela, exécutez ce qui suit,



```text
git stash
git pull
git stash apply
```


Assurez-vous que vos configurations sont présentes dans `audius/creator-node/creator-node-cm.yaml`, puis faites ce qui suit,



```text
k apply -f audius/creator-node/creator-node-cm.yaml
k apply -f audius/creator-node/creator-node-deploy-ipfs.yaml
k apply -f audius/creator-node/creator-node-deploy-backend.yaml
```


Vous pouvez vérifier votre mise à jour avec le endpoint. `\health_check`.



### Discovery Provider

Un Discovery Provider Audius indexe le contenu des contrats Audius sur la blockchain Ethereum pour que les clients puissent les interroger.

Le contenu indexé comprend des informations sur l'utilisateur, la piste et l'album/la liste de lecture ainsi que des fonctionnalités sociales. Les données sont stockées pour un accès rapide, mises à jour à intervalles réguliers et mises à la disposition des clients via une RESTful API.



#### Exécuter

Certaines variables doivent être définies, vous pouvez le faire avec les commandes suivantes :



```text
audius-cli set-config discovery-provider backend
key   : audius_delegate_owner_wallet
value : <delegate_owner_wallet>

audius-cli set-config discovery-provider backend
key   : audius_delegate_private_key
value : <delegate_private_key>
```


Si vous utilisez une base de données Postgres gérée en externe \(version 11.1+), remplacez l'url de la base de données par



```text
audius-cli set-config discovery-provider backend
key   : audius_db_url
value : <audius_db_url>

audius-cli set-config discovery-provider backend
key   : audius_db_url_read_replica
value : <audius_db_url_read_replica>
```


**Remarque:** S'il n'y a pas de réplique en lecture, entrez l'url de la base de données primaire pour les deux variables d'environnement.

Les indications ci-dessous ne sont valables que si vous utilisez une base de données posgres gérée :

Vous devrez également remplacer la tâche db seed dans `audius/discovery-provider/discovery-provider-provider-db-seed-job.yaml`. Des exemples sont fournis. Dans la base de données postgres gérée, définissez l'indicateur temp_file_limit à 2147483647 et exécutez la commande SQL suivante sur la base de données de destination.



```text
CREATE EXTENSION pg_trgm;
```


Assurez-vous que votre service expose toutes les variables d'environnement requises. Voir le wiki [ici ](https://github.com/AudiusProject/apps/wiki/Discovery-Node:-Configuration-Details#required-environment-variables) pour la liste complète des variables d'environnement et leurs descriptions.



#### Lancement



```text
audius-cli launch discovery-provider --seed-job --configure-ipfs
```


Vérifiez que le service est correct en l'exécutant,



```text
audius-cli health-check discovery-provider
```




#### Mise à jour

Si vous n'avez `audius-cli`, les instructions pour l'installer sont disponibles dans [la section ci-dessus](https://github.com/AudiusProject/audius-k8s-manifests#2-audius-cli-setup).

Pour mettre à jour votre service en utilisant `audius-cli`, vous devrez récupérer le dernier code manifeste. Vous pouvez le faire avec `audius-cli`



```text
audius-cli upgrade
```


Vérifiez que le service est correct en l'exécutant,



```text
audius-cli health-check discovery-provider
```


**Ancien flux de mise à niveau avec kubectl:** Pour mettre à niveau votre service en utilisant kubectl, vous aurez besoin de récupérer le dernier `k8s-manifests` code. Pour cela, exécutez ce qui suit,



```text
git stash
git pull
git stash apply
```


Assurez-vous que vos configurations sont présentes dans `audius/creator-node/discovery-provider-cm.yaml`, puis faites ce qui suit,



```text
k apply -f audius/discovery-provider/discovery-provider-cm.yaml
k apply -f audius/discovery-provider/discovery-provider-deploy.yaml
```


Vous pouvez vérifier votre mise à jour avec le endpoint. `\health_check`.



#### Suivant

Une fois que vous avez terminé la configuration du Discovery Provider, continuez vers la section [Logger](https://github.com/AudiusProject/audius-k8s-manifests#logger).




## 5. Logger

Afin d'aider au débogage. Nous proposons un service de journalisation que vous pouvez publier.

**Exécuter**

Tout d'abord, obtenez les secrets des fournisseurs de services auprès de votre interlocuteur chez Audius. Ceci contient le Token requis \(s\) pour que la connexion fonctionne. Et appliquer le secret avec



```text
kubectl apply -f <secret_from_audius>.yaml
```


Ensuite, mettez à jour les balises de journalisation dans le daemonset fluentd avec votre nom, afin que nous puissions vous identifier vous et votre service de façon unique ici : [https://github.com/AudiusProject/audius-k8s-manifests/blob/main/audius/logger/logger.yaml\#L207](https://github.com/AudiusProject/audius-k8s-manifests/blob/main/audius/logger/logger.yaml#L207). Cela permet à notre service de journalisation de filtrer les logs par fournisseur de service et par fournisseur de service et service. `SP_NAME` fait référence au nom de votre organisation et `SP_NAME_TYPE_ID` fait référence au nom de votre organisation plus au type de service que vous utilisez, plus un id pour distinguer plusieurs services du même type.

Par exemple, si votre nom est `Génial Opérateur` et que vous exécutez un noeud de contenu, définissez les balises comme :



```text
...
env:
- name: LOGGLY_TAGS
  value: external,Awesome-Operator,Awesome-Operator-Content-1
```


Le nombre à la fin du dernier tag \(`Awesome-Operator-Content-1`\) est utilisé si vous avez plus d'un content node u ou un discovery node, afin que vous puissiez identifier chaque service de manière unique. Par exemple, si vous exécutez deux content nodes, sur votre deuxième nœud de contenu, vous pouvez définir les balises comme suit :



```text
...
env:
- name: LOGGLY_TAGS
  value: external,Awesome-Operator,Awesome-Operator-Content-2
```


Une fois que vous avez mis à jour les tags, appliquez la pile de journalisation avec la commande :



```text
kubectl apply -f audius/logger/logger.yaml
```


**Mise à jour**

Il y a deux commandes pour mettre à jour la pile de logging.



```text
kubectl apply -f audius/logger/logger.yaml

kubectl -n kube-system delete pod $(kubectl -n kube-system get pods | grep "fluentd" | awk '{print $1}')
```





## 6. Sécurité & Configuration de l'infrastructure

1.\) Pour que les clients puissent parler à votre service, vous devrez exposer deux ports : le port du serveur web et le port de l'essaim IPFS. Pour trouver ces ports, exécutez `kubectl get svc`. Le port du serveur web est mappé à 4000 pour le noeud créateur et 5000 pour le fournisseur de découverte. Le port de l'essaim IPFS est mappé à 4001



```text
kubectl get svc

NAME                             TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)                                        AGE
discovery-provider-backend-svc   NodePort    10.98.78.108    <none>        5000:31744/TCP                                 18h
discovery-provider-cache-svc     ClusterIP   10.101.94.71    <none>        6379/TCP                                       18h
discovery-provider-db-svc        ClusterIP   10.110.50.147   <none>        5432/TCP                                       18h
discovery-provider-ipfs-svc      NodePort    10.106.89.157   <none>        4001:30480/TCP,5001:30499/TCP,8080:30508/TCP   18h
kubernetes                       ClusterIP   10.96.0.1       <none>        443/TCP                                        7d5h

In this case, the web server port is 31744 and the IPFS port is 30480.
```


2.\) Une fois ces ports exposés, vous devriez être en mesure de lancer publiquement le contrôle de qualité via l'IP publique de votre instance ou de votre équilibreur de charge. L'étape suivante consiste à enregistrer un enregistrement DNS. Il est recommandé de mapper le port du serveur web sur le DNS et d'avoir un domaine ou un sous-domaine pour chaque service que vous exécutez. Assurez-vous également que le trafic n'est pas autorisé sans HTTPS. Tout le trafic non HTTPS doit être redirigé vers le port HTTPS.

3.\) Nous allons maintenant configurer IPFS.

IPFS a quelques difficultés à identifier l'hôte public et le port dans kubernetes, cela peut être corrigé avec `audius-cli`



```text
audius-cli configure-ipfs <hostname>
```


Exemple : `audius-cli configure-ipfs 108.174.10.10`

4.\) Définir le délai d'attente de l'équilibreur de charge. Les délais minimum sont 1 heure \(3600 secondes\) pour les requêtes de Creator Node et 1 minutes \(60 secondes\) pour les requêtes de Discovery Provider. Le téléchargement de pistes, en particulier pour les gros fichiers, peut prendre plusieurs minutes.

5.\) En plus de configurer vos groupes de sécurité pour restreindre l'accès au seul serveur web et au port d'essaim IPFS \(4001\\), Il est recommandé que votre serveur ou votre répartiteur de charge soit protégé contre les attaques DoS. Des services tels que Cloudfront et Cloudflare offrent des services gratuits ou peu coûteux pour ce faire. Il serait également possible d'utiliser iptables pour configurer la protection comme indiqué ici [https://javapipe.com/blog/iptables-ddos-protection/](https://javapipe.com/blog/iptables-ddos-protection/). Veuillez vous assurer que les proxies ne remplacent pas les délais de l'étape 4.



## 7. Contrôles de pré-inscription

Avant d'enregistrer un service dans le tableau de bord, nous devons nous assurer que le service est correctement configuré. Suivez les contrôles ci-dessous pour le type de service que vous configurez. Si l'on ne vérifie pas que tous ces éléments fonctionnent correctement, les actions de l'utilisateur risquent d'échouer et de donner lieu à des actions de slashing.

Le dossier `sp-actions/` contient des scripts qui testent la qualité des services. Effectuez les vérifications correspondantes de votre type de service ci-dessous pour vérifier que votre service est correctement configuré. Assurez-vous d'exécuter `npm install` dans `sp-actions/` pour installer toutes les dépendances.

Pour plus d'informations sur `sp-actions/` voir README dans le dossier [sp-actions/](https://github.com/AudiusProject/audius-k8s-manifests/tree/main/sp-utilities)

**Creator Node**



```text
➜ pwd
/Audius/audius-k8s-manifests/sp-utilities/creator-node

# entering creatorNodeEndpoint and delegatePrivateKey sends those values as env vars to the script without having to export to your terminal
➜ creatorNodeEndpoint=https://creatornode.domain.co delegatePrivateKey=5e468bc1b395e2eb8f3c90ef897406087b0599d139f6ca0060ba85dcc0dce8dc node healthChecks.js
Starting tests now. This may take a few minutes.
✓ Health check passed
✓ DB health check passed
✓ Heartbeat duration health check passed
! Non-heartbeat duration health check timed out at 180 seconds with error message: "Request failed with status code 504". This is not an issue.
All checks passed!
```


Si vous voyez le message "Erreur lors de l'exécution du script" ce script ne s'est pas terminé. Si vous voyez "Toutes les vérifications sont réussies!" ce script s'est terminé avec succès.

**Discovery Provider**



```text
➜ discoveryProviderEndpoint=https://discoveryprovider.domain.co node healthChecks.js
✓ Health check passed
All checks passed!
```


Si vous voyez le message "Erreur lors de l'exécution du script" ce script ne s'est pas terminé. Si vous voyez "Toutes les vérifications sont réussies!" ce script s'est terminé avec succès.



## 8. Enregistrez le service sur le tableau de bord

Puisque vous avez accompli toutes les étapes jusqu'à présent, vous êtes prêt à vous inscrire !

Vous pouvez vous inscrire via le tableau de bord sur [https://dashboard.audius.org](https://dashboard.audius.org/)



## 9. Script pour initier les cycles et traiter les réclamations \(Optional\)

Si vous souhaitez exécuter automatiquement les opérations de réclamation à chaque fois qu'un nouveau tour est lancé, un script est inclus pour votre commodité dans le dossier sp-utilities/claim. Des instructions supplémentaires sont fournies dans le README de sp-utilities.
