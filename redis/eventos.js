const subscriber = require("./subscriber");



module.exports = async () => {

    // criado
    await subscriber.subscribe(
        "__keyevent@0__:set",
        (key) => {
            
        }
    );

     // expirou
    await subscriber.subscribe(
        "__keyevent@0__:expired", 
        (key) => {
            

        }
    );

    // deletado
    await subscriber.subscribe(
        "__keyevent@0__:del",
        (key) => {
        
        }
    );

};