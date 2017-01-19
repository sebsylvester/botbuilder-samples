///<reference path="../../node_modules/typescript/lib/lib.es6.d.ts" />
import * as request from 'request';
import { IAttachment } from 'botbuilder';
const config = require('../../config.json');

// Endpoint for Microsoft's Computer Vision API
// For more info, check out https://www.microsoft.com/cognitive-services/en-us/computer-vision-api
const VISION_API_URL = "https://westus.api.cognitive.microsoft.com/vision/v1.0/analyze?details=Celebrities";
const EMOTION_API_URL = "https://westus.api.cognitive.microsoft.com/emotion/v1.0/recognize";
const API_KEY: string = process.env.MICROSOFT_VISION_API_KEY || config.MICROSOFT_VISION_API_KEY;

interface IResponse {
    categories: ICategory[];
}

interface ICategory {
    name: string; 
    score: number;
    detail?: { 
        celebrities: ICelebrity[]
    }
}

export interface ICelebrity {
    name: string;
    confidence: number;
}

/**
 * Called when the user sends an image attachment.
 * The image is streamed from the host and to the API endpoint.
 * @param {Request} stream The GET request to fetch the image
 * @returns {Promise} The asynchronous operation is unpacked by the caller
 */
export const processImageStream = (stream: any): Promise<any> => {
    return new Promise((resolve, reject) => {
        // Define request options
        const options = {
            url: VISION_API_URL,
            encoding: 'binary',
            headers: { 
                'Ocp-Apim-Subscription-Key': API_KEY,
                'Content-Type': 'application/octet-stream'
            }
        };

        // Make API call and handle error/response
        stream.pipe(request.post(options, (error: Error, response: any, body: any) => {
            if (error) {
                return reject(error);
            }

            // If status == 200, body needs to be parsed as JSON
            body = (typeof body === 'string') ? JSON.parse(body) : body;
            if (response.statusCode != 200) {
                return reject(body);
            }
            return resolve(extractCelebrities(body));
        }));
    });
}

/**
 * Called when the user sends an image link.
 * In this case the link is simply posted to the API endpoint.
 * @param {string} url The URL sent by the user
 * @returns {Promise} The asynchronous operation is unpacked by the caller
 */
export const processImageURL = (url: string): Promise<any> => {
    return new Promise((resolve, reject) => {     
        // Define request options
        const options = {
            url: VISION_API_URL,
            json: { url },
            headers: { 'Ocp-Apim-Subscription-Key': API_KEY }
        };

        // Make API call and handle error/response
        request.post(options, (error: Error, response: any, body: IResponse) => {
            if (error) {
                reject(error);
            }
            else if (response.statusCode != 200) {
                reject(body);
            }
            else {
                resolve(extractCelebrities(body));
            }
        });
    });
}

/**
 * Extracts the caption description from the response of the Vision API
 * @param {Object} body Response of the Vision API
 * @return {string} Description if caption found, null otherwise.
 */
export const extractCelebrities = (body: IResponse): ICelebrity[] => {
    let result = [] as ICelebrity[];

    if (!body || !body.categories) {
        throw new Error('Invalid response body, missing categories property');
    }

    body.categories.forEach((category: ICategory) => {
        if (category.detail && category.detail.celebrities) {
            category.detail.celebrities.forEach(celebrity => {
                const { name, confidence } = celebrity;
                result.push({ name, confidence });
            });
        }
    });

    return result;
}