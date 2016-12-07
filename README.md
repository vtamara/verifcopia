# verifcopia

Verifica que los respaldos automáticos operen bien

## Requerimientos

node.js reciente


## Instalación

npm install


## Pruebas

### Del tipo de respaldo verificación de dos directorios recientes

node bin/verifcopia conf/dosDirectoriosRecientes.json

Es normal que pase primera y tercera verificaciones pero no la segunda.
En general no debe poder enviar correo informando.


## Uso

Configure lo que debe revisarse por ejemplo en conf/misrespaldos.json

Hay algunos modelos de ejemplo en el mismo directorio conf/

Revise de acuerdo a su configuración ejecutando

node bin/verifcopia conf/mirespaldo.json


