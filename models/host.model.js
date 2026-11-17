const sql = require("../config/db");


/*
    Host Model
    - getAllHosts: Get all hosts
    - getHostById: Get host by ID
    - createHost: Create new host
    - updateHost: Update host by ID
    - deleteHost: Delete host by ID

*/

module.exports = class Host {

    static async getAllHosts() {    
        try {
            const hosts = await sql`SELECT * FROM hosts`;
            return hosts;
        }
        catch (err) {   
            console.error('Error fetching hosts:', err);
            throw new Error('Failed to fetch hosts');
        }
    }

    static async getHostById(id) {
        try {
            const host = await sql`SELECT * FROM hosts WHERE id = ${id}`;
            return host[0] || null;
        } catch (err) {
            console.error('Error fetching host:', err);
            throw new Error('Failed to fetch host');
        }
    }

    static async createHost(hostData) {
        try {
            await sql`INSERT INTO hosts (user_id, host_token, hostname, city, state, country, latitude, longitude, ip_address, gpu, cpu, ram_gb, storage_gb, internet_download, internet_upload, encoder, os, max_sessions,current_sessions,online, verified,avg_ping,avg_fps,total_sessions,earnings,status,created_at,updated_at) 
            VALUES (${hostData.user_id}, ${hostData.host_token}, ${hostData.hostname}, ${hostData.city}, ${hostData.state}, ${hostData.country}, ${hostData.latitude}, ${hostData.longitude}, ${hostData.ip_address}, ${hostData.gpu}, ${hostData.cpu}, ${hostData.ram_gb}, ${hostData.storage_gb}, ${hostData.internet_download}, ${hostData.internet_upload}, ${hostData.encoder}, ${hostData.os}, ${hostData.max_sessions}, ${hostData.current_sessions}, ${hostData.online}, ${hostData.verified}, ${hostData.avg_ping}, ${hostData.avg_fps}, ${hostData.total_sessions}, ${hostData.earnings}, ${hostData.status}, ${hostData.created_at}, ${hostData.updated_at})`;
            return {
                message: 'Host created successfully',
                data: hostData
            };
        } catch (err) {
            console.error('Error creating host:', err);
            throw new Error('Failed to create host');
        }
    }

    static async updateHost(id, updatedData) {  
        try {
            await sql`UPDATE hosts SET status = ${updatedData.status}  WHERE id = ${id}`;
            return {
                message: `Host with ID: ${id} updated successfully`,
                data: updatedData
            };
        }
        catch (err) {
            console.error('Error updating host:', err);
            throw new Error('Failed to update host');
        }
    }

    static async deleteHost(id) {
        try {
            await sql`DELETE FROM hosts WHERE id = ${id}`;
            return {
                message: `Host with ID: ${id} deleted successfully`
            };
        } catch (err) {
            console.error('Error deleting host:', err);
            throw new Error('Failed to delete host');
        }
    }

    //get host onde status == disponivel
    static async getAllAvailableHosts() {
        try {
            const hosts = await sql`SELECT * FROM hosts WHERE status = 'available'`;
            return hosts || null;
        } catch (err) {
            console.error('Error fetching available hosts:', err);
            throw new Error('Failed to fetch available hosts');
        }
    }
}
