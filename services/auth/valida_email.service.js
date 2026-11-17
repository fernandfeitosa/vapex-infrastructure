const authModel = require('../../models/auth.model');

const verifyEmailToken = async (email, token) => {
    
  
    const user = await authModel.findUserByEmail(email);
    if(user.email_token == token) {
        await authModel.updateEmailVerified(user.id);
        return { message: 'Email verified' };
    }
    

    return { error: 'Invalid token' };
}   


module.exports = verifyEmailToken;