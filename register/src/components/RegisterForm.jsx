const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../config');
const jwt = require('jsonwebtoken');
const PORT = process.env.PORT || 5500;
const bcrypt = require('bcryptjs');

// POST request handler for /register
router.post('/', async (req, res) => {
  const { nombre, email, direccion, contraseña1, edad, cuit } = req.body; // 🎯 Agregar cuit al body
  console.log('Solicitud POST recibida en /register con datos:', req.body);

  let role;
  let insertQuery; // 🎯 Declarar insertQuery aquí
  let queryParams; // 🎯 Declarar queryParams aquí

  if (cuit) {
    // Registro de empresa
    role = 'empresa';
    // 🎯 Consulta SQL para insertar en la tabla 'company'
    insertQuery = 'INSERT INTO company (companyId, name, mail, cuit, companyPassword) VALUES (?, ?, ?, ?, ?)';
    queryParams = [uuidv4(), nombre, email, cuit, await bcrypt.hash(contraseña1, 10)];
  } else if (edad) {
    // Registro de empleado
    role = 'empleado';
    // 🎯 Consulta SQL para insertar en la tabla 'users'
    insertQuery = 'INSERT INTO users (userId, username, userPassword, role, createdAt, age, phoneNumber, mail, subscription, address) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
    queryParams = [uuidv4(), nombre, await bcrypt.hash(contraseña1, 10), role, new Date(), edad, null, email, false, direccion];
  } else {
    return res.status(400).json({ error: 'Datos de registro incompletos.' });
  }

  // 🎯 Mover la creación del token y la configuración de la cookie dentro del callback de la consulta
  db.query(insertQuery, queryParams, (err, result) => {
    if (err) {
      console.error('Error al registrar:', err);
      return res.status(500).json({ error: 'Error al registrar en la base de datos.' });
    }

    if (result && result.affectedRows > 0) {
      const newId = result.insertId; // ID del nuevo usuario o empresa
      
      // Crear token JWT
      const token = jwt.sign({ email, role, userId: newId }, 'SECRET_KEY'); // Incluir userId en el token

      // Configurar la cookie
      res.cookie('authToken', JSON.stringify({ token, userId: newId, nombre: nombre }), { /* quitar httpOnly */ });
      res.status(201).json({ message: `Usuario registrado exitosamente.`, token, userId: newId });
    } else {
      res.status(500).json({ error: 'Error al registrar en la base de datos.' });
    }
  });
});

module.exports = router;