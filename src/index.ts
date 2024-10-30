import express from "express"

const app = express();

app.get('/hello', (req, res) => {
    res.send("You are welcomed!")
})
const port = 3000
app.listen(port, () => {
    console.log("server is running on port " + port);
})