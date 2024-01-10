const { htmlToText } = require('html-to-text');
const { saveToOralce, disconnectConnection } = require("./database");
const { getUnreadMailList, getMailDataById, markAsReadAndMove, UpdateMessageAsRead } = require('./mailHandler');
const simpleParser = require('mailparser').simpleParser;
const { createLogger, format, transports } = require("winston");
const DailyRotateFile = require('winston-daily-rotate-file');
const v8 = require('v8');
const os = require('os');

let isShutdown = false;
const MAX_HEAP_SIZE_PERCENTAGE = 0.8; // Maximum heap size as a percentage of available memory
// Get the total available memory in bytes
const totalMemoryBytes = os.totalmem();
// Calculate the maximum heap size based on the available memory
const MAX_HEAP_SIZE = Math.floor(totalMemoryBytes * MAX_HEAP_SIZE_PERCENTAGE);
const logLevels = {
    fatal: 0,
    error: 1,
    warn: 2,
    info: 3,
    debug: 4,
    trace: 5,
};
const dailyopts = {
    filename: './logs/application-%DATE%.log',
    datePattern: 'DD-MM-YYYY-HH',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '14sd',
    json: true
}
const logger = createLogger({
    levels: logLevels,
    format: format.json(),
    transports: [new transports.Console(), new DailyRotateFile(dailyopts)],
    exceptionHandlers: [new transports.File({ filename: "./logs/exceptions.log" })],
    rejectionHandlers: [new transports.File({ filename: "./logs/rejections.log" })],
});
const sleep = (sec) => {
    return new Promise((resolve, reject) => {
        return setTimeout(resolve, 1000 * sec)
    })
}


const parseData = async (parsedata, apiData) => {
    return new Promise((resolve, reject) => {
        let predata = "";
for (let data of parsedata) {
    data = data.replace(/\s\s+/g, ' ');

    // New parameters
    if (data.startsWith("C_EMAIL") && data.length <= 100) apiData.contactEmail = data.split(" ")[1] || null
    if (data.startsWith("C_NAME") && data.length <= 50) apiData.contactPerson = data.split(" ")[1] || null
    if (data.startsWith("Type") && data.length <= 50) apiData.taskType = data.split(" ")[1] || null
    if (data.startsWith("C_NUMBER") && data.length <= 35) apiData.contactNumber = data.split(" ")[1] || null
    if (data.startsWith("C_EMAIL : ") && data.length <= 100) apiData.contactEmail = data.replace("C_EMAIL : ", "").trim() || null;
    if (data.startsWith(" C_EMAIL : ") && data.length <= 100) apiData.contactEmail = data.replace(" C_EMAIL : ", "").trim() || null;
    if (data.startsWith("C_NUMBER : ") && data.length <= 35) apiData.contactNumber = data.replace("C_NUMBER : ", "").trim() || null;
    if (data.startsWith(" C_NUMBER : ") && data.length <= 35) apiData.contactNumber = data.replace(" C_NUMBER : ", "").trim() || null;
    if (data.startsWith("Contact Name") && data.length <= 50) apiData.contactPerson = data.replace("Contact Name", "").trim() || null;
    if (data.startsWith("Type : ") && data.length <= 50) apiData.taskType = data.replace("Type : ", "").trim() || null;

    // Existing parameters (unchanged)
    if (data.startsWith("Contact Number") && data.length <= 50) apiData.contactNumber = data.replace("Contact Number", "").trim() || null;
    if (data.startsWith("Contact Person") && data.length <= 50) apiData.contactPerson = data.replace("Contact Person", "").trim() || null;
    if (data.startsWith("Contact Name :") && data.length <= 50) apiData.contactPerson = data.replace("Contact Name : ", "").trim() || null;
    if (data.startsWith(" Contact Name :") && data.length <= 50) apiData.contactPerson = data.replace(" Contact Name : ", "").trim() || null;
    if ((data.startsWith("Contact Email") || data.startsWith("Contact EMail")) && data.length <= 50) apiData.contactEmail = data.replace("Contact Email", "").replace("Contact EMail", "").trim() || null;
    if (data.startsWith("Task Type") && data.length <= 50) apiData.taskType = data.replace("Task Type", "").trim() || null;
    if (data.startsWith("Type") && data.length <= 50) apiData.taskType = data.replace("Type", "").trim() || null;
    if (data.startsWith("Type : ") && data.length <= 50) apiData.taskType = data.replace("Type : ", "").trim() || null;
    if (data.startsWith(" Type : Black ") && data.length <= 50) apiData.taskType = data.replace(" Type : Black ", "").trim() || null;
    if (data.startsWith("Type : Black ") && data.length <= 50) apiData.taskType = data.replace("Type : Black ", "").trim() || null;
    if (data.startsWith("Serial Number") && data.length <= 35) apiData.serialNumber = data.replace("Serial Number", "").trim() || null;   
    if (data.startsWith(" Serial Number :") && data.length <= 35) apiData.serialNumber = data.replace(" Serial Number : ", "").trim() || null;   
    if (data.startsWith("Serial Number :") && data.length <= 35) apiData.serialNumber = data.replace("Serial Number : ", "").trim() || null;     
    if (data.startsWith("Group") && data.length <= 50) apiData.pfleetGroup = data.replace("Group", "").trim() || null;
    if (data.startsWith("Group : ") && data.length <= 50) apiData.pfleetGroup = data.replace("Group : ", "").trim() || null;
    if (data.startsWith("Level") && data.length <= 50) apiData.taskSummary = "printfleet:tonerlevel:" + data.split(" ")[1] || null;
    if (data.startsWith(" Level: ") && data.length <= 50) apiData.taskSummary = "printcounter:tonerlevel:" + data.split(" ")[1] || null;
    if (data.startsWith("Level: ") && data.length <= 50) apiData.taskSummary = "printcounter:tonerlevel:" + data.split(" ")[1] || null;
    if (data.startsWith("Problem Summary") && data.length <= 80) apiData.taskSummary = data.replace("Problem Summary", "").trim() || null;
    if (data.startsWith(" Problem Summary") && data.length <= 80) apiData.taskSummary = data.replace(" Problem Summary", "").trim() || null;
    if (data.startsWith("Black") && data.length <= 30) apiData.pfleetTonerLevel = data;
    if (data.startsWith("Cyan") && data.length <= 30) apiData.pfleetTonerLevel += "," + data;
    if (data.startsWith("Magenta") && data.length <= 30) apiData.pfleetTonerLevel += "," + data;
    if (data.startsWith("Yellow") && data.length <= 30) apiData.pfleetTonerLevel += "," + data;

    // Previous data for handling missing values (unchanged)
    if (!apiData.contactPerson && predata.startsWith("Contact Person") && data.length <= 50) apiData.contactPerson = data.trim();
    if (!apiData.contactNumber && predata.startsWith("Contact Number") && data.length <= 30) apiData.contactNumber = data.trim();
    if (!apiData.contactEmail && (predata.startsWith("Contact EMail") || predata.startsWith("Contact Email")) && data.length <= 80) apiData.contactEmail = data.trim();
    if (!apiData.serialNumber && predata.startsWith("Serial Number") && data.length <= 30) apiData.serialNumber = data.trim();
    if (!apiData.taskType && predata.startsWith("Task Type") && data.length <= 50) apiData.taskType = data.trim();
    if (!apiData.taskType && predata.startsWith("Type") && data.length <= 50) apiData.taskType = data.trim(); //India   
    if (!apiData.taskSummary && predata.startsWith("Problem Summary") && data.length <= 80) apiData.taskSummary = data.trim();
    if (!apiData.contactNumber && predata.startsWith("C_NUMBER") && data.length <= 30) apiData.contactNumber = data.trim();//india
    if (!apiData.contactEmail && (predata.startsWith("C_EMAIL") || predata.startsWith("C_EMAIL")) && data.length <= 80) apiData.contactEmail = data.trim();//india
    if (!apiData.contactPerson && predata.startsWith("C_NAME") && data.length <= 50) apiData.contactPerson = data.trim(); //INDIA
   
    predata = data; // Store the current data for reference in the next iteration
}

if (apiData.pfleetTonerLevel != null) {
    const black = apiData.pfleetTonerLevel.split(",")[0].replace("Black", "").replace("%", "").trim()
    if (parseInt(black) != -1 && parseInt(black) <= 30 || (parseInt(black) <= 40 && !apiData.pfleetGroup && apiData.pfleetGroup.includes(""))) apiData.problemCode = "BLACK"
    else if (parseInt(black) != -1) apiData.problemCode = "COLOR"
    if (parseInt(black) != -1) apiData.emailSubject = "PRINT_FLEET_REQUEST"
}


        resolve(apiData)
    })
}
const processMail = async (count) => {
    if (v8.getHeapStatistics().used_heap_size >= MAX_HEAP_SIZE || count > 20) return;
    try {
        logger.info("Connecting to Mail & Getting Message List")
        const messages = await getUnreadMailList()
        logger.info("Unseen messages from inbox - " + messages.length)
        if (!messages.length) count++
        for (const message of messages) {
            const messageRes = await getMailDataById(message.id)
            let mail = await simpleParser(messageRes)
            let apiData = { "serialNumber": "", "taskType": "", "taskSummary": "", "contactNumber": "", "contactEmail": "","emailSubject": "", "emailFrom": "", "emailTo": null, "emailCc": null, "emailBcc": null, "problemCode": null, "pfleetGroup": null, "contactPerson": "", "pfleetTonerLevel": null }
            let text;
            if (mail.text) text = mail.text
            else {
                let html;
                if (mail.textAsHtml) html = mail.textAsHtml
                else html = mail.html
                if (html.toUpperCase().startsWith("<HTML>") || html.toLowerCase().includes("<table")) {
                    html.replace("</td>", "<br/></td>")
                    html.replace("</th>", "<br/></th>")
                    text = htmlToText(html)
                } else { await UpdateMessageAsRead(message.id); continue }
            }
            text = text.trim().replace(/\r/g, "")
            text = text.trim().replace(" +", " ")
            text = text.trim().replace(/\n+/g, "\n")
            let finaldata = text.split(/\n/g)
            if (finaldata.some((ele) => {
                return ele.startsWith("Subject: ")
            })) finaldata.splice(finaldata.findIndex((ele) => { return ele.startsWith("Subject: ") })) // Aviod Reading Trail Mail
            apiData = await parseData(finaldata, apiData)
            if (mail.subject && apiData.emailSubject == "") apiData.emailSubject = mail.subject
            if (mail.from.text) apiData.emailFrom = mail.from.text
            if (mail.to && mail.to.text) apiData.emailTo = mail.to.text
            if (mail.cc) {
                if (mail.cc.text) apiData.emailCc = mail.cc.text
                if (apiData.emailCc && apiData.emailCc.length > 250) {
                    apiData.emailCc = apiData.emailCc.substr(0, 249)
                }
            }
            try {
                logger.info("Send to Oracle -> " + JSON.stringify(apiData))
                const output = await saveToOralce(apiData, logger)
                logger.info("Saved -> " + JSON.stringify(output))
                if (output?.P_PARSING_FOLDER) {
                    await markAsReadAndMove(message.id, output.P_PARSING_FOLDER)
                }
                else {
                    await markAsReadAndMove(message.id, "PARSED_UNSUCCESS")
                }
                logger.info("Moved to " + (output.P_PARSING_FOLDER || "PARSED_UNSUCCESS"))
            } catch (error) {
                logger.error(error)
                continue;
            }
        }
        if (isShutdown) {
            logger.info('Received shutdown signal. Exiting gracefully.');
            process.exit(0); // Exit the application
        }
        await sleep(10)
        return processMail(count)
    } catch (error) {
        logger.error(error)
        return Promise.reject(error)
    }
}
process.on('SIGINT', () => {
    console.log('Received SIGINT. Initiating graceful shutdown.');
    isShutdown = true;
});
logger.info("Started")
processMail(0)
    .then(res => console.log(res || "Completed"))
    .catch()
    .finally(() => {
        disconnectConnection()
    })

