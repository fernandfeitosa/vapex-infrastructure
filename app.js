require("dotenv").config({ path: require("path").join(__dirname, ".env") });

const express = require("express");
const cors = require("cors");

// Middlewares
const authMiddleware = require("./middlewares/auth.middleware").default;

// Rotas
const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/user.routes");
const hostRoutes = require("./routes/host.routes");
const sessionRoutes = require("./routes/session.routes");
const walletsRoutes = require("./routes/wallets.routes");
const homeRoutes = require("./routes/home.routes");
const walletRoutes = require("./routes/wallet.routes");
const parearRoutes = require("./routes/parear.routes");
const versionRoutes = require("./routes/version.routes");
const paymentRoutes = require("./routes/payment.routes");


// Workers
require("./workers/billing.worker")();

const app = express();
const PORT = process.env.PORT || 3000;

/*
|--------------------------------------------------------------------------
| Configuração da aplicação
|--------------------------------------------------------------------------
*/
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/*
|--------------------------------------------------------------------------
| Rotas públicas
|--------------------------------------------------------------------------
*/

versionRoutes(app);
parearRoutes(app);
authRoutes(app);




/*
|--------------------------------------------------------------------------
| Middleware JWT
|--------------------------------------------------------------------------
*/
app.use(authMiddleware);

/*
|--------------------------------------------------------------------------
| Rotas privadas
|--------------------------------------------------------------------------
*/

paymentRoutes(app);
userRoutes(app);
hostRoutes(app);
sessionRoutes(app);
walletsRoutes(app);

/*
|--------------------------------------------------------------------------
| Activitys Routes
|--------------------------------------------------------------------------
*/

homeRoutes(app);
walletRoutes(app);


// SocketIO Server
const http = require("http");
const socket = require("./sockets/socket");
const server = http.createServer(app);

socket.initialize(server);

/*
|--------------------------------------------------------------------------
| Inicialização do servidor
|--------------------------------------------------------------------------
*/

server.listen(PORT, () => {
    console.log(`
╔══════════════════════════════╗
║      👾 Cloud Backend        ║
║      Status: ONLINE 🚀       ║
║      Porta: ${PORT}          ║
╚══════════════════════════════╝
`);
});