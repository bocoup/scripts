/**
 * Twilio send SMS script
 *
 * Send a single SMS to a provided telephone number using the Twilio service
 *
 * The Airtable "Send SMS" Block (available to members with a "Pro" account) is
 * capable of sending many messages in batches based on the contents of the
 * Airtable Base in which it is installed.
 *
 * **Notes on adapting this script.**
 *
 * The script prompts for input every time it is run. For some users, one or
 * more of these values may be the same with every execution. To streamline
 * their workflow, these users may modify this script by defining the constant
 * values in the first few lines. The values should be expressed as JavaScript
 * strings in the object named `hardCoded`.
 */
'use strict';

/**
 * Users may provide values for any of the properties in the following object
 * to streamline the script's startup.
 */
const hardCoded = {
    twilioAccountSid: '',
    twilioSendingNumber: '',
    // Note: the code in Airtable scripts is visible to all users of the
    // Airtable base. By entering the Twilio Auth Token here, all users will
    // have access to that sensitive information.
    twilioAuthToken: ''
};

/**
 * Do not edit any code following this message.
 */
output.markdown(`# Send SMS Via Twilio`);

const twilioAccountSid =
    hardCoded.twilioAccountSid || (await input.textAsync('Twilio Account SID'));
const twilioSendingNumber =
    hardCoded.twilioSendingNumber || (await input.textAsync('Twilio sending telephone number'));
const twilioAuthToken = hardCoded.twilioAuthToken || (await input.textAsync('Twilio Auth Token'));

output.table([
    {property: 'Twilio Account SID', value: twilioAccountSid},
    {property: 'Twilio sending telephone number', value: twilioSendingNumber},
    {property: 'Twilio Auth Token', value: twilioAuthToken.replace(/./g, '*')}
]);

const receivingNumber = await input.textAsync('Receiving telephone number');
const messageBody = await input.textAsync('Message');

output.text('Sending SMS...');

const url = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
const headers = {
    // Format the "Authorization" header according to "HTTP Basic Auth"
    Authorization: `Basic ${  btoa(`${twilioAccountSid}:${twilioAuthToken}`)}`,
    // Twilio expects request data to be formatted as though it were submitted
    // via an HTML form
    'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
};
const body = new URLSearchParams({
    From: twilioSendingNumber,
    To: receivingNumber,
    Body: messageBody
});

let result;

try {
    let response = await fetch(url, {
        method: 'POST',
        headers,
        body
    });

    if (!response.ok) {
        result = `Error sending SMS: "${await response.text()}"`;
    } else {
        result = 'SMS sent successfully.';
    }
} catch (error) {
    result = `Error sending SMS: "${error}"`;
}

output.text(result);
