const { createClient } = require("redis");

const redisClient = createClient();


redisClient.connect();
redisClient.configSet("notify-keyspace-events","KEA");


module.exports = redisClient;