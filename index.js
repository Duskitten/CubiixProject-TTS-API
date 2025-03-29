const express = require('express');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const PocketBase = require('pocketbase/cjs')
const pb = new PocketBase('http://127.0.0.1:8090');
const fs = require("fs");
const path = require('path')

const app = express();
app.use(express.json());
 
// Set up Global configuration access
dotenv.config();
 
//ENV File pulls
//Env file should just be right next to the .js file and formatted as such below
let PORT = process.env.PORT;
//PORT=xxxx
let jwtSecretKey = process.env.JWT_SECRET_KEY;
//JWT_SECRET_KEY= public RSA key here from a server 
//I use my wiki's RSA key, so you could make your own validation keys
let SecretEncoder = process.env.SECRET_ENCODER;
//SECRET_ENCODER=["EncrypterHelper1","EncrypterHelper2"]
//These are for creating the player secrets later on! Mine are different ;P
let isCubiixMainAPI = process.env.IS_CUBIIX_MAINAPI;
//IS_CUBIIX_MAINAPI=false
//This is for my personal server linked to the wiki

//TLDR:
//Filename .env

//PORT=XXXX
//JWT_SECRET_KEY=""
//SECRET_ENCODER=["EncrypterHelper1","EncrypterHelper2"]
//IS_CUBIIX_MAINAPI=false

app.listen(PORT, () => {
    console.log(`Server is up and running on ${PORT} ...`);
    console.log(isCubiixMainAPI)
});
 
// Verification of JWT
app.post("/user/validateToken", async (req, res) => {
    // Tokens are generally passed in header of request
    // Due to security reasons.
    var token = req.header("userToken");
    const tokenUser = req.header("userName");
    const tokenPass = req.header("userPassword");
 
    try {
        var verified
        var plr
        if (isCubiixMainAPI === "true"){
            console.log("This Is Meep2!")
            verified = jwt.verify(token, jwtSecretKey,{'algorithms': 'RS256'});
            console.log(verified)
            if (verified) {
                 plr = jwt.decode(token, {'algorithms': 'RS256'})
             }
        } else if (isCubiixMainAPI === "false"){
            console.log("This Is Meep!")

            const authData = await pb.collection('users').authWithPassword(
                tokenUser,
                tokenPass,
            );
            console.log(authData["token"])
            var token = authData["token"]
            plr = jwt.decode(token, {header: true})
            console.log(pb.authStore.token);
            pb.authStore.clear();
            console.log(plr)
            verified = "hi"
        }

        if (verified) {
            console.log("Hai")
            var secret1 = plr["id"] + SecretEncoder[0] + plr["iat"] + SecretEncoder[1]  + plr["exp"] ;
            
            //We Add the iat and exp so that it changes every time we login
            //The other two spots are secret keys to prevent Haxors lol
            
            var newHash1 = crypto.createHash('sha256',secret1).digest('hex')

            const result = await pb.collection('guidebook').getList(1, 1, {
                filter: 'userID = \"'.concat( plr["id"] ).concat('\" && userSecretCode = \"').concat( newHash1 ).concat('\"')
            });

            if (Object.keys(result["items"]).length === 0){
                const data = {
                    "userID":plr["id"],
                    "userSecretCode":newHash1
                }
                var record = await pb.collection('guidebook').create(data);

                const result2 = await pb.collection('guidebook').getList(1, 1, {
                    filter: 'userID = \"'.concat( plr["id"] ).concat('\"')
                });

                if (Object.keys(result2["items"]).length === 0){}
                else{
                    const data2 = {
                        "id":result2["items"][0]["id"],
                        "userID":plr["id"]
                        
                    }
                    await pb.collection('character').create(data2);
                }

            }

            
            return res.send({"status":0, "returnmsg":"User found.", "userSecretCode":newHash1, "userID": plr["id"]});
        } else {
            return res.send({"status":1, "returnmsg":"User error."});
        }
    } catch (error) {
        
        // Access Denied
       return res.send({"status":1, "returnmsg":"User error."});
    }
});

app.get("/", async(req, res) => {
    return res.send({
        "API":"OK",
        "Message":"-----Hello whoever is looking at me!----",
        "0--":"░░░░░░░░░░░░░░░░░░░░░░░▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒",
        "1--":"░          ░░░░░░░░░░░░▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒",
        "2--":"░    █     ░░░░█░░░░░░░▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒",
        "3--":"░   ██     ░░░░██░░░░░░▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒",
        "4--":"░   ██     ░░░░██░░░░░░▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒",
        "5--":"░░░░██░░░░░    ██      ▒                ▒",
        "6--":"░░░░░█░░░░░    █       ▒                ▒",
        "7--":"░░░░░░░░░░░            ▒                ▒",
        "8--":"░░░░░░░░░░░░░░░░░░░░░░░▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒",
    });
});

app.get("/game/versionUrl", async(req, res) => {
    fs.readFile("./cubiix_versions/current_version.txt","utf-8", (err,data) => {
        if(err){
         return res.send({"status":0, "returnmsg":"No VersionID Found"})
        }
        else {
         return res.send({"API":data})
        }

    })
});

app.get("/game/versionDownload", async(req, res) => {
    try {
        if (req.header("versionID")){
            res.sendFile(
                path.join(__dirname,'./cubiix_versions/PCK/'+req.header("versionID")+'.pck')
            )
        }else{
            return res.send({"status":0, "returnmsg":"No VersionID Found"});
        }

    }catch(error){
        return res.send({"status":404, "returnmsg":"Update File Not Found."});
    }
});

app.get("/user/getUser", async(req, res) => {
    try {
        //console.log(req.header("userID"), "lol")
        if (req.header("userID")){
            const result = await pb.collection('character').getList(1, 20, {
                filter: 'userID = "'.concat( req.header("userID") ).concat('"')
            });
            //console.log(result)
            return res.send({"status":0, "returnmsg":"User found", "value":result});
        }
        else {
            return res.send({"status":1, "returnmsg":"Error: no user ID found"});
        }
} catch (error) {
        
    // Access Denied
    return res.send({"status":1, "returnmsg":"User error."});
}

});

app.get("/user/validateUser", async(req, res) => {

 try {
    //console.log(req.header("userID"))
    if (req.header("userID") && req.header("userSecretCode")){
        const result = await pb.collection('guidebook').getList(1, 1, {
            filter: 'userID = '.concat( req.header("userID") ).concat(' && userSecretCode = ').concat( req.header("userSecretCode") )
        });
        if (Object.keys(result["items"]).length === 0){
            //console.log("no player found!")
             return res.send({"status":1, "returnmsg":"Invalid user."});
        };

         return res.send({"status":0, "returnmsg":"User Found successfully."});
    }
    else {
        return res.send({"status":1, "returnmsg":"User error."});
    }
} catch (error) {
        
    // Access Denied
    return res.send({"status":1, "returnmsg":"Access Denied"});
}

});

app.post("/user/setUser", async(req, res) => {
    //console.log(req.body)
    try {
    //console.log(req.header("userID"))
    if (req.header("userID") && req.header("userSecretCode")){
        const result = await pb.collection('guidebook').getList(1, 1, {
            filter: 'userID = "'.concat( req.header("userID") ).concat('" && userSecretCode = ').concat( req.header("userSecretCode") )
        });
        if (Object.keys(result["items"]).length === 0){
            //console.log("no player found!")
             return res.send({"status":1, "returnmsg":"Invalid user."});
        }else{
           // console.log("playerfound!")
            
            const data = {
                "playerdata": req.body
            }
            var record = await pb.collection('character').update(result["items"][0]["id"], data);
        };

         return res.send({"status":0, "returnmsg":"User saved successfully."});
    }
    else {
        return res.send({"status":1, "returnmsg":"User error."});
    }
} catch (error) {
        
    // Access Denied
    return res.send({"status":1, "returnmsg":"User error."});
}

});

const validateEmail = (email) => {
  return String(email)
    .toLowerCase()
    .match(
      /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
    );
};

app.post("/user/registerUser", async(req, res) => {

    const tokenUser = req.header("userName");
    const tokenPass = req.header("userPassword");
    if (isCubiixMainAPI === "false"){
        try {
            //This path means the user already exists
            const authData = await pb.collection('users').authWithPassword(
                tokenUser,
                tokenPass,
            );
            return res.send({"status":2, "returnmsg":"User Exists!"});
        } catch (error) {
            // This is the path to create the user
            if (error["status"] == 400){
                var Memail = await validateEmail(tokenUser)
                console.log("user does not exist!")
                if (Memail === null) {
                    return res.send({"status":1, "returnmsg":"Error no valid email."}); 
                    
                } else {
                    if (tokenPass.length > 7 && tokenPass.length <= 72){
                        const user = await pb.collection('users').create({
                            email: tokenUser,
                            password: tokenPass,
                            passwordConfirm: tokenPass,
                        });
                        return res.send({"status":0, "returnmsg":"New user created successfully!"});
                    }
                    return res.send({"status":1, "returnmsg":"Password must be between 8 and 72 chars long."});
                }
                
            }else{
                return res.send({"status":1, "returnmsg":"User exists."});
            }
        }
    } else {
        return res.send({"status":1, "returnmsg":"Sorry nerd, this is my wiki server, use the actual auth system >:3"});
    }

});
