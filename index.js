const express = require('express');
const cors = require('cors');
const app = express();
require('dotenv').config();
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const { MongoClient, ServerApiVersion , ObjectId } = require('mongodb');
const port = process.env.PORT || 2500;

// middleware
app.use(cors({
    origin: [
        'http://localhost:5173' ,
         'http://localhost:5174' ,
          'https://car-doctor-5cff0.web.app' ,
           'https://car-doctor-5cff0.firebaseapp.com/'
        ],
    credentials: true,
}));
app.use(express.json());
app.use(cookieParser());


app.get('/', (req , res)=>{
    res.send(" server workings")

})


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.malve12.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

// create  middleware
const logger = async(req , res , next)=>{
    console.log('called:', req.host , req.originalUrl , req.url , req.method);
    next()
}

const verifyToken = async(req , res , next)=>{
    const token = req.cookies.token;
    if (!token) {
        return res.status(401).send({message: 'not authorized'});
    }
    jwt.verify(token , process.env.APP_TOKEN_ACCESS , (err , decoded)=>{
        if (err) {
           return res.status(401).send({message: 'unauthorized'});
        }
        // console.log('check: ',decoded);
        req.user=decoded;
        next();
    })

};

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    const database = client.db("doctor_car").collection("services")


    // auth method

    app.post("/jwt" , logger ,async(req, res) => {
        const body = req.body;
        const token = jwt.sign(body, process.env.APP_TOKEN_ACCESS, { expiresIn: '1h' });
        res
        .cookie("token", token ,{
            httpOnly: true,
            secure: true,
            sameSite: 'none'
        })
        .send({success: true});

    
    })

    // app.post('/jwt' , async(req, res) => {
    //     const body = req.body;
    //     const token = jwt.sign(body , process.env.App , { expiresIn: '30min'})
    //     res
    //         .cookie('token', token ,{
    //             httpOnly: true,
    //             secure: true,
    //             sameSite: false,
    //         })
    //         .send({success:true})
    // })

    app.post('/logout', async (req, res)=>{
        const body = req.body;
        res.clearCookie('token',{maxAge:0}).send({success:true});
    });


    // services
    app.get("/services" ,logger, async(req, res) => {
        const result = await database.find().toArray();
        res.send(result);
    })

    app.get("/services/:id" , async(req, res) => {
        const id = req.params.id;
        const query ={_id: new ObjectId(id)}
        // const options = {
        //     projection: { title: 1,price: 1 , img: 1 , _id: 1 },
        //   };
        const result = await database.findOne(query);
        res.send(result);
    })

//  checkout data
    const CheckOutData = client.db("doctor_car").collection("CheckOut")

    app.get("/checkout", logger, verifyToken,async(req, res) => {
        console.log(req.user);
        if (req.query?.email !== req.user.email) {
            return res.status(401).send({message: 'access unauthorized'});
        }

        let query = {}
        if (req.query?.email) {
            query = {email : req.query.email}
        }
        const result = await CheckOutData.find(query).toArray();
        res.send(result);

    })

    app.post( "/checkout",async(req, res) => {
        const body = req.body;
        const result = await CheckOutData.insertOne(body);
        res.send(result);

    })

    app.patch( "/checkout/:id", async(req, res) => {
        const body = req.body;
        const id = req.params.id;
        const filter = {_id: new ObjectId(id)};
        const update ={
            $set:{
                status : body.status
            }
        }
        const result = await CheckOutData.updateOne(filter , update);
        res.send(result);
    })

    app.delete( "/checkout/:id", async(req, res) => {
        const id = req.params.id;
        const query = { _id: new ObjectId(id) };
        const result = await CheckOutData.deleteOne(query);
        res.send(result);
    });


    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);




app.listen(port , (req, res)=>{
    console.log(`server is listening on ${port}`);

})