import { Usuario } from '../models/Usuario.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/config.js';
import crypto from 'crypto';
import { sendPasswordResetEmail } from '../services/email.service.js';

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
            return res.status(400).json({message: 'Usuario o contraseñas incorrectos'})
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
            error:error.message
        })
    }
}

export const forgotPassword = async (req, res) => {
    const { email } = req.body;
    try{
        // 1. Find User
        const userFound = await Usuario.findOne({email});
        if(!userFound){
            return res.status(404).json({
                message: 'No existe un usuario con este correo electronico'
            })
        }

        //2. Generate random token
        const resetToken = crypto.randomBytes(32).toString('hex');

        // 3. Save token
        userFound.resetPasswordToken = resetToken;

        //4. The token expires in 30 minutes 
        userFound.resetPasswordExpires = new Date(
            Date.now() + 30*60*1000
        );

        await userFound.save();

        // 5. Create URL 
        const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

        //6. Send Email 
        await sendPasswordResetEmail(
            userFound.email,
            resetUrl
        )

        //7. Response
        return res.status(200).json({
            message:
                'Se han enviado las instrucciones para recuperar tu contraseña'
        });
    }catch(error){
         return res.status(500).json({
            message:
                'Error al solicitar recuperación de contraseña',
            error: error.message
        });
    }
}

export const resetPassword = async (req, res) =>{
    const { token } = req.params;
    const { password } = req.body;

    try{
        // 1. Find the user with a valid token.
        const userFound = await Usuario.findOne({
            resetPasswordToken: token,
            resetPasswordExpires:{
                $gt: new Date()
            }
        });

        //2. Invalid or expired token
        if (!userFound) {
            return res.status(400).json({
                message: 'El token es inválido o ha expirado'
            });
        }

        // 3. Hash the new password.
        const passwordHash = await bcrypt.hash(
            password, 
            10
        )

        // 4. Update passowrd
        userFound.password = passwordHash;

        //5. Delete token
        userFound.resetPasswordToken = null;
        userFound.resetPasswordExpires = null;

        //6. Save 
        await userFound.save();

        return res.status(200).json({
            message: 'Contraseña actualizada correctamente'
        });
        
    } catch(error){
        return res.status(500).json({
            message: 'Error al restablecer la contraseña',
            error: error.message
        });
    }
}