#! /usr/bin/env node
// vim: set expandtab tabstop=2 shiftwidth=2 foldmethod=marker fileencoding=utf-8:

// Examina copias de respaldo, puede emplear diversos tipos de verificación
// Dominio público de acuerdo a la legislación colombiana. 2016. vtamara@pasosdeJesus.org

var fs = require('fs')
var moment = require('moment')
var path = require('path')

console.log("Examinando copias de respaldo")

if (process.argv.length != 3) {
  console.log("Primer parámetro debería ser ruta del archivo JSON de configuración")
  process.exit(1)
}

var ruta = path.resolve(process.argv[2])
var j = require(ruta)
if (typeof j.conf == 'undefined' || j.conf != 'verifcopia') {
  console.log("Debería ser un archivo JSON con configuracion para verifcopia")
  process.exit(1)
}

// Verifica 2 archivos, se supone uno copia del otro
// Deben tener menos de un día de diferencia y un tamaño menor que cierto delta
function verifDiarioSimple(rutaOriginal, rutaCopia, deltaMax) {
  //console.log("OJO. Verificando menos de un dia de copia e igual tamaño entre ", rutaOriginal, " y ", rutaCopia)
  var o = fs.statSync(rutaOriginal)
  //console.log("OJO ", o);
  var to = moment(o.mtime)//, 'ddd MMM DD YYYY HH:mm:ss')
  //console.log("OJO to.format()= ", to.format())
  var c = fs.statSync(rutaCopia);
  //console.log("OJO ", c);
  var tc = moment(c.mtime)//, 'ddd MMM DD YYYY HH:mm:ss')
  //console.log("OJO tc.format()= ", tc.format())
  var sdif = to.diff(tc, 'days')
  if (Math.abs(sdif) > 1) {
    console.log("***** Mas de un dia de diferencia");
  } else {
    console.log("Menos de un dia de diferencia");
  }
  var delta = Math.abs(c.size - o.size)
  if (delta > deltaMax) {
    console.log("***** Diferencia superior a la esperada");
  } else {
    console.log("Diferencia dentro de lo esperado");
  }
}

/** Calcula recursivamente peso y cantidad de archivos en una ruta */
function tamDir(ruta) {
  //console.log("OJO tamDir(", ruta, ")")
  var tam = 0
  var num = 0
  var an = fs.readdirSync(ruta)
  an.forEach(function(d, i, arr) {
    if (d != '.' && d != '..') {
      var na = path.join(ruta, d)
      //console.log("OJO tamDir, na=", na) 
      var o = fs.statSync(na)
      //console.log("OJO tamDir, o=", o) 
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
  //console.log("OJO. tamDir(", ruta, ") da [", tam, ", ", num, "]")
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
    console.log("dosDirectoriosRecientes, ruta=", ruta, "deltaTamMax=", deltaTamMax, " deltaNumMax=", deltaNumMax)
    var an = fs.readdirSync(ruta)
    var masReciente1 = -1
    var momMasReciente1 = null
    var masReciente2 = -1
    var momMasReciente2 = null
    var hoy = moment()
    //console.log("OJO hoy=", hoy)
    an.forEach(function(d, i, arr) {
      if (d != '.' && d != '..') {
        var o = fs.statSync(ruta + "/" + d)
        if (o.isDirectory()) {
          //console.log("OJO o=", o)
          var to = moment(o.mtime)//, 'ddd MMM DD YYYY HH:mm:ss')
          //console.log("OJO to=", o)
          var sdif = to.diff(hoy, 'days')
          //console.log("OJO sdif=", sdif)
          if (Math.abs(sdif) < 2) {
            //console.log("OJO, menos de 2 dias")
            if (momMasReciente1 == null) { 
              momMasReciente1 = to
              masReciente1 = i
            } else {
              var c1 = to.diff(momMasReciente1, 'miliseconds')
              // console.log("OJO c1=", c1)
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
      console.log("***** no se encontraron 2 directorios de menos de 2 días en ruta");
    } else {
      var d = momMasReciente1.diff(momMasReciente2, 'days')
      //console.log("masReciente1=", masReciente1, ", momMasReciente1=", momMasReciente1, ", masReciente2=", masReciente2, "momMasReciente2=", momMasReciente2, ", d=", d)
      if (d > 1) {
         console.log("***** mas de un dia de diferencia entre los dos mas recientes");
      } else {
        console.log("menos de un dia de diferencia entre las dos mas recientes");
      }
      //console.log("OJO masReciente1=", masReciente1, ", masReciente2=", masReciente2)
      //console.log("OJO an=", an);
      var t1 = tamDir(ruta + "/" + an[masReciente1])
      // console.log("OJO t1=", t1)
      var t2 = tamDir(ruta + "/" + an[masReciente2])
      // console.log("OJO t2=", t2)
      if (Math.abs(t1[0] - t2[0]) > deltaTamMax) {
        console.log("***** diferencia de tamaños entre mas recientes (" , t1, 
           ", ", t2, ") excede lo esperado (", deltaTamMax, ")")
      } else {
        console.log("diferencia de tamaños dentro de lo esperado");
      }
      if (Math.abs(t1[1] - t2[1]) > deltaNumMax) {
        console.log("***** diferencia en cantidad de archivos entre mas recientes (" , t1, 
           ", ", t2, ") excede lo esperado (", deltaNumMax, ")")
      } else {
        console.log("diferencia en cantidad de archivos dentro de lo esperado");
      }
    } 
}

var copias = j.copias
var i;
for(i = 0; i < copias.length; i++) {
  console.log("Copia ", i)
    if (typeof copias[i].tipo == 'undefined') {
      console.log("ERROR: No tiene tipo")
    } else {
      switch (copias[i].tipo) {
        case 'diarioSimple':
          if (typeof copias[i].rutaOriginal == 'undefined') {
            console.log("ERROR: No tiene rutaOriginal")
          } else if (typeof copias[i].rutaCopia == 'undefined') {
            console.log("ERROR: No tiene rutaCopia")
          } else if (typeof copias[i].deltaMax == 'undefined') {
            console.log("ERROR: No tiene deltaMax")
          } else {
            verifDiarioSimple(copias[i].rutaOriginal, copias[i].rutaCopia,
                copias[i].deltaMax) 
          }
          break;

        case 'dosDirectoriosRecientes':
          if (typeof copias[i].ruta == 'undefined') {
            console.log("ERROR: No tiene 'ruta', donde están los " +
                " directorios con respaldos de anteayer y ayer")
          } else if (typeof copias[i].deltaTamMax == 'undefined') {
            console.log("ERROR: No tiene deltaTamMax con máxima " +
                " diferencia en tamaño aceptable")
          } else if (typeof copias[i].deltaNumMax == 'undefined') {
            console.log("ERROR: No tiene deltaNumMax con máxima " +
                " diferencia en cantidad de archivos aceptable")
          } else {
            verifDosDirectoriosRecientes(copias[i].ruta, 
                copias[i].deltaTamMax, copias[i].deltaNumMax) 
          }
          break;

        default:
          console.log("ERROR: tipo desconocido")
      }
    }
}
console.log("Fin")
process.exit(0)
