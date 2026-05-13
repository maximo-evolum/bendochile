
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const admins = require('../data/admins');

exports.login = async (req,res) => {
  const { username, password } = req.body;

  const admin = admins.find(a => a.username === username);

  if(!admin){
    return res.status(401).json({
      message:'Usuario no encontrado'
    });
  }

  const validPassword = await bcrypt.compare(password, admin.password);

  if(!validPassword){
    return res.status(401).json({
      message:'Contraseña incorrecta'
    });
  }

  const token = jwt.sign(
    {
      id: admin.id,
      role: admin.role
    },
    'NOVA_SECRET',
    {
      expiresIn:'7d'
    }
  );

  res.json({
    token,
    user:{
      username: admin.username,
      role: admin.role
    }
  });
};
