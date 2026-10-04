import app from './app.js';
import {connectDB} from './config/db.js';
import {PORT} from './config/config.js';

async function main(){
    try{
        await connectDB();
        app.listen(PORT, () =>{
            console.log(`>>> Servidor corriendo en el puerto ${PORT}`);
        });
    }catch(error){
        console.log('Error al iniciar el servidor:', error);
    }
}

main();