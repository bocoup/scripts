/**
 * Airtable YouTube video data script
 *
 * Fetch YouTube video metadata and insert it into each row in a given table.
 *
 * This script queries the YouTube Data API for video metadata. It stores the
 * data in a user-specified field. Requests to the YouTube API and to the
 * Airtable base are both batched for efficiency.
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
    // Note: the code in Airtable scripts is visible to all users of the
    // Airtable base. By entering the YouTube Data API key here, all users will
    // have access to that sensitive information.
    youtubeKey: '',
    tableName: '',
    videoFieldName: '',
    destinationFieldName: '',
    statisticName: ''
};

/**
 * Do not edit any code following this message.
 */

const description = `
# Capture YouTube Analytics

For each record in a given table which contains a link to a video on
YouTube.com, fetch some metadata describing the video and store the information
in another field.

- [YouTube Data API
  Overview](https://developers.google.com/youtube/v3/getting-started) - for
  details on configuring a YouTube account and retrieving an API key
- [YouTube Video Resource
  Representation](https://developers.google.com/youtube/v3/docs/videos#resource-representation) -
  for details on the available data, including the valid options for "statistic
  name"
`;

/**
 * The maximum number of videos which can be queried in a single request to the
 * YouTube Data API.
 */
const maxYoutubeResults = 50;
/**
 * The maximum number of records that can be updated in a single invocation of
 * `table.updateRecordsAsync`.
 */
const maxAirtableWrites = 50;

/**
 * Extract the YouTube video identifier from a YouTube video URL
 *
 * @params {string} url
 *
 * @returns {string|null} - a YouTube video ID if one can be found; `null`
 *                          otherwise
 */
function parseId(url) {
    let host, searchParams;

    try {
        ({host, searchParams} = new URL(url));
    } catch (_) {
        return null;
    }

    if (!/(^|\.)youtube\.com$/i.test(host)) {
        return null;
    }

    return searchParams.get('v') || null;
}

/**
 * Get a property value of an object, potentially nested within one or more
 * additional objects.
 *
 * @param {object} object - the value containing properties
 * @param {string} path - one or more property names separated by the period
 *                        character
 *
 * @returns {any} the value of the specified property
 */
function getPath(object, path) {
    let value = object;

    for (let propertyName of path.split('.')) {
        if (!(propertyName in value)) {
            throw new Error(`The property "${propertyName}" is not defined.`);
        }

        value = value[propertyName];
    }

    return value;
}

/**
 * Retrieve YouTube video metadata for one or more videos.
 *
 * @param {string} key - access key for the YouTube Data API
 * @param {object[]} items - one or more objects bearing a property named
 *                           `videoId`
 * @param {string} name - the name of a metadata statistic; statistics nested
 *                        within objects can be accessed using a period
 *                        character to separate property names
 *
 * @returns {Promise<object[]>} a copy of the input `items` array where each
 *                              element has been extended with a property named
 *                              `statistic`
 */
async function fetchVideoData(key, items, name) {
    let [part] = name.split('.', 1);
    let ids = items.map((item) => item.videoId);
    let urlString =
        'https://www.googleapis.com/youtube/v3/videos' +
        `?key=${key}&id=${ids.join(',')}&part=${part}`;
    let response = await fetch(urlString);

    if (!response.ok) {
        throw new Error(await response.text());
    }

    return (await response.json()).items.map((item, index) => ({
        ...items[index],
        statistic: getPath(item, name)
    }));
}

output.markdown(description);

const youtubeKey = hardCoded.youtubeKey || (await input.textAsync('YouTube Data API v3 Key'));
const table = hardCoded.tableName
    ? base.getTable(hardCoded.tableName)
    : await input.tableAsync('Table to query');
const videoField = hardCoded.videoFieldName
    ? table.getField(hardCoded.videoFieldName)
    : await input.fieldAsync('Field containing YouTube video links', table);
const destinationField = hardCoded.destinationFieldName
    ? table.getField(hardCoded.destinationFieldName)
    : await input.fieldAsync('Field in which to store the statistic', table);
const statisticName =
    hardCoded.statisticName ||
    (await input.textAsync('Video statistic (e.g. "snippet.thumbnails.default.url")'));

const query = await table.selectRecordsAsync({fields: [videoField.id]});
const bareItems = query.records
    .map((record) => ({
        record: record,
        videoId: parseId(record.getCellValueAsString(videoField.id))
    }))
    .filter((item) => item.videoId);
const annotatedItems = [];

output.text(`Total number of records: ${query.records.length}`);
output.text(`Number of records with valid URLs: ${bareItems.length}`);

while (bareItems.length) {
    let workingSet = bareItems.splice(0, maxYoutubeResults);

    output.text(`Fetching statistics for ${workingSet.length} videos...`);

    annotatedItems.push(...(await fetchVideoData(youtubeKey, workingSet, statisticName)));
}

while (annotatedItems.length) {
    let workingSet = annotatedItems.splice(0, maxAirtableWrites);

    output.text(`Updating ${workingSet.length} records...`);

    let records = workingSet.map((item) => ({
        id: item.record.id,
        fields: {
            [destinationField.id]:
                // If the destination field is an attachment, assume the
                // statistic is a URL (e.g. a video preview image) and set the
                // value accordingly.
                destinationField.type === 'multipleAttachments'
                    ? [{url: item.statistic}]
                    : item.statistic
        }
    }));

    await table.updateRecordsAsync(records);
}

output.text('Operation complete.');
