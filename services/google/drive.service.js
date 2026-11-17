const { google } = require('googleapis');
const authModel = require('../../models/auth.model');

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI || 'postmessage'
);

async function exchangeAuthCodeForTokens(googleAuthCode) {
  if (!googleAuthCode) {
    throw new Error('googleAuthCode is required to exchange tokens');
  }

  const { tokens } = await oauth2Client.getToken(googleAuthCode);
  if (!tokens || !tokens.access_token) {
    throw new Error('Falha ao receber tokens do Google');
  }

  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiryDate: tokens.expiry_date,
    scope: tokens.scope,
    tokenType: tokens.token_type,
  };
}

async function getAuthClientFromRefreshToken(refreshToken) {
  if (!refreshToken) {
    throw new Error('refreshToken is required to create auth client');
  }

  const authClient = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  authClient.setCredentials({ refresh_token: refreshToken });
  await authClient.getAccessToken();
  return authClient;
}

async function uploadJsonToDrive(refreshToken, jsonData = { example: 'Hello from backend' }, fileName = 'example.json', folderId) {
  const authClient = await getAuthClientFromRefreshToken(refreshToken);
  const drive = google.drive({ version: 'v3', auth: authClient });

  const fileMetadata = {
    name: fileName,
    mimeType: 'application/json',
  };

  if (folderId) {
    fileMetadata.parents = [folderId];
  }

  const media = {
    mimeType: 'application/json',
    body: JSON.stringify(jsonData),
  };

  const response = await drive.files.create({
    requestBody: fileMetadata,
    media,
    fields: 'id, name, mimeType',
  });

  return response.data;
}

async function findDriveFolder(drive, folderName = 'cloud-save', parentFolderId) {
  let query = `mimeType='application/vnd.google-apps.folder' and name='${folderName}' and trashed=false`;
  if (parentFolderId) {
    query += ` and '${parentFolderId}' in parents`;
  }

  const response = await drive.files.list({
    q: query,
    fields: 'files(id, name, parents)',
    spaces: 'drive',
    pageSize: 10,
  });

  return response.data.files && response.data.files.length > 0 ? response.data.files[0] : null;
}

async function createDriveFolder(refreshToken, folderName = 'cloud-save', parentFolderId) {
  const authClient = await getAuthClientFromRefreshToken(refreshToken);
  const drive = google.drive({ version: 'v3', auth: authClient });

  const existingFolder = await findDriveFolder(drive, folderName, parentFolderId);
  if (existingFolder) {
    return existingFolder;
  }

  const fileMetadata = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
  };

  if (parentFolderId) {
    fileMetadata.parents = [parentFolderId];
  }

  const response = await drive.files.create({
    requestBody: fileMetadata,
    fields: 'id, name, mimeType, parents',
  });

  return response.data;
}

async function uploadTestFileForUserId(userId, jsonData = { example: 'Hello from backend' }, fileName = 'drive-test.json', folderId) {
  const user = await authModel.findUserById(userId);
  if (!user || !user.refresh_token) {
    throw new Error('Usuário não encontrado ou sem refresh_token salvo');
  }

  return uploadJsonToDrive(user.refresh_token, jsonData, fileName, folderId);
}

async function createFolderForUserId(userId, folderName = 'cloud-save', parentFolderId) {
  const user = await authModel.findUserById(userId);
  if (!user || !user.refresh_token) {
    throw new Error('Usuário não encontrado ou sem refresh_token salvo');
  }

  return createDriveFolder(user.refresh_token, folderName, parentFolderId);
}

module.exports = {
  exchangeAuthCodeForTokens,
  uploadJsonToDrive,
  uploadTestFileForUserId,
  createDriveFolder,
  createFolderForUserId,
};
