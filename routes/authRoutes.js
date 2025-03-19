const express = require('express');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User'); 

const router = express.Router();

router.post('/register', async (req, res) => {
  const { name, email, password, confirmPassword } = req.body;

  if (password !== confirmPassword) {
    return res.status(400).json({ message: 'Las contraseñas no coinciden' });
  }

  try {
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: 'El correo ya está registrado' });
    }

    const user = new User({ name, email, password });
    await user.save();

    res.status(201).json({ message: 'Usuario registrado exitosamente' });
  } catch (error) {
    res.status(500).json({ message: 'Error al registrar el usuario', error });
  }
});
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: 'Usuario no encontrado' });
    }

    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(400).json({ message: 'Contraseña incorrecta' });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

    //información del usuario en respuesta
    res.json({ 
      message: 'Inicio de sesión exitoso', 
      token,
      user: { _id: user._id, name: user.name } 
    });
  } catch (error) {
    console.error('Error en el login:', error);  
    res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
});

router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'No se encuentra este correo en nuestros registros.' });
    }
    const resetToken = crypto.randomBytes(20).toString('hex');
    
    const expirationDate = Date.now() + 3600000; 

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = expirationDate;

    await user.save();
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    const resetUrl = `https://beauvoir.vercel.app/reset-password/${resetToken}`;
    
    const mailOptions = {
      to: email,
      from: process.env.EMAIL_USER,
      subject: 'Solicitud de restablecimiento de contraseña',
      text: `Recibimos una solicitud para restablecer tu contraseña.
    
       Si fuiste tú, haz clic en el siguiente enlace:
    
         ${resetUrl}
    
        Si no solicitaste este cambio, ignora este correo.
         El enlace caducará en 1 hora.`,
    };
    
    
    await transporter.sendMail(mailOptions);

    res.status(200).json({ message: 'Te hemos enviado un correo con instrucciones para restablecer tu contraseña.' });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Hubo un error al procesar la solicitud.' });
  }
});

router.post('/reset-password/:token', async (req, res) => {
    const { token } = req.params;
    const { password } = req.body;
  
    try {
      //Busca el usuario que tenga el token de restablecimiento y la fecha de expiración válida
      const user = await User.findOne({
        resetPasswordToken: token,
        resetPasswordExpires: { $gt: Date.now() },
      });
  
      //Verifica si el usuario no se encuentra!
      if (!user) {
        return res.status(400).json({ message: 'Token de restablecimiento no válido o expirado.' });
      }
  
      user.password = password;
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
  
      await user.save();
  
      res.status(200).json({ message: 'Contraseña restablecida exitosamente' });
    } catch (error) {
      console.error('Error al restablecer la contraseña:', error);
      res.status(500).json({ message: 'Hubo un error al restablecer la contraseña', error: error.message });
    }
  });
  
module.exports = router;
