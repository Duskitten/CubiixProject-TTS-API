const express = require('express');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const PocketBase = require('pocketbase/cjs')
const pb = new PocketBase('http://127.0.0.1:8090');

const app = express();
app.use(express.json());
 
// Set up Global configuration access
dotenv.config();
 
//ENV File pulls
let PORT = process.env.PORT;
//PORT=xxxx
let jwtSecretKey = process.env.JWT_SECRET_KEY;
//JWT_SECRET_KEY= public RSA key here from a server (I use my wiki's RSA key, so you could make your own validation keys)
let SecretEncoder = process.env.SECRET_ENCODER;

app.listen(PORT, () => {
    console.log(`Server is up and running on ${PORT} ...`);
});
 
// Verification of JWT
app.post("/user/validateToken", async (req, res) => {
    // Tokens are generally passed in header of request
    // Due to security reasons.
    const token = req.header("userToken");
 
    try {
        
        const verified = jwt.verify(token, jwtSecretKey,{'algorithms': 'RS256'});

        if (verified) {
            var plr = jwt.decode(token, {'algorithms': 'RS256'})

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

            
            return res.send({"status":0, "userSecretCode":newHash1, "userID": plr["id"]});
        } else {
            
            // Access Denied
            return res.send({"status":1});
        }
    } catch (error) {
        
        // Access Denied
        return res.send({"status":error});
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

app.get("/user/getUser", async(req, res) => {
    try {
        //console.log(req.header("userID"), "lol")
        if (req.header("userID")){
            const result = await pb.collection('character').getList(1, 20, {
                filter: 'userID = "'.concat( req.header("userID") ).concat('"')
            });
            //console.log(result)
            return res.send({"status":result});
        }
        else {
            return res.send({"status":1});
        }
} catch (error) {
        
    // Access Denied
    return res.send({"status":error});
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
            return res.send({"result":"Invalid player to edit"});
        }else{
           // console.log("playerfound!")
            
            const data = {
                "playerdata": req.body
            }
           

            var record = await pb.collection('character').update(result["items"][0]["id"], data);
        };



        return res.send({"status":"OK"});
    }
    else {
        return res.send({"status":1});
    }
} catch (error) {
        
    // Access Denied
    return res.send({"status":error});
}

});