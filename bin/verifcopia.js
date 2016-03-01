#! /usr/bin/env node
// Examina copias de respaldo que se suponen diarias 
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


var copias = j.copias
var i;
for(i = 0; i < copias.length; i++) {
  console.log("Copia ", i)
  if (typeof copias[i].tipo == 'undefined') {
	 console.log("ERROR: No tiene tipo")
  } else {
	  switch (copias[i].tipo) {
		  case 'diariosimple':
			  if (typeof copias[i].rutaoriginal == 'undefined') {
				  console.log("ERROR: No tiene rutaoriginal")
			  } else if (typeof copias[i].rutacopia == 'undefined') {
				  console.log("ERROR: No tiene rutacopia")
			  } else if (typeof copias[i].deltamax == 'undefined') {
				  console.log("ERROR: No tiene deltamax")
			  } else {
				  //console.log("Verificando menos de un dia de copia e igual tamaño entre ", copias[i].rutaoriginal, " y ", copias[i].rutacopia)
				  var o = fs.statSync(copias[i].rutaoriginal)
				  //console.log(o);
				  var to = moment(o.mtime)//, 'ddd MMM DD YYYY HH:mm:ss')
				  //console.log("to.format()= ", to.format())
				  var c = fs.statSync(copias[i].rutacopia)
				  //console.log(c);
				  var tc = moment(c.mtime)//, 'ddd MMM DD YYYY HH:mm:ss')
				  //console.log("tc.format()= ", tc.format())
				  var sdif = to.diff(tc, 'days')
				  if (Math.abs(sdif) > 1) {
					  console.log("***** Mas de un dia de diferencia");
				  } else {
					  console.log("Menos de un dia de diferencia");
				  }
				  var delta = Math.abs(c.size - o.size)
				  if (delta > copias[i].deltamax) {
					  console.log("***** Diferencia superior a la esperada");
				  } else {
					  console.log("Diferencia dentro de lo esperado");
				  }
			  }
			  break;
		  default:
			  console.log("ERROR: tipo desconocido")
	  }
  }
}
process.exit(0)
