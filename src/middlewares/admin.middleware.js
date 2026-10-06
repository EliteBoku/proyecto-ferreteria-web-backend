/*
Este archivo protege las rutas del administrador, 
verificando si el usuario tiene el rol de administrador 
antes de permitir el acceso a ciertas rutas.
*/

export const isAdmin = (req, res, next) =>{
    if(!req.user || req.user.rol !== 'admin'){
        return res.status(403).json({
            message:'Acceso denegado. Se requiere rol de administrador'
        })
    }
    next();
}
