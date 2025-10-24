---
sidebar_label: Instrucciones de configuración
sidebar_position: 3
---

# Instrucciones de configuración

Esta guía describe cómo ejecutar los servicios de Audius en un clúster Kubernetes de un solo nodo. Las notas sobre clusters multi nodos son proporcionadas como relevantes.

Únete al canal de discord de operadores de nodo en el [servidor de discord de audio](https://discord.com/invite/audius)

## 0. Clonar el repositorio audio-k8 manifests
[**https://github.com/AudiusProject/audius-k8s-manifests**](https://github.com/AudiusProject/audius-k8s-manifests)\*\*\*\*

```text
git clone git@github.com:AudiusProject/audius-k8s-manifests.git
```

## 1. Configurar Clúster

Inicializar una máquina con Ubuntu 16.04 LTS o superior, con al menos 8 vCPUs y 16 GB de RAM.

También se incluye un script de conveniencia para hacer una configuración de nodo kubeadm "un clic". Usted puede ejecutar

```text
yes | sh setup.sh
```

Sin embargo, si la configuración del nodo no es exitosa y kubectl no está disponible, se aconseja seguir los pasos de instalación manual [aquí](https://github.com/AudiusProject/audius-k8s-manifests/blob/main/cluster-setup.md).

## 2. Audius CLI Setup

Puede omitir esta sección si instala por primera vez.

Puedes instalar `audius-cli` con

```text
sh install_audius_cli.sh
```

A continuación, puede ver todos los comandos disponibles a través de `audius-cli` simplemente ejecutando:

```text
audius-cli -h
```

## 3. Almacenamiento

Proporcionar un directorio de host compartido para almacenamiento persistente,

```text
mkdir -p /var/k8s
```

Si sudo fue requerido, cambie la propiedad con,

```text
sudo chown <user>:<group> /var/k8s
```

normalmente esto será,

```text
sudo chown -R ubuntu:ubuntu /var/k8s
```

**Nota:** El almacenamiento persistirá en el host incluso después de eliminar objetos `pv, pvc`.

Para nuclear todos los datos y comenzar limpio,

```text
rm -rf /var/k8s/*
```

## 4. Configuración de servicio

Mira abajo una guía para desplegar [Nodo de creador](https://github.com/AudiusProject/audius-k8s-manifests#creator-node-1) y [Proveedor de descubrimiento](https://github.com/AudiusProject/audius-k8s-manifests#discovery-provider-1) a través de `audius-cli`. Después de terminar de configurar el servicio, por favor continúe con la sección de Logger.

**Nota:** "Nodo de creador" y "Proveedor de descubrimiento" recientemente han sido renombrados a "Nodo de contenido" y "Nodo de descubrimiento" respectivamente. Sin embargo, para la consistencia dentro del código y este README, continuaremos usando los términos "Nodo de creador" y "Nodo de descubrimiento".

### Nodo Creador

Un Nodo de Creador de Audius mantiene la disponibilidad del contenido de los creadores en IPFS.

La información almacenada incluye metadatos de usuario de Audius, imágenes y contenido de audio. El contenido está respaldado por un directorio local.

**Nota:** En el futuro, el servicio se extenderá para manejar peticiones de recifrado de proxy de clientes de usuario final y soportar otros backends.

#### Ejecutar

Use `audius-cli` para actualizar las variables requeridas. La lista completa de variables y explicaciones puede encontrarse en la wiki [aquí](https://github.com/AudiusProject/apps/wiki/Content-Node:-Configuration-Details#required-environment-variables).

Se deben establecer algunas variables, puedes hacer esto con los siguientes comandos:

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

**Nota:** si aún no has registrado el servicio, introduce la url que planeas registrar en `creatorNodeEndpoint`.

A continuación, ejecuta el comando de inicio a través de `audius-cli`

```text
audius-cli launch creator-node --configure-ipfs
```

Verifique que el servicio está en buen estado ejecutando,

```text
audius-cli health-check creator-node
```

#### Actualizar

Si no tienes `audius-cli`, las instrucciones de instalación están disponibles en [la sección anterior](https://github.com/AudiusProject/audius-k8s-manifests#2-audius-cli-setup).

Para actualizar tu servicio usando `audius-cli`, necesitarás sacar el último código del manifiesto. Puedes hacerlo con `audius-cli`

```text
actualización audius-cli
```

Verifique que el servicio está en buen estado ejecutando,

```text
audius-cli health-check creator-node
```

**Flujo de Actualización anterior con kubectl:** Para actualizar su servicio usando `kubectl`, necesitarás extraer el último código `k8s-manifests`. Para hacer esto, ejecute lo siguiente,

```text
git stash
git pull
git stash apply
```

Asegúrate de que tus configuraciones estén presentes en `audius/creator-node/creator-node-cm.yaml`, luego haz lo siguiente,

```text
k aplicar -f audius/creator-node/creator-node-cm.yaml
k aplicar -f audius/creator-node/creator-node-deploy-ipfs.yaml
k aplicar -f audius/creator-node/creator-node-deploy-backend.yaml
```

Puede verificar su actualización con el punto final `\health_check`.

### Proveedor de descubrimiento

Un Proveedor de Descubrimiento de Audius indexa el contenido de los contratos de Audius en la blockchain de Ethereum para que los clientes lo consulten.

El contenido indexado incluye información sobre el usuario, la canci´pn y el álbum/lista de reproducción junto con las características sociales. Los datos se almacenan para un acceso rápido, se actualizan a través de un intervalo regular y se ponen a disposición de los clientes a través de un API RESTful.

#### Ejecutar

Se deben establecer algunas variables, puedes hacer esto con los siguientes comandos:

```text
audius-cli set-config discovery-provider backend
key   : audius_delegate_owner_wallet
value : <delegate_owner_wallet>

audius-cli set-config discovery-provider backend
key   : audius_delegate_private_key
value : <delegate_private_key>
```

Si está utilizando una base de datos de Postgres administrada externamente \(versión 11.1+\), reemplace la url db con,

```text
audius-cli set-config discovery-provider backend
key   : audius_db_url
value : <audius_db_url>

audius-cli set-config discovery-provider backend
key   : audius_db_url_read_replica
value : <audius_db_url_read_replica>
```

**Nota:** Si no hay replicas de lectura, introduzca la url principal de db para ambas vars.

Lo siguiente es sólo si se usa una base de datos de posgres administrada:

Tendrá que reemplazar el trabajo de la semilla en `audius/discovery-provider/discovery-provider-db-seed-job.yaml`. Se ofrecen ejemplos. En la base de datos postgres administrada y establezca la bandera `temp_file_limit` a `2147483647` y ejecute el siguiente comando SQL en el db de destino.

```text
CREAR EXTENIÓN pg_trgm;
```

Asegúrese de que su servicio expone todas las variables de entorno requeridas. Ver wiki [aquí](https://github.com/AudiusProject/apps/wiki/Discovery-Node:-Configuration-Details#required-environment-variables) para ver la lista completa de variables y descripciones.

#### Iniciar

```text
audius-cli launch discovery-provider --seed-job --configure-ipfs
```

Verifique que el servicio está en buen estado ejecutando,

```text
audius-cli health-check discovery-provider
```

#### Actualizar

Si no tienes `audius-cli`, las instrucciones de instalación están disponibles en [la sección anterior](https://github.com/AudiusProject/audius-k8s-manifests#2-audius-cli-setup).

Para actualizar tu servicio usando `audius-cli`, necesitarás sacar el último código del manifiesto. Puedes hacerlo con `audius-cli`

```text
actualización audius-cli
```

Verifique que el servicio está en buen estado ejecutando,

```text
audius-cli health-check discovery-provider
```

**Flujo de Actualización anterior con kubectl:** Para actualizar su servicio usando kubectl, necesitarás extraer el último código `k8s-manifests`. Para hacer esto, ejecute lo siguiente,

```text
git stash
git pull
git stash apply
```

Asegúrate de que tus configuraciones estén presentes en `audius/creator-node/discovery-provider-cm.yaml`, luego haz lo siguiente,

```text
k aplicar -f audius/discovery-provider/discovery-provider-cm.yaml
k apply -f audius/discovery-provider/discovery-provider-deploy.yaml
```

Puede verificar su actualización con el punto final `\health_check`.

#### Siguiente

Una vez que haya terminado de configurar el Discovery Provider, continúe a la sección de [Logger](https://github.com/AudiusProject/audius-k8s-manifests#logger).


## 5. Logger

Con el fin de asistir en cualquier depuración. Proporcionamos un servicio de registro en el que usted puede publicar.

**Ejecute**

Primero, obtenga los secretos del proveedor de servicios de su contacto en Audius. Contiene el token requerido\(s\) para que el registro funcione. Y aplicar el secreto con

```text
kubectl aplicar -f <secret_from_audius>.yaml
```

A continuación, actualice las etiquetas logger en el daemonset fluentd con su nombre, para que podamos identificarle a usted y a su servicio de forma única aquí: [https://github. om/AudiusProject/audio k8s-manifests/blob/main/audius/logger/logger.yaml\#L207](https://github.com/AudiusProject/audius-k8s-manifests/blob/main/audius/logger/logger.yaml#L207). Esto permite que nuestro servicio de registro filtre los registros por el proveedor de servicios y por el proveedor de servicios y el servicio. `SP_NAME` se refiere al nombre de su organización y `SP_NAME_TYPE_ID` se refiere al nombre de su organización más el tipo de servicio que está ejecutando, más un id para distinguir varios servicios del mismo tipo.

Por ejemplo, si tu nombre es `Awesome Operator` y estás ejecutando un nodo de contenido, establece las etiquetas como:

```text
...
env:
- name: LOGLY_TAGS
  value: external,Awesome-Operator,Awesome-Operator-Content-1
```

El número al final de la última etiqueta \(`Awesome-Operator-Content-1`\) se utiliza si tiene más de un nodo de contenido o nodo de descubrimiento, para que pueda identificar cada servicio de forma única. Por ejemplo, si ejecuta dos nodos de contenido, en su segundo nodo de contenido, puede establecer las etiquetas como:

```text
...
env:
- name: LOGLY_TAGS
  value: external,Awesome-Operator,Awesome-Operator-Content-2
```

Una vez que haya actualizado las etiquetas, aplique la pila fluentd logger con el comando:

```text
kubectl aplicar -f audio/logger/logger.yaml
```

**Actualizar**

Hay dos comandos para actualizar la pila de registro.

```text
kubectl apply -f audius/logger/logger.yaml

kubectl -n kube-system delete pod $(kubectl -n kube-system get pods | grep "fluentd" | awk '{print $1}')
```


## 6. Seguridad & Configuración de infraestructura

1.\) Para que los clientes puedan hablar con su servicio, deberá exponer dos puertos: el puerto del servidor web y el puerto del swarm IPFS. Para encontrar estos puertos, ejecuta `kubectl get svc`. El puerto del servidor web se mapea a 4000 para el nodo creador y 5000 para el proveedor de descubrimiento. El puerto de swarm IPFS está mapeado a 4001

```text
kubectl get svc

NAME                             TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)                                        AGE
discovery-provider-backend-svc   NodePort    10.98.78.108    <none>        5000:31744/TCP                                 18h
discovery-provider-cache-svc     ClusterIP   10.101.94.71    <none>        6379/TCP                                       18h
discovery-provider-db-svc        ClusterIP   10.110.50.147   <none>        5432/TCP                                       18h
discovery-provider-ipfs-svc      NodePort    10.106.89.157   <none>        4001:30480/TCP,5001:30499/TCP,8080:30508/TCP   18h
kubernetes                       ClusterIP   10.96.0.1       <none>        443/TCP                                        7d5h

En este caso, el puerto del servidor web es 31744 y el puerto IPFS es 30480.
```

2.\) Una vez que exponga estos puertos, debería ser capaz de golpear públicamente el chequeo de estado a través de la IP pública de su instancia o balanceador de carga. El siguiente paso es registrar un registro DNS. Se recomienda que asigne el puerto del servidor web el DNS y tenga un dominio o subdominio por cada servicio que esté ejecutando. También asegúrese de que el tráfico no está permitido sin HTTPS. Todo el tráfico no HTTPS debe redirigir al puerto HTTPS.

3.\) Ahora configuraremos IPFS.

IPFS tiene algunos problemas para identificar el host público y el puerto dentro de kubernetes, esto se puede arreglar con `audius-cli`

```text
audius-cli configure-ipfs <hostname>
```

Ejemplo: `audius-cli configure-ipfs 108.174.10.10`

4.\) Establece los tiempos de espera del equilibrador de carga. Los tiempos de espera mínimos son de 1 hora \\(3600 segundos\\) para las solicitudes de Nodo de Creador y 1 minuto \\(60 segundos\\) para las solicitudes de Proveedor de Descubrimiento. Las subidas de pistas especialmente para archivos más grandes pueden tardar varios minutos en completarse.

5.\) Además de configurar sus grupos de seguridad para restringir el acceso a sólo el servidor web y puerto swarm IPFS \\(4001\\), se recomienda que su servidor o balanceador de carga esté protegido de ataques de DoS. Los servicios como Cloudfront y Cloudflare ofrecen servicios gratuitos o de bajo coste para hacerlo. También sería posible usar iptables para configurar la protección tal y como se describe aquí [https://javapipe.com/blog/iptables-ddos-protection/](https://javapipe.com/blog/iptables-ddos-protection/). Por favor, asegúrese de que los proxies no anulan los tiempos de espera del paso 4.

## 7. Comprobaciones de pre-registro

Antes de registrar un servicio en el tablero, necesitamos asegurarnos de que el servicio está configurado correctamente. Siga las siguientes comprobaciones para el tipo de servicio que está configurando. No verificar que todo funcione de forma adecuada podría causar que las acciones del usuario fallen y puede llevar a acciones de recorte.

La carpeta `sp-actions/` contiene scripts que prueban el estado de los servicios. Ejecute las comprobaciones correspondientes para su tipo de servicio a continuación para verificar que su servicio está correctamente instalado. Asegúrate de ejecutar `npm install` en `sp-actions/` para instalar todas las depdencies.

Para más información sobre `sp-actions/` vea el README en la carpeta [sp-actions/](https://github.com/AudiusProject/audius-k8s-manifests/tree/main/sp-utilities)

**Nodo Creador**

```text
➜ pwd
/Audius/audius-k8s-manifests/sp-utilities/creator-node

# entering creatorNodeEndpoint and delegatePrivateKey sends those values as env vars to the script without having to export to your terminal
➜ creatorNodeEndpoint=https://creatornode.domain.co delegatePrivateKey=5e468bc1b395e2eb8f3c90ef897406087b0599d139f6ca0060ba85dcc0dce8dc node healthChecks.js
Starting tests now. Esto puede tardar unos minutos.
✓ Comprobación de estado superado
Comprobación del estado de la base de datos superada
✓ Comprobación de estado de la duración del latido del corazón superada
¡! La revisión de la duración no latitud cardiaca expiró a los 180 segundos con el mensaje de error: "Petición falló con el código de estado 504". No se trata de un problema.
¡Todas las comprobaciones han pasado!
```

Si ves el mensaje "Error al ejecutar el script" este script no terminó correctamente. Si ves "¡Todas las comprobaciones pasadas!" este script terminó con éxito.

**Proveedor de descubrimiento**

```text
► discoveryProviderEndpoint=https://discoveryprovider.domain.co node healthChecks.js
✓ Revisión de salud ha pasado
¡Todas las comprobaciones han pasado!
```

Si ves el mensaje "Error al ejecutar el script" este script no terminó correctamente. Si ves "¡Todas las comprobaciones pasadas!" este script terminó con éxito.

## 8. Registrar el servicio en el panel de control

¡Ya que has completado todos los pasos hasta ahora, estás listo para registrarte!

Puede registrarse a través del panel de control en [https://dashboard.audius.org](https://dashboard.audius.org/)

## 9. Script para iniciar rondas y reclamaciones de proceso \(opcional\)

Si desea ejecutar automáticamente operaciones de reclamo cada vez que se inicia una nueva ronda, se incluye un guión para su comodidad en la carpeta sp-tilizties/claim. Para más información sobre los sp-utilties README.
