import { google } from 'googleapis';
import ConnectedEmailAccount from '../../models/ConnectedEmailAccount.js';
import { encryptToken, decryptToken } from '../../utils/crypto.js';

export const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile'
];

export class GmailService {
  /**
   * Resolve Google OAuth Client ID dynamically from environment
   */
  getClientId() {
    return process.env.GOOGLE_CLIENT_ID?.trim();
  }

  /**
   * Resolve Google OAuth Client Secret dynamically from environment
   */
  getClientSecret() {
    return process.env.GOOGLE_CLIENT_SECRET?.trim();
  }

  /**
   * Resolve Redirect URI dynamically from environment.
   * Priority:
   * 1. GOOGLE_GMAIL_CALLBACK_URL (explicit callback override for outreach)
   * 2. GOOGLE_GMAIL_REDIRECT_URI (alias)
   * 3. BACKEND_URL or SERVER_URL + /api/outreach/connect/google/callback (e.g. in production)
   * 4. http://localhost:${PORT}/api/outreach/connect/google/callback (development default: 5002)
   */
  getRedirectUri() {
    if (process.env.GOOGLE_GMAIL_CALLBACK_URL?.trim()) {
      return process.env.GOOGLE_GMAIL_CALLBACK_URL.trim();
    }
    if (process.env.GOOGLE_GMAIL_REDIRECT_URI?.trim()) {
      return process.env.GOOGLE_GMAIL_REDIRECT_URI.trim();
    }

    const backendUrl =
      process.env.BACKEND_URL?.trim() ||
      process.env.SERVER_URL?.trim() ||
      process.env.VITE_BACKEND_URL?.trim();

    if (backendUrl) {
      return `${backendUrl.replace(/\/+$/, '')}/api/outreach/connect/google/callback`;
    }

    const port = process.env.PORT || 5002;
    return `http://localhost:${port}/api/outreach/connect/google/callback`;
  }

  /**
   * Get an unauthenticated OAuth2 client instance configured with credentials
   */
  getOAuth2Client() {
    const clientId = this.getClientId();
    const clientSecret = this.getClientSecret();
    const redirectUri = this.getRedirectUri();

    if (!clientId || !clientSecret) {
      const err = new Error(
        'Google OAuth credentials not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in server/.env.'
      );
      err.status = 503;
      err.code = 'OAUTH_UNCONFIGURED';
      throw err;
    }

    return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  }

  /**
   * Generate authorization URL for a user to grant Gmail permissions
   * @param {string} userId - User identifier
   * @param {string} returnTo - Optional frontend relative path to return to after authorization
   */
  generateAuthUrl(userId, returnTo = '/outreach') {
    const oauth2Client = this.getOAuth2Client();

    const statePayload = JSON.stringify({
      userId: String(userId),
      returnTo: String(returnTo || '/outreach')
    });

    return oauth2Client.generateAuthUrl({
      access_type: 'offline', // Critical for receiving refresh_token
      prompt: 'consent', // Forces refresh token issuance
      scope: GMAIL_SCOPES,
      state: statePayload
    });
  }

  /**
   * Handle OAuth redirect callback, exchange code for tokens, and persist connected account
   */
  async handleOAuthCallback(code, userId) {
    if (!code) {
      const err = new Error('Authorization code missing in callback.');
      err.status = 400;
      throw err;
    }

    if (!userId) {
      const err = new Error('User ID missing or unauthorized for OAuth callback.');
      err.status = 401;
      throw err;
    }

    const oauth2Client = this.getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);

    oauth2Client.setCredentials(tokens);

    // Fetch user info from Google
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const userInfoRes = await oauth2.userinfo.get();
    const userProfile = userInfoRes.data;

    const email = (userProfile.email || '').toLowerCase().trim();
    if (!email) {
      const err = new Error('Could not retrieve email address from Google profile.');
      err.status = 400;
      throw err;
    }

    // Encrypt sensitive tokens at rest
    const encryptedAccess = encryptToken(tokens.access_token);
    const encryptedRefresh = tokens.refresh_token ? encryptToken(tokens.refresh_token) : null;
    const tokenExpiry = tokens.expiry_date ? new Date(tokens.expiry_date) : null;

    // Upsert ConnectedEmailAccount
    const updateData = {
      userId,
      email,
      provider: 'gmail',
      accessToken: encryptedAccess,
      tokenExpiry,
      scope: tokens.scope ? tokens.scope.split(' ') : GMAIL_SCOPES,
      status: 'connected',
      lastSyncAt: new Date(),
      metadata: {
        name: userProfile.name || '',
        picture: userProfile.picture || '',
        gmailId: userProfile.id || ''
      }
    };

    // If new refresh_token was received, update it
    if (encryptedRefresh) {
      updateData.refreshToken = encryptedRefresh;
    }

    const account = await ConnectedEmailAccount.findOneAndUpdate(
      { userId, provider: 'gmail' },
      { $set: updateData },
      { returnDocument: 'after', upsert: true, runValidators: true }
    );

    return account.toSafeObject();
  }

  /**
   * Get an authorized OAuth2 client for an authenticated user with auto-refresh support
   */
  async getAuthorizedClient(userId) {
    // Select with accessToken and refreshToken explicitly
    const account = await ConnectedEmailAccount.findOne({
      userId,
      provider: 'gmail'
    }).select('+accessToken +refreshToken');

    if (!account || account.status === 'disconnected') {
      const err = new Error('No Gmail account is connected. Please connect your Gmail account in Email Settings.');
      err.status = 400;
      err.code = 'GMAIL_NOT_CONNECTED';
      throw err;
    }

    if (account.status === 'revoked') {
      const err = new Error('Gmail authorization was revoked. Please reconnect your Gmail account in Email Settings.');
      err.status = 401;
      err.code = 'GMAIL_REVOKED';
      throw err;
    }

    const { accessToken, refreshToken } = account.getDecryptedTokens();

    if (!refreshToken && !accessToken) {
      account.status = 'expired';
      await account.save();
      const err = new Error('Gmail authorization tokens are missing or corrupt. Please reconnect.');
      err.status = 401;
      throw err;
    }

    const oauth2Client = this.getOAuth2Client();
    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
      expiry_date: account.tokenExpiry ? account.tokenExpiry.getTime() : null
    });

    // Check if token expired and refresh if necessary
    const isExpired = account.tokenExpiry && account.tokenExpiry.getTime() <= Date.now() + 60000;
    if (isExpired && refreshToken) {
      try {
        const { credentials } = await oauth2Client.refreshAccessToken();
        account.accessToken = encryptToken(credentials.access_token);
        if (credentials.expiry_date) {
          account.tokenExpiry = new Date(credentials.expiry_date);
        }
        if (credentials.refresh_token) {
          account.refreshToken = encryptToken(credentials.refresh_token);
        }
        account.status = 'connected';
        await account.save();
      } catch (refreshErr) {
        console.error('[GmailService] Token refresh failed:', refreshErr.message);
        account.status = 'expired';
        await account.save();
        const err = new Error('Gmail authorization expired and could not be refreshed. Please reconnect.');
        err.status = 401;
        err.code = 'TOKEN_EXPIRED';
        throw err;
      }
    }

    return { oauth2Client, account };
  }

  /**
   * Construct RFC 2822 email and Base64URL encode for Gmail API
   */
  createRawEmail({
    to,
    from,
    fromName,
    subject,
    htmlBody,
    textBody,
    trackingId,
    trackingBaseUrl,
    inReplyTo,
    references
  }) {
    let finalHtml = htmlBody;

    // Inject 1x1 transparent tracking pixel
    if (trackingId && trackingBaseUrl) {
      const pixelUrl = `${trackingBaseUrl}/api/outreach/track/open/${trackingId}`;
      const trackingPixel = `<img src="${pixelUrl}" width="1" height="1" style="display:none;width:1px;height:1px;border:0;" alt="" />`;
      if (finalHtml.includes('</body>')) {
        finalHtml = finalHtml.replace('</body>', `${trackingPixel}</body>`);
      } else {
        finalHtml += trackingPixel;
      }

      // Rewrite links for click tracking
      finalHtml = finalHtml.replace(/href="(https?:\/\/[^"]+)"/gi, (match, url) => {
        // Skip tracking URLs themselves
        if (url.includes('/api/outreach/track/')) return match;
        const encoded = encodeURIComponent(url);
        const clickUrl = `${trackingBaseUrl}/api/outreach/track/click/${trackingId}?url=${encoded}`;
        return `href="${clickUrl}"`;
      });
    }

    const senderHeader = fromName
      ? `=?utf-8?B?${Buffer.from(fromName).toString('base64')}?= <${from}>`
      : from;

    const subjectHeader = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;

    const headers = [
      `From: ${senderHeader}`,
      `To: ${to}`,
      `Subject: ${subjectHeader}`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=utf-8',
      'Content-Transfer-Encoding: base64'
    ];

    if (inReplyTo) headers.push(`In-Reply-To: ${inReplyTo}`);
    if (references) headers.push(`References: ${references}`);

    const base64Content = Buffer.from(finalHtml, 'utf8').toString('base64');
    const rawEmail = `${headers.join('\r\n')}\r\n\r\n${base64Content}`;

    // Gmail API requires URL-safe Base64
    return Buffer.from(rawEmail, 'utf8')
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  buildRfc2822Email(params) {
    return this.createRawEmail(params);
  }

  /**
   * Send an outreach email via users.messages.send
   */
  async sendEmail({
    userId,
    to,
    subject,
    htmlBody,
    textBody,
    trackingId,
    trackingBaseUrl = BACKEND_URL,
    threadId = null,
    inReplyTo = null,
    references = null
  }) {
    const { oauth2Client, account } = await this.getAuthorizedClient(userId);

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    const senderEmail = account.email;
    const senderName = account.metadata?.name || '';

    const raw = this.createRawEmail({
      to,
      from: senderEmail,
      fromName: senderName,
      subject,
      htmlBody,
      textBody,
      trackingId,
      trackingBaseUrl,
      inReplyTo,
      references
    });

    const requestBody = { raw };
    if (threadId) {
      requestBody.threadId = threadId;
    }

    try {
      const res = await gmail.users.messages.send({
        userId: 'me',
        requestBody
      });

      return {
        success: true,
        messageId: res.data.id,
        threadId: res.data.threadId,
        senderEmail,
        senderName
      };
    } catch (err) {
      console.error('[GmailService] Send error:', err.message);

      // Handle specific Gmail error responses
      if (err.code === 401 || err.message?.includes('invalid_grant')) {
        account.status = 'expired';
        await account.save();
        const customErr = new Error('Gmail authorization has expired or was revoked. Please reconnect in Email Settings.');
        customErr.status = 401;
        throw customErr;
      }

      if (err.code === 429 || err.message?.includes('Rate Limit') || err.message?.includes('Quota exceeded')) {
        const customErr = new Error('Gmail sending quota exceeded. Please try again later.');
        customErr.status = 429;
        throw customErr;
      }

      throw err;
    }
  }

  /**
   * Disconnect user's Gmail account
   */
  async disconnectAccount(userId) {
    const account = await ConnectedEmailAccount.findOne({ userId, provider: 'gmail' });
    if (!account) return { success: true, message: 'No account was connected.' };

    account.status = 'disconnected';
    account.accessToken = null;
    account.refreshToken = null;
    await account.save();

    return {
      success: true,
      message: 'Gmail account disconnected successfully.'
    };
  }

  /**
   * Get user's connected account safe details
   */
  async getAccountStatus(userId) {
    const account = await ConnectedEmailAccount.findOne({ userId, provider: 'gmail' });
    if (!account || account.status === 'disconnected') {
      return {
        connected: false,
        account: null
      };
    }

    return {
      connected: account.status === 'connected',
      account: account.toSafeObject()
    };
  }
}

export const gmailService = new GmailService();
export default gmailService;
