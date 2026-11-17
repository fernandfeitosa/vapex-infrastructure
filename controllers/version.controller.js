module.exports = {

    getVersion: async (req, res) => {
        try {
            const versionInfo = {
                versionCode: 57,
                versionName: "1.0.0",
                apkUrl: process.env.APK_URL || "http://192.168.30.103:3000/downloads/artemis.apk",
                releaseDate: "2026-06-18",
                status: "stable"
            };

            res.status(200).json(versionInfo);
        } catch (error) {
            console.error('Error fetching version:', error);
            res.status(500).json({ error: 'Failed to fetch version info' });
        }
    }

};
