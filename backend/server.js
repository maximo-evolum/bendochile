
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(express.json());

const SECRET = 'NOVA_SECRET';
const PRODUCTS_FILE = path.join(__dirname, '..', 'data', 'products.json');

const admins = [
  { id:1, username:'maximo', password:'admin123', role:'superadmin' },
  { id:2, username:'admin1', password:'admin123', role:'admin' },
  { id:3, username:'admin2', password:'admin123', role:'admin' },
  { id:4, username:'admin3', password:'admin123', role:'admin' },
  { id:5, username:'admin4', password:'admin123', role:'admin' },
];

function readProducts(){
  try{
    return JSON.parse(fs.readFileSync(PRODUCTS_FILE,'utf8'));
  }catch(e){
    return [];
  }
}

function saveProducts(products){
  fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(products,null,2));
}

function auth(req,res,next){
  const header=req.headers.authorization || '';
  const token=header.replace('Bearer ','');
  if(!token) return res.status(401).json({error:'Unauthorized'});
  try{
    req.user=jwt.verify(token, SECRET);
    next();
  }catch(e){
    return res.status(401).json({error:'Invalid token'});
  }
}

app.get('/',(req,res)=>res.json({status:'API running'}));

app.post('/api/auth/login',(req,res)=>{
  const {username,password}=req.body;
  const user=admins.find(a=>a.username===username && a.password===password);
  if(!user) return res.status(401).json({error:'Usuario o contraseña incorrectos'});
  const token=jwt.sign({id:user.id,role:user.role}, SECRET,{expiresIn:'7d'});
  res.json({token,user:{username:user.username,role:user.role}});
});

app.get('/api/products',(req,res)=>{
  res.json(readProducts());
});

app.post('/api/products', auth, (req,res)=>{
  const products=readProducts();
  const product={...req.body,id:req.body.id || String(Date.now())};
  const idx=products.findIndex(p=>p.id===product.id);
  if(idx>=0) products[idx]=product;
  else products.unshift(product);
  saveProducts(products);
  res.json(product);
});

app.patch('/api/products/:id/stock', auth, (req,res)=>{
  const products=readProducts();
  const idx=products.findIndex(p=>p.id===req.params.id);
  if(idx===-1) return res.status(404).json({error:'Not found'});
  products[idx].stock=Number(req.body.stock||0);
  saveProducts(products);
  res.json(products[idx]);
});

app.delete('/api/products/:id', auth, (req,res)=>{
  const products=readProducts().filter(p=>p.id!==req.params.id);
  saveProducts(products);
  res.json({success:true});
});

app.listen(4000,()=>console.log('API running on '));
