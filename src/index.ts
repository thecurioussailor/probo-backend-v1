import express from "express"

const app = express();

app.use(express.json());

//INR_BALANCES
interface UserBalance {
    balance: number,
    locked: number
}
interface InrBalanceType {
    [userId: string]: UserBalance
}
const INR_BALANCES: InrBalanceType = {};

//ORDERBOOK
interface OrderType {
    [userId: string]: number
}
interface StockType {
    [price: string]: {
        total: number,
        orders: OrderType
    }
}
type A = "yes" | "no"
type StockSymbolType = {
    [stockType in A]: StockType
}
interface OrderbookType {
    [stockSymbol: string]: StockSymbolType
}
const ORDERBOOK: OrderbookType = {};

//STOCK_BALANCES

interface StockTypeStruc {
    quantity: number,
    locked: number
}
type B = "yes" | "no"
type StockSymType = {
    [stockType in B]: StockTypeStruc
}
interface UserType {
    [stockSymbol: string]: StockSymType
}
interface StockBalancesType {
    [userId: string]: UserType
}
const STOCK_BALANCES: StockBalancesType = {}

app.post('/user/create/:userId', (req, res) => {
    const {userId} = req.params;

    if(INR_BALANCES[userId]){
        res.json({
            message: "User already exist."
        })
        return
    }
    INR_BALANCES[userId] = {
        balance: 0,
        locked: 0
    }

    STOCK_BALANCES[userId] = {}
    res.json({
        message: "User created."
    })
})

app.post('/symbol/create/:stockSymbol', (req, res) => {
    const {stockSymbol} = req.params;

    if(ORDERBOOK[stockSymbol]){
        res.json({
            message: "Symbol already exist."
        })
        return
    }
    ORDERBOOK[stockSymbol] = {
        "yes": {},
        "no": {}
    }
    res.json({
        message: "Symbol created successfully."
    })
})

app.get('/orderbook', (req, res) => {
    res.json(ORDERBOOK);
})

app.get('/balances/inr', (req, res) =>{
    res.json(INR_BALANCES);
})

app.get('/balances/stock',(req, res) =>{
    res.json(STOCK_BALANCES);
})

app.post('/reset', (req, res) => {

    Object.keys(ORDERBOOK).forEach((key) => delete ORDERBOOK[key]);
    Object.keys(INR_BALANCES).forEach(key => delete INR_BALANCES[key]);
    Object.keys(STOCK_BALANCES).forEach(key => delete STOCK_BALANCES[key]);

    res.json({
        message: "Data has been reset."
    })
})

//application functionality
app.get('/balance/inr/:userId',(req, res) => {
    const { userId } = req.params;
    if(!INR_BALANCES[userId]){
        res.json({
            message: "User Id does not exist."
        })
        return
    }
    const balance = INR_BALANCES[userId].balance;

    res.json({
        balance
    })
})

app.post('/onramp/inr',(req, res) => {
    const { userId, amount } = req.body;

    if(!INR_BALANCES[userId]){
        res.json({
            message: "User does not exist."
        })
    }

    INR_BALANCES[userId].balance += amount;

    res.json({
        message: "Balance added to the user."
    })
})

app.get('/balance/stock/:userId', (req, res) => {
    const { userId } = req.params;

    if(!STOCK_BALANCES[userId]){
        res.json("User stock doesnt exist.")
        return
    }

    res.json(STOCK_BALANCES[userId]);
})

app.post('/order/buy', (req, res) => {
     
    const userId = req.body.userId as string;
    const stockSymbol = req.body.stockSymbol as string;
    const quantity = req.body.quantity as number;
    const price = req.body.price as number;
    const stockType = req.body.stockType as A;

    if(!userId || !stockSymbol || !quantity || !price || !stockType)
    if(!INR_BALANCES[userId]){
        res.json("User does not exist.")
    }
    if(INR_BALANCES[userId].balance < quantity * price){
        res.json({
            message: "Insufficient Balance."
        })
        return
    }

    //locking the money for buy order
    const totalCost = price * quantity; 
    INR_BALANCES[userId].balance -= totalCost;
    INR_BALANCES[userId].locked += totalCost;

    if(!ORDERBOOK[stockSymbol]){
        res.json({
            message: "Symbol doesn't exist."
        })
    }
    if(!ORDERBOOK[stockSymbol][stockType]){
        res.json({
            message: "dos not exist."
        })
        return
    }
    
    //reverse the order with price and stockType
    const reversedStockType = stockType === "yes" ? "no" : "yes";
    const reversedPrice = 10 - price;
    //initializing the orderbook with stocktype at a reverse price and default value
    const orderbook = ORDERBOOK[stockSymbol][reversedStockType];
    if(!orderbook[reversedPrice]){
        orderbook[reversedPrice]={
            total: 0,
            orders: {
                [userId]: 0
            }
        };
        orderbook[reversedPrice].total += quantity;
        orderbook[reversedPrice]["orders"][userId] += quantity;
        res.json({
            message: "You order has been placed."
        })
        return
    }else {
        //matching the reverse order
        const availablePrices = ORDERBOOK[stockSymbol][stockType];
        const sortedPrices = Object.keys(availablePrices).map(Number).sort((a,b) => a - b)
        const remainingQuantity = quantity;
        for(const orderPrice of sortedPrices){
            if((stockType === "yes" && orderPrice > price)){
                break;
            }
            const orders = availablePrices[orderPrice];

            for(const [orderUser , orderQuantity] of Object.entries(orders)){
                console.log("1." + orderUser + "2" + orderQuantity)
                // const matchedQuantity = Math.min(remainingQuantity, )
            }
            
        }
       
    }


    res.json({
        message: "Order Placed.",
        ORDERBOOK
    })
})

app.post('/trade/mint', (req, res) => {
    const { userId, stockSymbol , quantity} = req.body;

    if(!userId || !stockSymbol || !quantity){
        res.json({
            message: "Please fill the details."
        })
        return
    }

    if(!ORDERBOOK[stockSymbol]){
        res.json({
            message: "Stock symbol not available"
        })
        return
    }

    if(!STOCK_BALANCES[userId][stockSymbol]){
        STOCK_BALANCES[userId] = {
            [stockSymbol]: {
                "yes": {
                    "quantity":0,
                    "locked":0,
                },
                "no": {
                    quantity: 0,
                    locked: 0
                }
            }
        }
    }

    STOCK_BALANCES[userId][stockSymbol].yes.quantity += quantity;
    STOCK_BALANCES[userId][stockSymbol].no.quantity += quantity;
    res.json();
        
})
const port = 3000
app.listen(port, () => {
    console.log("server is running on port " + port);
})