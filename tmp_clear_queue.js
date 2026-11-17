const redis = require('./redis/client');

(async () => {
  const keys = await redis.keys('queue:*');
  if (keys.length) {
    await redis.del(keys);
  }
  console.log(JSON.stringify({ clearedKeys: keys }));
  process.exit(0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
