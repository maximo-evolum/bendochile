
const jwt = require('jsonwebtoken');

module.exports = function(req,res,next){

  const token = req.headers.authorization;

  if(!token){
    return res.status(401).json({
      message:'No autorizado'
    });
  }

  try{
    jwt.verify(token, 'NOVA_SECRET');
    next();
  }catch(err){
    return res.status(401).json({
      message:'Token inválido'
    });
  }
}
