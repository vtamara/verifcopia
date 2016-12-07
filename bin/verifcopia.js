#! /usr/bin/env node
// vim: set expandtab tabstop=2 shiftwidth=2 foldmethod=marker fileencoding=utf-8:

// Examina copias de respaldo, puede emplear diversos tipos de verificación
// Dominio público de acuerdo a la legislación colombiana. 2016. vtamara@pasosdeJesus.org

var fs = require('fs')
var moment = require('moment')
var path = require('path')
var nodemailer = require('nodemailer');

var colchon_bitacora = ''; // Para almacenar mensajes de bitacora
var exito = true;  

// Añade un mensaje a la bitácora y lo presenta en consola para depurar
function bitacora(m) {
  colchon_bitacora += m + '\n'
  console.log(m)
}


// Envía un correo con el tema y mensaje dados usando la configuración conf
function envia_correo(conf, tema, mensaje) {

  var opt = {
    direct: true,
    host: typeof conf.maquina_smtp != 'undefined' ? conf.maquina_smtp : 
      'localhost',
    port: typeof conf.puerto_smtp != 'undefined' ? conf.puerto_smtp : 465,
    auth: { 
      user: typeof conf.usuario_smtp != 'undefined' ? conf.usuario_smtp : 
        'anonymous', 
      pass: typeof conf.clave_smtp != 'undefined' ? conf.clave_smtp : 
        '@anonymous',  },
      secure: typeof conf.seguro_smtp != 'undefined' ? conf.seguro_smtp : 
        true
  }
  var transporter = nodemailer.createTransport(opt);

  var mailOptions = {
    from: typeof conf.remitente ? conf.remitente : 
      'vtamara@pasosdeJesus.org',
    to: typeof conf.destinatario ? conf.destinatario : 
      'vtamara@pasosdeJesus.org',
    subject: tema,
    text: mensaje
  };

  transporter.sendMail(mailOptions, function (error, info) {
    if(error) {
      return console.log(error);
    }
    console.log("Mensaje enviado " + info.response)
  });
}



// Estrategia: Verifica 2 archivos, se supone uno copia del otro
// Deben tener al menos de un día de diferencia y una diferencia en tamaño menor que cierto delta
function verifDiarioSimple(rutaOriginal, prefRutaCopia, deltaMax) {
  //bitacora("OJO. Verificando menos de un dia de copia e igual tamaño entre "  + rutaOriginal + " y algun archivo con prefijo " + prefRutaCopia)
  var o = fs.statSync(rutaOriginal)
  //bitacora("OJO " + o);
  var to = moment(o.mtime)//, 'ddd MMM DD YYYY HH:mm:ss')
  //bitacora("OJO to.format()= " + to.format())
 
  dirCopia =  path.dirname(prefRutaCopia)
  //bitacora("OJO dirCopia=" + dirCopia)
  var encontrado = false
  var an = fs.readdirSync(dirCopia)
  an.forEach(function(d, i, arr) {
    if (d != '.' && d != '..') {
      //  bitacora("OJO d=" + d + ", i=" + i + ", dirCopia=" + dirCopia) 
      var na = path.join(dirCopia, d)
      //bitacora("OJO na=" + na) 
      if (na.lastIndexOf(prefRutaCopia) == 0) {
        //bitacora("OJO na=" + na) 
        var c = fs.statSync(na);
        //bitacora("OJO c="+ c);
        var tc = moment(c.mtime) //, 'ddd MMM DD YYYY HH:mm:ss')
        //bitacora("OJO tc.format()= " + tc.format())
        var sdif = to.diff(tc, 'days')
        if (Math.abs(sdif) <= 1) {
          var delta = Math.abs(c.size - o.size)
          if (delta <= deltaMax) {
            encontrado = true
            bitacora("  Con respecto a " + rutaOriginal)
            bitacora("  se encontró algún archivo con el prefijo " + 
              prefRutaCopia)
            bitacora("  de  máximo un día de diferencia y diferencia en tamaño " + delta + "<=" + deltaMax)
          }
        }
      }
    }
  })
  if (!encontrado) {
    bitacora("  ** Con respecto a " + rutaOriginal)
    bitacora("  ** no se encontró archivo alguno con el prefijo " + 
        prefRutaCopia)
    bitacora("  ** de  máximo un día de diferencia y diferencia en tamaño menor a " + deltaMax)
    exito = false
  }
}

/** Calcula recursivamente peso y cantidad de archivos en una ruta */
function tamDir(ruta) {
  //bitacora("OJO tamDir(", ruta, ")")
  var tam = 0
  var num = 0
  var an = fs.readdirSync(ruta)
  an.forEach(function(d, i, arr) {
    if (d != '.' && d != '..') {
      var na = path.join(ruta, d)
      //bitacora("OJO tamDir, na=", na) 
      var o = fs.statSync(na)
      //bitacora("OJO tamDir, o=", o) 
      if (o.isDirectory()) {
        var t = tamDir(na)
        tam += t[0]
        num += t[1] + 1
      } else {
        tam += o.size
        num++
      }
    }
  })
  //bitacora("OJO. tamDir(", ruta, ") da [", tam, ", ", num, "]")
  return [tam, num]
}


/** Tipo de verificación de dos directorios recientes.
 * Encuentra los dos directorios más recientes de una ruta (conf.ruta) y
 * comparando que entre ellos haya máximo un dia de diferencia, 
 * que entre el más reciente y la fecha de ejecución haya un día, 
 * que los tamaños difieran en menos de conf.deltaTamMax y 
 * que la cantidad de archivos difieran en menos de conf.deltaNumMax
 */
function verifDosDirectoriosRecientes(ruta, deltaTamMax, deltaNumMax) {
    //bitacora("dosDirectoriosRecientes, ruta=" + ruta + "deltaTamMax=" + deltaTamMax + " deltaNumMax=" + deltaNumMax)
    var an = fs.readdirSync(ruta)
    var masReciente1 = -1
    var momMasReciente1 = null
    var masReciente2 = -1
    var momMasReciente2 = null
    var hoy = moment()
    //bitacora("OJO hoy=", hoy)
    an.forEach(function(d, i, arr) {
      if (d != '.' && d != '..') {
        var o = fs.statSync(ruta + "/" + d)
        if (o.isDirectory()) {
          //bitacora("OJO o=" + o)
          var to = moment(o.mtime)//, 'ddd MMM DD YYYY HH:mm:ss')
          //bitacora("OJO to=" + o)
          var sdif = to.diff(hoy, 'days')
          //bitacora("OJO sdif=" + sdif)
          if (Math.abs(sdif) < 2) {
            //bitacora("OJO, menos de 2 dias")
            if (momMasReciente1 == null) { 
              momMasReciente1 = to
              masReciente1 = i
            } else {
              var c1 = to.diff(momMasReciente1, 'miliseconds')
              // bitacora("OJO c1=" +  c1)
              if (c1 > 0) {
                momMasReciente2 = momMasReciente1
                masReciente2 = masReciente1
                momMasReciente1 = to
                masReciente1 = i
              } else if (masReciente2 == -1) {
                masReciente2 = i
                momMasReciente2 = to
              }
            }
          }
        }
      }
    })
    if (masReciente1 < 0 || masReciente2 < 0) {
      bitacora("***** no se encontraron 2 directorios de menos de 2 días en ruta");
      exito = false;
    } else {
      var d = momMasReciente1.diff(momMasReciente2, 'days')
      //bitacora("masReciente1=" +  masReciente1 + ", momMasReciente1=" + momMasReciente1, " + masReciente2=" + masReciente2 + "momMasReciente2=" + momMasReciente2, " + d=" + d)
      if (d > 1) {
         bitacora("***** mas de un dia de diferencia entre los dos mas recientes");
        exito = false;
      } else {
        bitacora("menos de un dia de diferencia entre las dos mas recientes");
      }
      //bitacora("OJO masReciente1=" +  masReciente1 + ", masReciente2=" + masReciente2)
      //bitacora("OJO an=" + an);
      var t1 = tamDir(ruta + "/" + an[masReciente1])
      // bitacora("OJO t1=" + t1)
      var t2 = tamDir(ruta + "/" + an[masReciente2])
      // bitacora("OJO t2=" + t2)
      if (Math.abs(t1[0] - t2[0]) > deltaTamMax) {
        bitacora("***** diferencia de tamaños entre mas recientes (" + t1 +
           ", " + t2 + ") excede lo esperado (" + deltaTamMax + ")")
        exito = false;
      } else {
        bitacora("diferencia de tamaños dentro de lo esperado");
      }
      if (Math.abs(t1[1] - t2[1]) > deltaNumMax) {
        bitacora("***** diferencia en cantidad de archivos entre mas recientes (" + t1 +
           ", " + t2 + ") excede lo esperado (" + deltaNumMax + ")")
        exito = false;
      } else {
        bitacora("diferencia en cantidad de archivos dentro de lo esperado");
      }
    } 
}

bitacora("Examinando copias de respaldo")
if (process.argv.length != 3) {
  bitacora("Primer parámetro debería ser ruta del archivo JSON de configuración")
  process.exit(1)
}

var ruta = path.resolve(process.argv[2])
//bitacora("OJO ruta=" + ruta)
var conf = require(ruta)
if (typeof conf.conf == 'undefined' || conf.conf != 'verifcopia') {
  bitacora("Debería ser un archivo JSON con configuracion para verifcopia")
  process.exit(1)
}

//bitacora("OJO conf.copias.length=" + conf.copias.length)

var copias = conf.copias
var i;
for(i = 0; i < copias.length; i++) {
  bitacora("\nVerificando copia " + (i+1))
    if (typeof copias[i].tipo == 'undefined') {
      bitacora("ERROR: No tiene tipo")
    } else {
      switch (copias[i].tipo) {
        case 'diarioSimple':
          if (typeof copias[i].rutaOriginal == 'undefined') {
            bitacora("ERROR: No tiene rutaOriginal")
          } else if (typeof copias[i].rutaCopia == 'undefined') {
            bitacora("ERROR: No tiene rutaCopia")
          } else if (typeof copias[i].deltaMax == 'undefined') {
            bitacora("ERROR: No tiene deltaMax")
          } else {
            verifDiarioSimple(copias[i].rutaOriginal, copias[i].rutaCopia,
                copias[i].deltaMax) 
          }
          break;

        case 'dosDirectoriosRecientes':
          if (typeof copias[i].ruta == 'undefined') {
            bitacora("ERROR: No tiene 'ruta', donde están los " +
                " directorios con respaldos de anteayer y ayer")
          } else if (typeof copias[i].deltaTamMax == 'undefined') {
            bitacora("ERROR: No tiene deltaTamMax con máxima " +
                " diferencia en tamaño aceptable")
          } else if (typeof copias[i].deltaNumMax == 'undefined') {
            bitacora("ERROR: No tiene deltaNumMax con máxima " +
                " diferencia en cantidad de archivos aceptable")
          } else {
            verifDosDirectoriosRecientes(copias[i].ruta, 
                copias[i].deltaTamMax, copias[i].deltaNumMax) 
          }
          break;

        default:
          bitacora("ERROR: tipo desconocido")
      }
    }
}
//bitacora("OJO Fin")
tema = exito ? 'Exito en verificación de copia ' : 
     '** Falla verificación de copia'
console.log("\n" + tema)
envia_correo(conf, tema, colchon_bitacora)

