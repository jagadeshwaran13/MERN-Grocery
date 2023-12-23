const express = require ("express");
const cors = require("cors")
const mongoose = require("mongoose")
const dotenv = require("dotenv").config()
const Stripe = require('stripe')
const nodemailer = require("nodemailer")
const crypto = require("crypto")
 
const app = express()
app.use(cors())
app.use(express.json({limit : '10mb'}))
 
const PORT = process.env.port || 8080
// mongodb connection
console.log(process.env.MONGODB_URL)
mongoose.set('strictQuery',false);
mongoose.connect(process.env.MONGODB_URL)
.then(() => console.log("connect to Database"))
.catch((err)=> console.log(err))
 
// Schema
const userSchema = mongoose.Schema({
    firstName:String ,
    lastName: String,
    email: {
        type: String,
        unique: true
    },
    password: String,
    confirmPassword:String ,
    image : String,
})
 
// Model
 
const userModel = mongoose.model("user",userSchema)
 
// api
app.get("/" ,(req,res) => {
    res.send("server is running")
})

//sign up
app.post("/signup",async(req,res)=> {
   // console.log(req.body);
    const {email} = req.body
 
    /*userModel.findOne({email : email},(err,result) => {
        console.log(result)
        console.log(err)
    })
    */
    const query = userModel.findOne({ email: email });
    query.exec()
      .then((result) => {
        console.log(result);
        if(result){
            res.send({message: "Email id is already registered",alert : false})
        }
        else{
            const data = userModel(req.body)
            const save = data.save()
            res.send({message : "Successfully sign up",alert : true})
        }
      })
      .catch((err) => {
        console.error(err);
        res.status(500).send({message:"Internal server error"})
    });
})

//login

app.post("/login",async(req,res)=>{
   // console.log(req.body)
    const{email} = req.body
    
        try {
            const result = await userModel.findOne({ email: email });
        
            if (result) {
                const dataSend = {
                
                    firstName: result.firstName,
                    lastName: result.lastName,
                    email: result.email,
                    image: result.image,
                };
        
                //console.log(dataSend);
                res.send({ message: "Login is successfully done", alert: true, data : dataSend });
            } else {
                // User with the provided email does not exist
                res.send({ message: "User not found", alert: false, data: dataSend });
            }
        } catch (error) {
            console.error(error);
            res.status(500).send({ message: "Internal Server Error" });
        }
        
    });
   




// forgot-password


app.post('/forgot-password', async (req, res) => {
    const { email } = req.body;
  
    try {
      // Generate a unique token
      const token = crypto.randomBytes(32).toString('hex');
  
      // Set expiration time to 1 hour from now
      const expirationTime = Date.now() + 60 * 60 * 1000;
  
      // Save token and expiration time in the database
      await userModel.findOneAndUpdate(
        { email },
        {
          $set: {
            resetPasswordToken: token,
            resetPasswordExpires: expirationTime,
          },
        }
      );
  
      // Send email with the reset link
      const resetLink = `${process.env.FRONTEND_URL}/reset-password/${token}`;
  
      // Configure Nodemailer transporter
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USERNAME,
          pass: process.env.EMAIL_PASSWORD,
        },
      });
  
      // Configure email options
      const mailOptions = {
        from: 'saisowmyajayavaram456@gmail.com',
        to: email,
        subject: 'Password Reset',
        text: `Click on the following link to reset your password: ${resetLink}`,
      };
  
      // Send the email
      await transporter.sendMail(mailOptions);
  
      res.json({ message: 'Password reset link sent to your email' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Enter your email.......' });
    }
  });




//product section

const schemaProduct = mongoose.Schema({
    name : String,
    category : String,
    image : String,
    price : String,
    description : String
});
const productModel = mongoose.model("product",schemaProduct)



//save product in data
//api
app.post("/uploadProduct",async(req,res)=>{
   // console.log(req.body)
    
    const data = await productModel(req.body)
    const datasave = await data.save()
    res.send({message : "Uploded Succesfully!!"})
})

//
app.get("/product",async(req,res)=>{
    const data = await productModel.find({})
    res.send(JSON.stringify(data)) ///to convert the data in json string format
})



//payment
console.log(process.env.STRIPE_SECRET_KEY)


const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
app.post("/checkout-payment",async(req,res)=> {
    console.log(req.body)

    try{
          const params ={
                submit_type : 'pay',
                mode: 'payment',
                payment_methos_type : ['card'],
                billing_address_collections : 'auto',
                shipping_options : [{shipping_rate :"shr_1OJCCWSJG60jTYWjjMF86O1y"}],
                line_items : req.body.map((item)=>{
                    return{
                        price_data :{
                            currency : "inr",
                            product_data :{
                                name: item.name,
                                images : [item.image]
                            },
                            unit_amount : item.price * 100,
                          },
                          adjustable_quantity : {
                            enable : true,
                            minimum : 1
                          },
                          quantity : item.qty
                    }
                }),
                success_url : `${process.env.FRONTEND_URL}/success`,
                cancel_url : `${process.env.FRONTEND_URL}/cancel`,
          }


          const session = await stripe.checkout.sessions.create(params)
         console.log(session)
          res.status(200).json(session.id)
    }
    catch(err){
        res.status(err.statusCode || 500).json(err.message)
    }

  
   // res.send({message : "Payment gatway", sucess : true})
})




app.listen(PORT,()=> {
   console.log(`server is running at port: ${PORT}`)
})