const si = require('systeminformation');
const os = require('os');   


module.exports = (app) => {


    app.get('/api/host/metrics', async (req, res) => {
        try {
            const cpu = await si.cpu();
            const mem = await si.mem();
            const disk = await si.diskLayout();
            const network = await si.networkInterfaces();
            const metrics = {
                cpu: {
                    manufacturer: cpu.manufacturer,
                    brand: cpu.brand,
                    speed: cpu.speed,
                    cores: cpu.cores,
                    load: await si.currentLoad()
                },
                memory: {
                    total: mem.total,
                    free: mem.free,
                    used: mem.used,
                    active: mem.active,
                    available: mem.available
                },
                disk: disk.map(d => ({
                    device: d.device,
                    type: d.type,
                    name: d.name,
                    size: d.size,
                    used: d.used,
                    available: d.available,
                    use: d.use
                })),
                network: network.map(n => ({
                    iface: n.iface,
                    ip4: n.ip4,
                    ip6: n.ip6,
                    mac: n.mac,
                    internal: n.internal,
                    speed: n.speed
                }))
            };
            res.json(metrics);
        } catch (err) {
            console.error('Error fetching host metrics:', err);
            res.status(500).json({ error: 'Failed to fetch host metrics' });
        }
    });
    
};  
