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
const INR_BALANCES: InrBalanceType = {
       
};

//ORDERBOOK
type UserOrderType = "direct" | "indirect"
interface OrderType {
    [userId: string]: {
        quantity: number,
        type: UserOrderType
    }
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
const ORDERBOOK: OrderbookType = {
    
};

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
const STOCK_BALANCES: StockBalancesType = {
    
}

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

function placeReverseOrders(userId: string, stockSymbol: string, stockType: A, quantity: number, price: number){
    const reversedStockType = stockType === "yes" ? "no" : "yes"
    const complementPrice = 10 - price;
    console.log("inside Place order")
    if(quantity){
        if(!ORDERBOOK[stockSymbol][reversedStockType][complementPrice]){
            ORDERBOOK[stockSymbol][reversedStockType][complementPrice] = {
                total: 0,
                orders: {
                    [userId]: {
                        quantity: 0,
                        type: "indirect"
                    } 
                }
            }
        }
        console.log("before total", ORDERBOOK[stockSymbol][reversedStockType][complementPrice].total)
        ORDERBOOK[stockSymbol][reversedStockType][complementPrice].total += quantity;
        console.log("after total before orders")
        ORDERBOOK[stockSymbol][reversedStockType][complementPrice].orders[userId].quantity += quantity
        ORDERBOOK[stockSymbol][reversedStockType][complementPrice].orders[userId].type = "indirect";
    }
}

function matchOrders(userId: string, price: number, quantity: number, stockSymbol: string, stockType: A){
    const availablePricesInOrderbook = ORDERBOOK[stockSymbol][stockType];
    
    let remainingQuantity = quantity;
    console.log("availablepricesin order book ",availablePricesInOrderbook); 
    Object.keys(availablePricesInOrderbook).forEach(availablePrice => {
        if(parseInt(availablePrice) <= price && remainingQuantity > 0){
            const availableQuantity = availablePricesInOrderbook[availablePrice].total;
            let matchedQuantity = Math.min(availableQuantity, remainingQuantity);
            console.log(matchedQuantity);
            const pendingOrders = availablePricesInOrderbook[availablePrice].orders;
            console.log(pendingOrders);
            Object.keys(pendingOrders).forEach(pendingOrderUserId => {
                const pendingOrderQuantity = pendingOrders[pendingOrderUserId].quantity;
                const pendingOrderType = pendingOrders[pendingOrderUserId].type;

                if(matchedQuantity <= pendingOrderQuantity && remainingQuantity > 0){
                    if(pendingOrderType === "direct"){
                        STOCK_BALANCES[pendingOrderUserId][stockSymbol][stockType].locked -= matchedQuantity;
                        STOCK_BALANCES[userId][stockSymbol][stockType].quantity += matchedQuantity;
                        const transactionAmount = price * matchedQuantity;
                        INR_BALANCES[userId].locked -= transactionAmount;
                        INR_BALANCES[pendingOrderUserId].balance += transactionAmount;
                        pendingOrders[pendingOrderUserId].quantity -= matchedQuantity;
                        remainingQuantity -= matchedQuantity;
                        return "Orders have been fulfilled."
                    }
                    if(pendingOrderType === "indirect"){
                        console.log("indirect")
                        const reverseOfPendingOrderStockType = stockType === "yes" ? "no" : "yes";
                        const complementOfPendingOrderPrice = 10 - price;
                        console.log("before INR transaction")
                        INR_BALANCES[pendingOrderUserId].locked -= complementOfPendingOrderPrice * matchedQuantity;
                        INR_BALANCES[userId].locked -= price * matchedQuantity;
                        if(!STOCK_BALANCES[pendingOrderUserId][stockSymbol]){
                           console.log("not available stock symbol in user")
                           STOCK_BALANCES[pendingOrderUserId][stockSymbol] = {
                                "yes": {
                                    quantity: 0,
                                    locked: 0,
                                },
                                "no": {
                                    quantity: 0,
                                    locked: 0
                                }
                           }
                        }
                        if(!STOCK_BALANCES[userId][stockSymbol]){
                            console.log("not available stock symbol in user")
                            STOCK_BALANCES[userId][stockSymbol] = {
                                 "yes": {
                                     quantity: 0,
                                     locked: 0,
                                 },
                                 "no": {
                                     quantity: 0,
                                     locked: 0
                                 }
                            }
                         }
                        console.log("before stock transaction.",STOCK_BALANCES[pendingOrderUserId][stockSymbol])
                        STOCK_BALANCES[pendingOrderUserId][stockSymbol][reverseOfPendingOrderStockType].quantity += matchedQuantity;
                        STOCK_BALANCES[userId][stockSymbol][stockType].quantity += matchedQuantity;
                        console.log("before pending order", pendingOrders)
                        pendingOrders[pendingOrderUserId].quantity -= matchedQuantity;
                        availablePricesInOrderbook[availablePrice].total -= matchedQuantity;
                        console.log("after pending order", pendingOrders);
                        remainingQuantity -= matchedQuantity;
                        
                        return "Orders have been fulfilled"
                    }
                }
                if(matchedQuantity > pendingOrderQuantity){
                    if(pendingOrderType === "direct"){
                        //stock transfer
                        STOCK_BALANCES[pendingOrderUserId][stockSymbol][stockType].locked -= pendingOrderQuantity;
                        STOCK_BALANCES[userId][stockSymbol][stockType].quantity += pendingOrderQuantity;

                        //money transfer
                        const transactionAmount = price * matchedQuantity;
                        INR_BALANCES[userId].locked -= transactionAmount;
                        INR_BALANCES[pendingOrderUserId].balance += transactionAmount;
                        pendingOrders[pendingOrderUserId].quantity -= pendingOrderQuantity;
                        
                        remainingQuantity -= pendingOrderQuantity;
                        matchedQuantity -= pendingOrderQuantity;
                    }

                    if(pendingOrderType === "indirect"){
                        const reverseOfPendingOrderStockType = stockType === "yes" ? "no" : "yes";
                        const complementOfPendingOrderPrice = 10 - price;
                        STOCK_BALANCES[pendingOrderUserId][stockSymbol][reverseOfPendingOrderStockType].quantity += pendingOrderQuantity;
                        STOCK_BALANCES[userId][stockSymbol][stockType].quantity += pendingOrderQuantity;

                        INR_BALANCES[pendingOrderUserId].locked -= complementOfPendingOrderPrice * matchedQuantity;
                        INR_BALANCES[userId].locked -= price * matchedQuantity;

                        remainingQuantity -= pendingOrderQuantity;
                        matchedQuantity -= pendingOrderQuantity;

                    }
                }
            })

        }
    })

    console.log("remaing quantity before placereverseorder", remainingQuantity);
    if(remainingQuantity){
        placeReverseOrders(userId, stockSymbol, stockType, remainingQuantity, price);
    }  
}
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

    //check if stock is listed or not in orderbook
    if(!ORDERBOOK[stockSymbol]){
        res.json({
            message: "This stock has been removed or expired."
        })
        return
    }

    const orderBookWithStockSymStockType = ORDERBOOK[stockSymbol][stockType];

    const isOrderbookPricesEmpty = !Object.keys(orderBookWithStockSymStockType).length;
    console.log(isOrderbookPricesEmpty);
    if(isOrderbookPricesEmpty){
        console.log("is empty");
        placeReverseOrders(userId, stockSymbol, stockType, quantity, price);
        res.json({
            message: "You have placed the first order."
        })
        return
    }
    matchOrders(userId,price, quantity, stockSymbol, stockType);
    res.json({
        message: "Order Placed.",
        ORDERBOOK
    })
})


//matching sell orders

function matchingSellOrders(userId: string, price: number, quantity: number, stockSymbol: string, stockType: A){

    const orderbookPendingOrderPrices = ORDERBOOK[stockSymbol][stockType];
    console.log(orderbookPendingOrderPrices)
    let remainingQuantity = quantity;
    Object.keys(orderbookPendingOrderPrices).sort().reverse().forEach( orderPrice => {
        if(parseInt(orderPrice) >= price){
            const pendingOrders = orderbookPendingOrderPrices[orderPrice].orders;
            const availableQuantity = orderbookPendingOrderPrices[orderPrice].total;
            let matchedQuantity = Math.min(availableQuantity, remainingQuantity);
            console.log("userIds for pending orders",pendingOrders);
            Object.keys(pendingOrders).forEach( pendingOrderUserId => {
                const pendingOrderQuantity = pendingOrders[pendingOrderUserId].quantity;
                const pendingOrderType = pendingOrders[pendingOrderUserId].type;
                if(pendingOrderType === "indirect"){
                    if(matchedQuantity <= pendingOrderQuantity){
                        const reversedStockType = stockType === "yes" ? "no" : "yes";
                        STOCK_BALANCES[userId][stockSymbol][stockType].locked -= matchedQuantity;
                        STOCK_BALANCES[pendingOrderUserId][stockSymbol][reversedStockType].quantity += matchedQuantity;
                        INR_BALANCES[userId].balance += matchedQuantity * price;
                        INR_BALANCES[pendingOrderUserId].locked -= matchedQuantity * price;
                        ORDERBOOK[stockSymbol][stockType][orderPrice].total -= matchedQuantity;
                        ORDERBOOK[stockSymbol][stockType][orderPrice].orders[pendingOrderUserId].quantity -= matchedQuantity;
                        remainingQuantity -= matchedQuantity;
                    }
                }
            })
        }
    });

    if(remainingQuantity){
        ORDERBOOK[stockSymbol][stockType][price].total += quantity;
        ORDERBOOK[stockSymbol][stockType][price].orders[userId].quantity += quantity;
        ORDERBOOK[stockSymbol][stockType][price].orders[userId].type = "direct"
    }
    
}
app.post('/order/sell', (req, res) => {
    const userId = req.body.userId as string;
    const stockSymbol = req.body.stockSymbol as string;
    const quantity = req.body.quantity as number;
    const price = req.body.price as number;
    const stockType = req.body.stockType as A;

    if(!userId || !stockSymbol || !quantity || !price || !stockType)
        if(!INR_BALANCES[userId]){
            res.json("User does not exist.")
    }
    console.log(STOCK_BALANCES[userId]);
    if(!STOCK_BALANCES[userId][stockSymbol]){
        console.log("you dont have stocks.")
    }

    if(STOCK_BALANCES[userId][stockSymbol][stockType].quantity < quantity){
        console.log("you dont have enough stocks to sell")
    }

    STOCK_BALANCES[userId][stockSymbol][stockType].quantity -= quantity;
    STOCK_BALANCES[userId][stockSymbol][stockType].locked += quantity;

    console.log("orderbook with stock symbol", ORDERBOOK[stockSymbol])
    console.log("orderbook with symbol with type", ORDERBOOK[stockSymbol][stockType])
    if(!ORDERBOOK[stockSymbol][stockType][price]){
        ORDERBOOK[stockSymbol][stockType][price] = {
            total: 0,
            orders: {
                [userId]: {
                    quantity: 0,
                    type: "direct"
                }
            }
        }
    }
    console.log("orderbook with symbol type and price", ORDERBOOK[stockSymbol][stockType][price])
    matchingSellOrders(userId, price, quantity, stockSymbol, stockType);
    res.json({
        message: "Sell order placed successfully.",
        ORDERBOOK
    })
})

app.get('/orderbook/:stockSymbol', (req, res) => {
    const { stockSymbol } = req.params;

    res.json(ORDERBOOK[stockSymbol]);
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