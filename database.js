require('dotenv').config();
const OracleDB = require("oracledb");
const { Logger } = require('winston');

OracleDB.initOracleClient({ libDir: 'C:\\oracle\\instantclient_21_10' });


let errorCount = 0

const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    connectString: process.env.DB_HOST
};
/**
 * @type {import("oracledb").Connection}
 * @default null
 */
let _connection = null

const establishConnection = async () => await OracleDB.getConnection(dbConfig)

const disconnectConnection = () => {
    if (_connection) {
        _connection.close()
        _connection = null
    }
}


/**
 * 
 * @param {Object} apiData 
 * @param {Logger} logger
 * @returns {import("oracledb").Result.BIND_OUT}
 */
const saveToOralce = async (apiData, logger) => {
    if (errorCount > 10) process.exit(1)
    const bindVars = {
        P_SERIAL_NUMBER: apiData.serialNumber,
        P_TASK_TYPE: apiData.taskType,
        P_TASK_SUMMARY: apiData.taskSummary,
        P_CONTACT_NUMBER: apiData.contactNumber,
        P_CONTACT_EMAIL: apiData.contactEmail,
        P_EMAIL_SUBJECT: apiData.emailSubject,
        P_EMAIL_FROM: apiData.emailFrom,
        P_EMAIL_TO: apiData.emailTo,
        P_EMAIL_CC: apiData.emailCc,
        P_EMAIL_BCC: apiData.emailBcc,
        P_CONTACT_PERSON: apiData.contactPerson,
        P_PROBLEM_CODE: apiData.problemCode,
        P_PFLEET_TONER_LEVEL: apiData.pfleetTonerLevel,
        P_PFLEET_GROUP: apiData.pfleetGroup,
        P_PARSING_FOLDER: { type: OracleDB.STRING, dir: OracleDB.BIND_OUT },
        P_STATUS_CODE: { type: OracleDB.STRING, dir: OracleDB.BIND_OUT },
        P_STATUS_DESC: { type: OracleDB.STRING, dir: OracleDB.BIND_OUT }
    };
    if (!_connection) {
        _connection = await establishConnection()
        _connection.callTimeout = 2 * 60 * 1000
    }
    try {
        const responce_data = await _connection.execute('BEGIN XXWEP_EMAIL_CALL_LOG_REQUEST( :P_SERIAL_NUMBER, :P_TASK_TYPE, :P_TASK_SUMMARY, :P_CONTACT_NUMBER, :P_CONTACT_EMAIL, :P_EMAIL_SUBJECT, :P_EMAIL_FROM, :P_EMAIL_TO, :P_EMAIL_CC, :P_EMAIL_BCC, :P_CONTACT_PERSON, :P_PROBLEM_CODE, :P_PFLEET_TONER_LEVEL, :P_PFLEET_GROUP , :P_PARSING_FOLDER, :P_STATUS_CODE , :P_STATUS_DESC); END;', bindVars);
        disconnectConnection()
        return responce_data.outBinds
    } catch (error) {
        errorCount++;
        if (error?.errorNum == 0) {
            logger.warning("Rolling back....")
            await _connection.rollback()
            logger.info("Rolling back completed")
        }
        else logger.error("Oracle Error -> " + error)
        disconnectConnection()
        throw error
    }
}

module.exports = {
    saveToOralce,
    disconnectConnection,
    establishConnection
}
