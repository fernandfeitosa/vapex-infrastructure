const redisClient = require("./client");

// cria subscriber baseado no client principal
const subscriber = redisClient.duplicate();

subscriber.connect();


module.exports = subscriber;

