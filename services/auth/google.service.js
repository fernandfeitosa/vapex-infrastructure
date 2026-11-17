const { OAuth2Client } = require('google-auth-library');
const { google } = require('googleapis');
const jwt = require('jsonwebtoken');
const authModel = require('../../models/auth.model');
const userModel = require('../../models/user.model');
const walletModel = require('../../models/wallets.model');
const { createFolderForUserId } = require('../../services/google/drive.service');


// ==============================
// EXCHANGE CODE FOR TOKENS
// ==============================
async function exchangeAuthCodeForTokens(googleAuthCode, redirectUri) {
  if (!googleAuthCode) {
    throw new Error('googleAuthCode is required to exchange tokens');
  }

  const currentRedirectUri =
    redirectUri == null ? 'postmessage' : redirectUri;

  const client =
    currentRedirectUri === ''
      ? new OAuth2Client(
          process.env.GOOGLE_CLIENT_ID,
          process.env.GOOGLE_CLIENT_SECRET
        )
      : new OAuth2Client(
          process.env.GOOGLE_CLIENT_ID,
          process.env.GOOGLE_CLIENT_SECRET,
          currentRedirectUri
        );

  const { tokens } = await client.getToken(googleAuthCode);

  if (!tokens?.access_token) {
    throw new Error('Falha ao receber tokens do Google');
  }

  return tokens;
}


// ==============================
// GOOGLE PROFILE
// ==============================
async function getGoogleProfile(tokens) {
  const authClient = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  authClient.setCredentials(tokens);

  const oauth2 = google.oauth2({ version: 'v2', auth: authClient });
  const { data } = await oauth2.userinfo.get();

  if (!data?.email) {
    throw new Error('Não foi possível obter dados do usuário do Google');
  }

  return data;
}


// ==============================
// MAIN AUTH
// ==============================
async function googleAuth({
  email,
  username,
  googleAuthCode,
  googleRedirectUri,
  avatarUrl
}) {
  try {
    if (!googleAuthCode) {
      return {
        status: 400,
        message: 'googleAuthCode é obrigatório para autenticação Google'
      };
    }

    const tokens = await exchangeAuthCodeForTokens(
      googleAuthCode,
      googleRedirectUri
    );

    let payload;

    if (tokens.id_token) {
      const verifier = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

      const ticket = await verifier.verifyIdToken({
        idToken: tokens.id_token,
        audience: process.env.GOOGLE_CLIENT_ID
      });

      payload = ticket.getPayload();
    } else {
      payload = await getGoogleProfile(tokens);
    }

    const googleEmail = payload.email.toLowerCase();
    const googleName = payload.name || username || googleEmail.split('@')[0];
    const googleAvatar = payload.picture || null;
    const refreshToken = tokens.refresh_token;

    let user = await authModel.findUserByEmail(googleEmail);

    // ==============================
    // CREATE USER
    // ==============================
    if (!user) {
      const avatar =
        avatarUrl ||
        googleAvatar ||
        `https://api.dicebear.com/10.x/fun-emoji/png?seed=${encodeURIComponent(
          googleName
        )}`;

      user = await authModel.createUser(
        googleName,
        googleEmail,
        null,
        null,
        avatar,
        true,
        refreshToken || null
      );

      await walletModel.createWallet({
        user_id: user.id,
        balance: 0.0,
        Wallet: 'BRL',
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    }

    // ==============================
    // UPDATE EXISTING USER
    // ==============================
    else {
      if (refreshToken) {
        await authModel.saveGoogleRefreshToken(user.id, refreshToken);
      }

      const newAvatar = avatarUrl || googleAvatar || user.avatar;
      let newUsername = googleName || user.username;

      if (newAvatar !== user.avatar || newUsername !== user.username) {
        // Check if the new username is already taken by another user
        const existingUserByUsername = await userModel.findUserByUsername(newUsername);
        if (existingUserByUsername && existingUserByUsername.id !== user.id) {
          // If the username is taken, append a random suffix to make it unique
          const randomSuffix = Math.floor(1000 + Math.random() * 9000);
          newUsername = `${newUsername}${randomSuffix}`;
          console.warn(`Google username '${googleName}' already exists. Assigning unique username: '${newUsername}'`);
        }

        // Now, perform the update with the potentially modified username
        await authModel.updateUserProfile( // This call was causing the error
          user.id,
          newUsername,
          newAvatar
        );

        user.username = newUsername;
        user.avatar = newAvatar;
      }

      if (!user.avatar) {
        const fallbackAvatar = `https://api.dicebear.com/10.x/fun-emoji/png?seed=${encodeURIComponent(
          googleName
        )}`;

        await authModel.updateUserAvatar(user.id, fallbackAvatar);
        user.avatar = fallbackAvatar;
      }
    }

    // ==============================
    // CLOUD-SAVE (IMPORTANT FIX)
    // ==============================
    try {
      // SEMPRE garantir folder (não só new user)
      await createFolderForUserId(user.id, 'cloud-save');
    } catch (driveError) {
      console.error(
        'Failed to ensure Google Drive folder:',
        driveError
      );
    }

    // ==============================
    // JWT
    // ==============================
    const token = jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    return {
      status: 200,
      success: true,
      message: 'Autenticação Google realizada com sucesso',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        email_verified: user.email_verified
      }
    };
  } catch (err) {
    console.error('Google auth service error:', err);

    return {
      status: 500,
      success: false,
      message: err.message || 'Erro interno na autenticação Google'
    };
  }
}


// ==============================
// EXPORTS
// ==============================
module.exports = {
  googleAuth,
  exchangeAuthCodeForTokens
};