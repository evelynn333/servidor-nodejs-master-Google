const express = require('express');
require('dotenv').config();
const { dbConnection } = require('../database/config')
const Usuario = require('./usuario');
const Planta = require('./planta');
const Rol = require('./rol');
const bcryptjs = require('bcryptjs');
const { body, validationResult, check } = require('express-validator');
const { generarJWT } = require("../helpers/generarJWT");
const { validarJWT } = require("../middleware/validar-JWT");
const { OAuth2Client } = require("google-auth-library");
const fileUpload = require("express-fileupload");
const { v4: uuidv4 } = require("uuid");


const port = process.env.PORT;
class Server {
  constructor() {
    this.app = express();
    this.conectarDB();
    this.middlewares();
    this.rutas();
  }
  middlewares() {
    this.app.use(express.json()); //Middleware para leer json;
    this.app.use(express.static("public"));
    //Middleware para servir la carpeta public
    this.app.use(fileUpload({
      useTempFiles: true,
      tempFileDir: '/tmp/'
    }));
  }
  async conectarDB() {
    await dbConnection()
  }
  rutas() {
    /******* RUTA DEL LOGIN *****/
    this.app.post(
      "/login",
      check("correo", "El correo no es válido").isEmail(),
      check("password", "La contraseña no puede ser vacía").not().isEmpty(),
      async function (req, res) {
        const erroresVal = validationResult(req);
        //comprueba si ha habido errores en los checks
        if (!erroresVal.isEmpty()) {
          return res.status(400).json({ msg: erroresVal.array() });
        }
        const { correo, password } = req.body;
        try {
          //verifico si el correo existe en la BD
          const miusuario = await Usuario.findOne({ correo });
          if (!miusuario) {
            res.status(400).json({
              msg: "El correo no existe",
              correo,
            });
          } else {
            //verifico la contraseña
            const validPassword = bcryptjs.compareSync(
              password,
              miusuario.password
            );
            if (!validPassword) {
              res.status(400).json({
                msg: "El password no es correcto",
              });
            } else {
              //genero el JWT
              const token = await generarJWT(miusuario.id);
              const id = miusuario.id;
              res.json({
                msg: "Login OK",
                token,
                id,
              });
            }
          }
        } catch (error) {
          console.log(error);
          res.status(500).json({
            msg: "Error de autenticación",
          });
        }
      }
    );

    /******* RUTAS DE PLANTAS *****/
    //devuelve un producto
    this.app.get('/webresources/generic/planta/:id', validarJWT, async function (req, res) {
      const id = req.params.id;
      let planta = await Planta.findById(id);
      res.json(
        planta

      )
    })
    //devuelve todas las plantas
    this.app.get('/webresources/generic/plantas', validarJWT, async function (req, res) {

      let plantas = await Planta.find();
      res.json(
        plantas
        //[{"categoria":"chucherias","id":30,"imagen":"chuches.jpg","nombre":"chupa chus de naranja","precio":0.0},{"categoria":"chucherias","id":31,"imagen":"chuches.jpg","nombre":"chicle de melón","precio":0.0},{"categoria":"postres","id":33,"imagen":"melon.jpg","nombre":"Melon de chino","precio":2.0},{"categoria":"postres","id":34,"imagen":"melon.jpg","nombre":"Melon de sapo","precio":2.0},{"categoria":"bebidas","id":35,"imagen":"burger/fanta.png","nombre":"Coca cola de melón","precio":3.0},{"categoria":"refrescos","id":38,"imagen":"sandia.jpg","nombre":"refresco de kiwi","precio":2.0},{"categoria":"bocadillos","id":39,"imagen":"cod-1659603340642614231-bocadillo.jfif","nombre":"Bocadillo de calamares","precio":5.0},{"categoria":"bebidas","id":40,"imagen":"cod-737444841162795513-bocata2.jpg","nombre":"cerveza","precio":2.0}]
      )


    })
    this.app.post('/webresources/generic/planta', validarJWT, function (req, res) {
      const body = req.body;
      let miPlanta = new Planta(body);
      miPlanta.save();
      res.json({
        ok: true,
        msg: 'post API plantas',

      })
    })
    //put-plantas
    this.app.put('/webresources/generic/planta/:id', validarJWT, async function (req, res) {
      const body = req.body;
      const id = req.params.id;
      await Planta.findByIdAndUpdate(id, body);
      res.json({
        ok: true,
        msg: 'post API planta',
        body
      })
    })
    //delete plantas
    this.app.delete('/webresources/generic/planta/:id', validarJWT, async function (req, res) {
      const id = req.params.id;
      await Planta.findByIdAndDelete(id);
      res.status(200).json({
        ok: true,
        msg: 'delete API'
      })
    })
    /******* RUTA SUBIR ARCHIVOS 2 */
    this.app.post(
      "/subir2",
      async function (req, res) {
        if (!req.files ){
          res.status(400).json({
            msg: "no se han mandado archivos"    
          });
        }
        //esperamos un archivo con el nombre de 'archivo'
        //SI SE HA ENVIADO ARCHIVO
        if (!req.files.archivo ){
          res.status(400).json({
            msg: "no se han mandado 'archivo'"    
          });
        } else { //SI se ha enviado 'archivo'
          const  { archivo } = req.files;
          const nombreCortado = archivo.name.split(".");
          const extension = nombreCortado[nombreCortado.length -1];
          //validar la extensión
          const extensionesValidas = ['jpg','jpeg','png','gif'];
          if ( !extensionesValidas.includes(extension)){
            return res.status(400).json({
              msg: `La extensión ${extension} no está permitida ${extensionesValidas}`
            })
          }
          const nombreTemporal = uuidv4() +'.' + extension;
          //una vez que tiene el nombre del archivo temporal crea el objeto producto y lo guarda
          const nombre = req.body.nombre;
          const categoria = req.body.categoria;
          const precio = req.body.precio;
          const imagen = nombreTemporal;
          const planta = {nombre,categoria,precio,imagen}
          console.log(planta);
          let miPlanta = new Planta(planta);
          miPlanta.save();
          //FIN DE LO QUE SE HA AÑADIDO A LA RUTA SUBIR
          const path = require('path');
          const uploadPath = path.join(__dirname,'/imagenes',nombreTemporal);
          archivo.mv(uploadPath, function(err){
            if ( err ) {
              return res.status(500).json(err);
            }
            res.status(200).json({
              msg:'Archivo subido con éxito',
              uploadPath
            
            })
          })
 
        }
      })
      /******* RUTAS DE google *****/
    this.app.post(
      "/google",
      check("id_token", "El token es necesario").not().isEmpty(),
      async function (req, res) {
        const erroresVal = validationResult(req);
        //comprueba si ha habido errores en los checks
        if (!erroresVal.isEmpty()) {
          return res.status(400).json({ msg: erroresVal.array() });
        }
        try {
          //******** COMPRUEBO EL TOKEN *************/
          const { id_token } = req.body;
          const { OAuth2Client } = require("google-auth-library");
          const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

          const ticket = await client.verifyIdToken({
            idToken: id_token,
            audience: process.env.GOOGLE_CLIENT_ID, // Specify the CLIENT_ID of the app that accesses the backend
            // Or, if multiple clients access the backend:
            //[CLIENT_ID_1, CLIENT_ID_2, CLIENT_ID_3]
          });
          const payload = ticket.getPayload();
          console.log("PAYLOAD", payload);
          const correo = payload.email;
          const img = payload.picture;
          const nombre = payload.name;
          let miusuario = await Usuario.findOne({ correo });
          if (!miusuario) {
            let data = {
              nombre,
              correo,
              password: "123",
              img,
              google: true,
              rol: "USER_ROLE",
            };
            console.log("USUARIO A CREARR", data);
            miusuario = new Usuario(data);
            await miusuario.save();
            console.log("USUARIO A CREADO", miusuario);
          }
          // If request specified a G Suite domain:
          // const domain = payload['hd'];
          //*** gnero un token */
          const tokenGenerado = await generarJWT(miusuario.id);
          const id = miusuario.id;
          //******** ENVÍO UN RESPUESTA */

          res.json({
            msg: "Todo bien con Google",
            id_token,
            token: tokenGenerado,
            miusuario,
          });
        } catch (error) {
          res.json({
            msg: "ERROR DE VERIFICACIÓN DE GMAIL",
            id_token
          });
        }
      }
    );


    /******* RUTAS DEL USUARIO */
    this.app.get('/', function (req, res) {

    })
    this.app.get('/api', async function (req, res) {
      let usuarios = await Usuario.find();
      res.status(403).json({
        ok: true,
        msg: 'get API',
        usuarios
      })
    })
    this.app.get('/suma', function (req, res) {
      const num1 = Number(req.query.num1);
      const num2 = Number(req.query.num2);
      res.send(`La suma de ${num1} y ${num2} es ${(num1) + (num2)}`)
    })

    this.app.post('/api',
      body('correo').isEmail(),
      check('nombre', 'El nombre es obligatorio').not().isEmpty(),
      check('password', 'El password debe tener al menos 6 caracteres').isLength({ min: 6 }),
      //check('rol','El rol no es válido').isIn(['ADMIN_ROLE','USER_ROLE']),
      check('rol').custom(
        async function (rol) {
          const existeRol = await Rol.findOne({ rol });
          if (!existeRol) {
            throw new Error(`El rol ${rol} no está en la BD`)
          }
        }

      ),
      check('correo').custom(
        async function (correo) {
          const existeCorreo = await Usuario.findOne({ correo });
          if (existeCorreo) {
            throw new Error(`El correo ${correo} YA está en la BD`)
          }
        }

      ),


      function (req, res) {
        const body = req.body;
        let usuario = new Usuario(body);
        //valida el correo
        const erroresVal = validationResult(req);
        if (!erroresVal.isEmpty()) {
          return res.status(400).json({ msg: erroresVal.array() });
        }
        //**** le hago el hash a la contraseña */
        const salt = bcryptjs.genSaltSync();
        usuario.password = bcryptjs.hashSync(usuario.password, salt)
        usuario.save();
        res.json({
          ok: true,
          msg: 'post API',
          usuario
        })
      })
    this.app.put('/api/:id', async function (req, res) {
      const id = req.params.id;
      let { password, ...resto } = req.body;
      //**** le hago el hash a la contraseña */
      const salt = bcryptjs.genSaltSync();
      password = bcryptjs.hashSync(password, salt);
      resto.password = password;
      await Usuario.findByIdAndUpdate(id, resto);
      res.status(403).json({
        ok: true,
        msg: 'put API',
        id,
        resto
      })
    })
    this.app.delete('/api/:id', async function (req, res) {
      const id = req.params.id;
      await Usuario.findByIdAndDelete(id);
      res.status(403).json({
        ok: true,
        msg: 'delete API'
      })
    })
    this.app.get('/saludo', function (req, res) {
      res.send('<h1>Hola 2DAW</h1>')
    })
    this.app.get('*', function (req, res) {
      res.sendFile(__dirname + '/404.html')
    })
  }

  listen() {
    this.app.listen(port, function () {
      console.log('Escuchando el puerto', port)
    });
  }
}
module.exports = Server;