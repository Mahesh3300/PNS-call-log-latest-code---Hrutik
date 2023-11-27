require('dotenv').config();
const { ClientSecretCredential } = require("@azure/identity");
const { Client, RetryHandlerOptions } = require("@microsoft/microsoft-graph-client");
const { TokenCredentialAuthenticationProvider } = require("@microsoft/microsoft-graph-client/authProviders/azureTokenCredentials");
const tenantId = process.env.TENANT_ID;
const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
const credential = new ClientSecretCredential(tenantId, clientId, clientSecret, {
    authorityHost: 'https://login.microsoftonline.com',
});

/**
 * @type {Client}
 */
let client = null

const PARSED_SUCCESS = "AAMkADAxNjAyNGY2LTI2OGQtNDJjZC1iYjhiLTAzNzRmZmFjMzE2OQAuAAAAAACrIx7sIuRvRYF220gKEpGwAQD-bfEHf5-xSa6BKLyy8SE2AAAOxwTbAAA="
const PARSED_UNSUCCESS = "AAMkADAxNjAyNGY2LTI2OGQtNDJjZC1iYjhiLTAzNzRmZmFjMzE2OQAuAAAAAACrIx7sIuRvRYF220gKEpGwAQD-bfEHf5-xSa6BKLyy8SE2AAAUVTScAAA="
const userEmail = 'HrutikS@wepsol.com';


const authProvider = new TokenCredentialAuthenticationProvider(credential, { scopes: ['https://graph.microsoft.com/.default'] })
// const authenticationHandler = new AuthenticationHandler(authProvider);
// const retryHandler = new RetryHandler({
//     maxRetries: 3, // Maximum number of retry attempts
//     delay: 1, // Initial delay in seconds
//     shouldRetry: (response) => {
//         // Retry on specific HTTP status codes indicating throttling
//         if (response.status === 429) {
//             const retryAfter = response.headers.get('Retry-After');
//             const delaySeconds = parseInt(retryAfter, 10) || 1;
//             console.log(`Received throttling response. Retrying after ${delaySeconds} seconds.`);
//             return true;
//         }
//         return false;
//     }
// })
// authenticationHandler.setNext(retryHandler)
/**
 * 
 * @returns {Client}
 */

const getClient = () => {
    return Client.initWithMiddleware({
        debugLogging: false,
        authProvider: authProvider,
        // middleware: authenticationHandler
    });
}

const getMailBoxList = async () => {
    try {
        if (!client) client = getClient()
        return await client.api(`/users/${userEmail}/mailFolders`).get()
    } catch (error) {

    }
}

/**
 * Returns an array of Object having Message Id
 * @returns {Array}
 */
const getUnreadMailList = async () => {
    if (!client) client = getClient()
    try {
        const response = await client.api(`/users/${userEmail}/messages/`)
            .select('id').filter('isRead eq false').get();
        return response.value;
    } catch (error) {
        if (error.code === 'InvalidAuthenticationToken') {
            client = null
            return await getUnreadMailList()
        }
        else {
            throw error
        }
    }
}

/**
 * Return Message detial in MIME Version
 * @param {string} id
 * @returns {string}
 */
const getMailDataById = async (id) => {
    if (!client) client = getClient()
    try {
        return await client.api(`/users/${userEmail}/messages/${id}/$value`).get();
    } catch (error) {
        if (error.code === 'InvalidAuthenticationToken') {
            client = null
            return await getMailDataById(id)
        }
        else {
            throw error
        }
    }
}

const UpdateMessageAsRead = async (messageId) => {
    try {
        if (!client) client = getClient()
        return await client.api(`/users/${userEmail}/messages/${messageId}`).middlewareOptions([new RetryHandlerOptions(10, 3)]).update({ isRead: true });
    } catch (error) {
        if (error.code === 'InvalidAuthenticationToken') {
            client = null
            return await UpdateMessageAsRead(messageId)
        }
        else {
            throw error
        }
    }
}

const moveMailToFolder = async (messageId, folder) => {
    if (!client) client = getClient()
    const folderId = folder == "PARSED_SUCCESS" ? PARSED_SUCCESS : PARSED_UNSUCCESS
    try {
        // return await getMailDataById(messageId)
        return await client.api(`/users/${userEmail}/messages/${messageId}/move`).middlewareOptions([new RetryHandlerOptions(10, 3)]).post({ destinationId: folderId });
    } catch (error) {
        if (error.code === 'InvalidAuthenticationToken') {
            client = null
            return await moveMailToFolder(messageId, folder)
        }
        else {
            throw error
        }
    }
}

const markAsReadAndMove = async (messageId, folder) => {
    try {
        const res = await UpdateMessageAsRead(messageId)
        await moveMailToFolder(res.id, folder)
    } catch (error) {
        throw error
    }
}

module.exports = {
    getUnreadMailList,
    getMailDataById,
    markAsReadAndMove,
    getMailBoxList,
    UpdateMessageAsRead
}