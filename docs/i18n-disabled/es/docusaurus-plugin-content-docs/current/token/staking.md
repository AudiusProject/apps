---
sidebar_label: Staking
sidebar_position: 2
---

# Staking

### ¿Qué es el Staking?

Construido como un protocolo descentralizado en Ethereum, todo el contenido, La información y los datos de Audius son almacenados e indexados por una red creciente de operadores de nodos de terceros, en lugar de por el equipo de Audius.

Para asegurar que este contenido puede ser confiado y mantenido, los operadores de nodos están obligados a proporcionar garantía o “participación” como un vínculo para prestar servicio al protocolo. Este Stake, denominado en $AUDIO, asegura que los operadores de nodos tengan tokens en riesgo que pueden ser barridos, o tomados, en caso de comportamiento malintencionado o deficiente.

Utilizando tokens de $AUDIO como garantía, cualquiera con los requisitos de hardware adecuados puede unirse como operador de nodos de una manera completamente inpermisiva. Cuantos más $AUDIO se pongan en stake en el protocolo, más segura será la red y menos vulnerable será a los ataques externos.

Como recompensa por el servicio de la red, los operadores de nodos ganarán $AUDIO a través de la emisión automática en cadena, o la creación en curso de nuevos tokens distribuidos a actores con valor agregado.

Quienes obtengan más $AUDIO ganarán una porción mayor de emisión a cambio de asegurar la red.

### Cómo funciona Audius

En Audius, el contenido se dirige a dos tipos diferentes de nodos:

* _Nodos de contenido_ - Para almacenar y transmitir contenido de audio \(canciones, mezclas, etc.\) streaming en Audius
* _Nodos de descubrimiento_ - Para indexar y hash datos como perfiles de usuario, listas de reproducción y seguidores.

Como artista, subir a Audius no tiene nada que ver con subirlo a una plataforma como Soundcloud. Pero lo que sucede detrás de las escenas es lo que hace que Audius sea tan único.

Cuando un artista sube una canción en Audius:

1. Ese contenido se sube a un nodo de contenido.
2. Los datos se transcodifican y devuelven un código de referencia utilizado para identificar la canción
3. Los datos enlazados por el código de referencia se replican a otros dos nodos de contenido en la red.
4. Se publica una transacción onchain que significa que la canción existe en Audius y que los metadatos se adjuntan al perfil que ha subido la pista.
5. La transacción es recogida e indexada por un nodo de descubrimiento
6. El cliente devuelve que la canción fue publicada con éxito cuando se muestra en el Nodo de Descubrimiento, marcando la carga completa!

¡Muy simple verdad! Pues bien, aquí es donde entra en juego el stake.

En otras plataformas, un proceso similar es operado por la empresa matriz, convirtiéndolos efectivamente en el verdadero propietario del contenido. En caso de que la empresa deje de existir, también lo hace todo el contenido almacenado en su base de datos. Con Audius, la pista es mantenida por la red y controlada por operadores de terceros y nodos descentralizados. **Audius no depende de una empresa para seguir funcionando**.

**Al hacer staking de $AUDIO, estás ayudando a proteger y impulsar el protocolo.**

Este diseño permite a Audius operar en la parte posterior de una red global de operadores de nodos de terceros, en lugar de hacerlo exclusivamente por parte del equipo de Audius.

La decisión de utilizar dos tipos de nodos permite a Audius escalar en correlación con diferentes métricas, lo que significa que si el número de oyentes aumentaran en relación con el catálogo de Audius, Los nodos de descubrimiento podrían cobrar el peso mientras que los nodos de contenido siguen funcionando de forma normal. De la misma manera, la red podría elegir ajustar los incentivos dependiendo de dónde se necesite el ancho de banda para satisfacer la demanda en cualquier momento dado.

¡Habla sobre una plataforma que se adapte a las necesidades de sus usuarios!

### **Staking en Audius**

Para hacer stake en Audio, los operadores de nodos pueden configurar contenido y/o nodos de descubrimiento usando [estos recursos](https://github.com/AudiusProject/apps/wiki/Staking-Resources).

https://twitter.com/Figment_io/status/1324763638729740288?s=20

Puede encontrar una lista de todos los operadores de nodos activos en la pestaña [Servicios](https://dashboard.audius.org/services) en el panel de control del protocolo de Audius.

Los poseedores de $AUDIO pueden delegar un mínimo de 100 tokens a cualquiera de estos operadores de nodos conectándose a MetaMask o usando una Gnosis Safe. Más detalles sobre la delegación serán publicados pronto!

Los operadores de nodos pueden elegir ejecutar un Nodo de Contenido, un Nodo de Descubrimiento o una combinación de ambos. La cantidad de $AUDIO en stake a un operador determinado puede ser considerada como su ancho de banda económico para ejecutar una o una combinación de servicios en la red.

Todos los operadores de nodos están obligados a publicar un **auto-enlace mínimo de 200.000 $AUDIO tokens por nodo**. Mientras tanto los nodos de contenido y descubrimiento utilizan la misma máquina, los nodos de contenido requieren más almacenamiento y, por lo tanto, cuestan un poco más para operar.

A tal efecto, los parámetros de stake de cada nodo son los siguientes:

_Nodo de descubrimiento_

* Vínculo mínimo (Stake): 200.000 AUDIO
* Vínculo Máximo (Stake): 7,000.000 AUDIO

_Nodo de contenido_

* Vínculo mínimo (Stake): 200.000 AUDIO
* Vínculo Máximo (Stake): 10,000.0000 AUDIO

El Stake mínimo asegura suficiente piel en el juego, mientras que el máximo impide que el protocolo se vuelva demasiado centralizado. Los nodos de contenido tienen requisitos mínimos ligeramente superiores, por lo que son capaces de aceptar más participación que los nodos de descubrimiento.

Cada operador recibe un perfil único, que permite a los usuarios identificar su dirección, cronología de votos, y los diferentes nodos que mantenen. Otros parámetros clave incluyen:

* _$AUDIO en Stake_ - La cantidad total de $AUDIO en stake en todos los nodos del operador, medido como una combinación de tokens en stake o delegadas a una determinada dirección.
* _Corte del desplegador_ - El porcentaje de las recompensas de stake que los delegados pagan a los operadores de nodos por hacer staking $AUDIO en su nodo. Esto es configurable por el operador de nodos.
* _Servicios_ - El número de nodos únicos ejecutados por un operador determinado.
* _Delegadores_ - El número total de direcciones únicas delegando tokens al Operador.

Los operadores de nodos también pueden llenar su información a través de [3Box](https://3box.io/), mostrando una imagen de perfil, título y enlace al sitio web para permitir a los delegados distinguirse más fácilmente de los demás de la red.

Audius presenta un período de tiempo de reutilización de 7 días para remover la delegación o el stake con el fin de proporcionar un tiempo adecuado para que los nodos sean barridos en caso de comportamiento malicioso. Durante el período de stake, los nodos operados por la Fundación Audius tendrán su Corte de Desplegador fijado a 100%, con todos los ingresos siendo enrutados a una tesorería comunitaria para ser gobernados por $AUDIO tokenholders. Estos nodos se retirarán en un futuro cercano.

### **Recompensas por Staking de $AUDIO**

Audius ofrece una tasa de emisión automática del 7% anual distribuida en cadena y semanalmente. Las Recompensas de $AUDIO se distribuyen directamente en cadena a los operadores de nodos, con el sistema en cadena deduciendo su corte de delegado y dirigiendo las recompensas restantes a los que delegaron sus fichas.

Se espera que los proveedores de servicios ejecuten una transacción por semana para distribuir emisión para la red, donde las fichas pueden ser reclamadas en tiempo real por los operadores individuales de nodos.

En un futuro cercano, la emisión de $AUDIO comenzará a ser calculada a partir de la llamada de la función de recompensa. En el futuro, cualquiera que esté en la red puede llamar a la función de recompensa, con los tokens distribuidos en una cadencia semanal y cobrable en cualquier momento.

La tasa, la duración y los parámetros del stake de $AUDIO están controlados completamente por la gobernanza.
