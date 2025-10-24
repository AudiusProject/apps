---
sidebar_label: Vista general
sidebar_position: 1
---

# Vista general

Audius es un protocolo descentralizado, propiedad de la comunidad y controlado por artistas para compartir música. Audius proporciona una alternativa basada en blockchain a las plataformas de streaming existentes para ayudar a los artistas a publicar y monetizar su trabajo y distribuirlo directamente a los fans.

La misión del proyecto es dar a todos la libertad de compartir, monetizar y escuchar cualquier audio.

El [repositorio](https://github.com/AudiusProject/apps) del Protocolo Audius es un mono-repositorio que tiene todas las piezas que hacen y soportan el protocolo incluyendo contratos inteligentes, servicios y otras bibliotecas de soporte.

Si está interesado en operar un servicio, consulte la sección [`ejecutando un nodo`](../token/running-a-node/introduction.md). Si estás interesado en contribuir al protocolo de Audius, ¡explora el siguiente código!

![](/img/architecture.png)

Audius consiste en tres gráficos: Artistas (creadores de contenido), Fanáticos (consumidores de contenido) y Proveedores de Servicios. ¡Algunos usuarios entran en los tres gráficos!

* **Artistas** suben canciones, crean álbumes y comparten contenido a los demas
* **Ventiladores** tracks de streams, crean listas de reproducción, suscribirse & seguir artistas y volver a compartir contenido a los demas
* **Proveedores de Servicio** sirven tráfico de aplicaciones, streams y ayudan a proteger la red

Los proveedores de servicios pueden proporcionar uno o más de los siguientes servicios haciendo stake de $AUDIO tokens y registrando su servicio:

* Nodo de Descubrimiento \(alojar un endpoint con soporte SSL y registrar endpoint con stake\)
* Nodo de contenido \(alojar un endpoint con soporte SSL y registrar endpoint con stake\)

En el diagrama anterior, los creadores pueden ejecutar un nodo de contenido ellos mismos o utilizar uno de los nodos de contenido registrados en red.

Para obtener más información sobre la arquitectura de Audius, consulte el [Whitepaper del protocolo Audius](whitepaper.md).

## Servicios de Audius

| Servicio                                                                                                      | Descripción                                                                                                                                   |
|:------------------------------------------------------------------------------------------------------------- |:--------------------------------------------------------------------------------------------------------------------------------------------- |
| [`Nodo de contenido`](https://github.com/AudiusProject/apps/tree/main/creator-node)              | Mantiene la disponibilidad del contenido de los usuarios en IPFS incluyendo metadatos de usuario, imágenes y contenido de audio               |
| [`Nodo de descubrimiento`](https://github.com/AudiusProject/apps/tree/main/discovery-provider)   | Indexa y almacena el contenido de los contratos de Audius en el blockchain de Ethereum para que los clientes lo consulten a través de una API |
| [`Servicio de identificación`](https://github.com/AudiusProject/apps/tree/main/identity-service) | Guarda cifrados de cifrado de autor, hace Twitter OAuth y transmite transacciones (paga gas) en nombre de los usuarios                        |

## Contratos inteligentes de Audius & librerías

| Lib                                                                                           | Descripción                                                                                                                                                                                 |
|:--------------------------------------------------------------------------------------------- |:------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`librerías`](https://github.com/AudiusProject/apps/tree/main/libs)              | Una interfaz fácil para los servicios distribuidos de web y audio: Servicio de identidad, Nodo de descubrimiento \(proveedor de descubrimiento\), Nodo de contenido \(nodo de creador\) |
| [`contratos`](https://github.com/AudiusProject/apps/tree/main/contracts)         | Los contratos inteligentes que se están desarrollando para el protocolo de streaming de Audius                                                                                              |
| [`contratos eth`](https://github.com/AudiusProject/apps/tree/main/eth-contracts) | Los contratos inteligentes de Ethereum que se están desarrollando para el protocolo de streaming de Audius                                                                                  |

## Servicio de Proveedor de Quickstart

Si usted es un proveedor de servicios, puede encontrar una guía de inicio rápido para ejecutar servicios en Audius [aquí](../token/running-a-node/introduction.md)
