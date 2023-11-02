const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const app = express();
const port = process.env.PORT || 5000;

// middle Ware 
app.use(cors({
  origin: ['http://localhost:5173'],
  credentials: true
}))
app.use(express.json())
app.use(cookieParser())

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.trhzw6v.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

// My MiddleWare 
const verifyToken = async(req, res, next)=>{
  const token = req.cookies?.token;
  if(!token){
    return res.status(401).send({message: 'Not Authorization'})
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET,(err,decoded) =>{
    if(err){
      return res.status(401).send({message: 'Unauthorized'})
    }
    
    req.user = decoded
    next()
  })
}

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const serviceCollection = client.db('carDoctorsDB').collection('services');
    const ordersCollection = client.db('carDoctorsDB').collection('orders');

    // Auth Related API 
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      console.log(user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
      console.log(token)

      res
        .cookie('token', token, {
          httpOnly: true,
          secure: false,
        })
        .send({ success: true })
    })

    // Services Related  API
    app.get('/services', async (req, res) => {
      const cursor = serviceCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    })

    app.get('/services/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await serviceCollection.findOne(query);
      res.send(result);
    })

    // Order Section 
    app.get('/orders',verifyToken, async (req, res) => {
      if(req.query.email !==req.user.email){
        return res.status(403).send({message: 'Forbidden Access'})
      }
      let query = {};
      if (req.query?.email) {
        query = { email: req.query.email }
      }
      const result = await ordersCollection.find(query).toArray();
      res.send(result)
    })
    app.post('/orders', async (req, res) => {
      const orders = req.body;
      const result = await ordersCollection.insertOne(orders);
      res.send(result);
    })

    app.patch('/orders/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const updatedOrders = req.body;
      const updateDoc = {
        $set: {
          status: updatedOrders.status
        }
      };
      const result = await ordersCollection.updateOne(query, updateDoc)
      res.send(result)

    })

    app.delete('/orders/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await ordersCollection.deleteOne(query)
      res.send(result);
    })

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



app.get('/', (req, res) => {
  res.send('Doctor Server is Running')
})

app.listen(port, () => {
  console.log(`car doctor server is running on server PORT: ${port}`)
})