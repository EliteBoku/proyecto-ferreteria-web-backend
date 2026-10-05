import { Usuario } from '../models/Usuario.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/config.js';

// Register a new user
export const register = async (req, res) => {
    
    const {nombres, apellidos, email, password, telefono} = req.body;

    try{
        //1. Verificar si el correo ya existe
        const userFound = await Usuario.findOne({email});
        if(userFound){
            return res.status(400).json({message: "El correo electronico ya está registrado "})
        }

        //2.  Encriptar la contraseña 
        const passwordHash = await bcrypt.hash(password, 10);


        //3. Crear un nuevo usuario 
        const newUser = new Usuario(
            {
                nombres,
                apellidos,
                email,
                password: passwordHash,
                telefono
            }
        );

        const userSaved = await newUser.save();

        // 4. Generar un token JWT
        const token = jwt.sign({
            id:userSaved._id,
            rol:userSaved.rol
        }, JWT_SECRET, { expiresIn: '1h' });

        // 5. Responder con los datos y el token
        return res.status(201).json({
            id: userSaved._id,
            nombres: userSaved.nombres,
            apellidos: userSaved.apellidos,
            email: userSaved.email,
            telefono: userSaved.telefono,
            rol: userSaved.rol,
            token
        });

    }catch(error){
        return res.status(500).json({message: "Error al registrar el usuario", error: error.message});
    }
}

// Login 
export const login = async (req, res) =>{
    const {email, password} = req.body;

    try{
        // 1. Buscar el usuario por correo electrónico
        const userFound = await Usuario.findOne({email});
        if(!userFound){
            res.status(400).json({message: 'Usuario o contraseñas incorrectos'})
        }

        // 2. Comparar contraseñas 
        const isMatch = await bcrypt.compare(password, userFound.password);
        if(!isMatch){
            return res.status(400).json({
                message:'Usuario o contraseñas incorrectos'
            });
        }

        //3. Generar un token JWT
        const token = jwt.sign({
            id: userFound._id,
            rol: userFound.rol
        }, JWT_SECRET, {expiresIn: '1d'})

        res.json({
            id:userFound._id,
            nombres:userFound.nombres,
            apellidos:userFound.apellidos,
            email: userFound.email,
            rol: userFound.rol,
            token
        })

    }catch(error){
        return res.status(500).json({message: "Error al iniciar sesión", error: error.message});
    }
}

// Get authenticated profile
export const profile = async (req, res) => {
    try{
        const userFound = await Usuario.findById(req.user.id).select('-password');
        if(!userFound) return res.status(404).json({
            message: 'Usuario no encontrado'
        });

        res.json(userFound);
    }catch(error){
        res.status(500).json({
            message:' Error al obtener el perfil',
            error:errror.message
        })
    }
}