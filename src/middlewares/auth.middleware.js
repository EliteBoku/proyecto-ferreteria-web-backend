import jwt from "jsonwebtoken";
import {JWT_SECRET} from "../config/config.js";

export const authRequired = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if(!authHeader || !authHeader.startsWith("Bearer ")){
        return res.status(401).json({message: "No hay token. Acceso denegado"});
    }

    const token = authHeader.split(" ")[1];

    try{
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    }catch(error){
        return res.status(401).json({message: "Token inválido. Acceso denegado"});
    }
}
