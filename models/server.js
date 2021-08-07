const express = require('express');
const cors = require('cors');

class Server {

    constructor() {
        this.app  = express();
        this.port = process.env.PORT;

        this.paths = {
            index: '/health'
        }

        // Middlewares
        this.middlewares();

        // Rutas de mi aplicación
        this.routes();
    }

    middlewares() {

        // CORS
        this.app.use(cors());

        // Read and body parse
        this.app.use(express.json());

        // Public directory
        this.app.use(express.static('public'));

    }

    routes() {
        this.app.use( this.paths.index, require('../routes/index'));
    }

    listen() {
        this.app.listen( this.port, () => {
            console.log('Server started in port', this.port );
        });
    }

}




module.exports = Server;
